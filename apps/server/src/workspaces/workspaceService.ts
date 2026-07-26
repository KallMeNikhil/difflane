import type { WorkspaceDashboardResponse, WorkspaceOwnershipSummary } from "@difflane/shared-types";
import { identityStore } from "../db/index.js";
import type { WorkspaceMembershipRecord, WorkspaceMemberRole, WorkspaceRecord } from "../db/models.js";
import { AuthError } from "../auth/AuthError.js";

export type Identity = { type: "user"; id: string } | { type: "guest"; id: string };

function toIdentityKey(identity: Identity): { userId: string } | { guestId: string } {
  return identity.type === "user" ? { userId: identity.id } : { guestId: identity.id };
}

function toPublicRole(role: WorkspaceMemberRole): "owner" | "editor" | "viewer" {
  return role.toLowerCase() as "owner" | "editor" | "viewer";
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateWorkspaceCode(): string {
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function createWorkspace(identity: Identity, name: string): Promise<WorkspaceRecord> {
  let code = generateWorkspaceCode();
  while (await identityStore.findWorkspaceByCode(code)) {
    code = generateWorkspaceCode();
  }
  const workspace = await identityStore.createWorkspace(code, name.trim() || code, toIdentityKey(identity));
  await identityStore.upsertMembership(workspace.id, toIdentityKey(identity), "OWNER");
  return workspace;
}

export async function ensureWorkspace(
  identity: Identity,
  code: string,
  fallbackName?: string,
): Promise<{ workspace: WorkspaceRecord; role: WorkspaceMemberRole }> {
  const normalizedCode = code.trim().toUpperCase();
  const existing = await identityStore.findWorkspaceByCode(normalizedCode);
  if (!existing) {
    const workspace = await identityStore.createWorkspace(normalizedCode, fallbackName?.trim() || normalizedCode, toIdentityKey(identity));
    const membership = await identityStore.upsertMembership(workspace.id, toIdentityKey(identity), "OWNER");
    return { workspace, role: membership.role };
  }
  const existingMembership = await identityStore.findMembership(existing.id, toIdentityKey(identity));
  if (existingMembership) {
    return { workspace: existing, role: existingMembership.role };
  }
  const membership = await identityStore.upsertMembership(existing.id, toIdentityKey(identity), "EDITOR");
  return { workspace: existing, role: membership.role };
}

export async function getWorkspaceByCode(code: string): Promise<WorkspaceRecord | null> {
  return identityStore.findWorkspaceByCode(code.trim().toUpperCase());
}

async function toSummary(workspace: WorkspaceRecord, membership: WorkspaceMembershipRecord): Promise<WorkspaceOwnershipSummary> {
  const members = await identityStore.listMembershipsForWorkspace(workspace.id);
  return {
    workspaceCode: workspace.code,
    name: workspace.name,
    role: toPublicRole(membership.role),
    isOwner: membership.role === "OWNER",
    pinned: membership.pinned,
    archived: membership.archived,
    createdAt: workspace.createdAt.toISOString(),
    memberCount: members.length,
  };
}

export async function getDashboard(identity: Identity): Promise<WorkspaceDashboardResponse> {
  const memberships = await identityStore.listMembershipsForIdentity(toIdentityKey(identity));

  const entries: { workspace: WorkspaceRecord; membership: WorkspaceMembershipRecord }[] = [];
  for (const membership of memberships) {
    const workspace = await identityStore.findWorkspaceById(membership.workspaceId);
    if (workspace) {
      entries.push({ workspace, membership });
    }
  }

  const summaries = await Promise.all(entries.map((entry) => toSummary(entry.workspace, entry.membership)));

  const created = summaries.filter((summary) => summary.isOwner);
  const joined = summaries.filter((summary) => !summary.isOwner && !summary.archived);
  const recent = [...summaries]
    .filter((summary) => !summary.archived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const pinned = summaries.filter((summary) => summary.pinned && !summary.archived);
  const archived = summaries.filter((summary) => summary.archived);

  return { created, joined, recent, pinned, archived };
}

export async function requireMembership(identity: Identity, workspaceId: string): Promise<WorkspaceMembershipRecord> {
  const membership = await identityStore.findMembership(workspaceId, toIdentityKey(identity));
  if (!membership) {
    throw new AuthError("unknown_error", "You are not a member of this workspace.", 403);
  }
  return membership;
}

export async function transferOwnership(identity: Identity, code: string, target: Identity): Promise<void> {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  const requesterMembership = await requireMembership(identity, workspace.id);
  if (requesterMembership.role !== "OWNER") {
    throw new AuthError("unknown_error", "Only the workspace owner can transfer ownership.", 403);
  }
  const targetMembership = await identityStore.findMembership(workspace.id, toIdentityKey(target));
  if (!targetMembership) {
    throw new AuthError("unknown_error", "Target member is not part of this workspace.", 404);
  }

  await identityStore.updateMembershipRole(requesterMembership.id, "EDITOR");
  await identityStore.updateMembershipRole(targetMembership.id, "OWNER");
  await identityStore.updateWorkspaceOwner(workspace.id, toIdentityKey(target));
}

export async function updateMemberRole(identity: Identity, code: string, target: Identity, role: "editor" | "viewer"): Promise<void> {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  const requesterMembership = await requireMembership(identity, workspace.id);
  if (requesterMembership.role !== "OWNER") {
    throw new AuthError("unknown_error", "Only the workspace owner can change member roles.", 403);
  }
  const targetMembership = await identityStore.findMembership(workspace.id, toIdentityKey(target));
  if (!targetMembership) {
    throw new AuthError("unknown_error", "Target member is not part of this workspace.", 404);
  }
  if (targetMembership.role === "OWNER") {
    throw new AuthError("unknown_error", "Transfer ownership to change the owner's role.", 400);
  }
  await identityStore.updateMembershipRole(targetMembership.id, role.toUpperCase() as WorkspaceMemberRole);
}

export async function deleteWorkspace(identity: Identity, code: string): Promise<void> {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  const membership = await requireMembership(identity, workspace.id);
  if (membership.role !== "OWNER") {
    throw new AuthError("unknown_error", "Only the workspace owner can delete this workspace.", 403);
  }
  await identityStore.deleteWorkspace(workspace.id);
}

export async function setWorkspaceFlag(identity: Identity, code: string, patch: { pinned?: boolean; archived?: boolean }): Promise<void> {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  const membership = await requireMembership(identity, workspace.id);
  await identityStore.setMembershipFlags(membership.id, patch);
}
