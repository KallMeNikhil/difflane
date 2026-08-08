import type { SessionHistoryEntry, WorkspaceDashboardResponse, WorkspaceOwnershipSummary } from "@difflane/shared-types";
import { identityStore, workspaceStore } from "../db/index.js";
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
const WORKSPACE_CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{5}$`);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSIGNABLE_ROLES: WorkspaceMemberRole[] = ["EDITOR", "VIEWER"];
const MUTATING_ROLES: WorkspaceMemberRole[] = ["OWNER", "EDITOR"];

export function isValidWorkspaceCode(code: string): boolean {
  return WORKSPACE_CODE_PATTERN.test(code.trim().toUpperCase());
}

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isValidIdentityType(value: string): value is "user" | "guest" {
  return value === "user" || value === "guest";
}

export function isAssignableRole(value: string): value is "editor" | "viewer" {
  return value === "editor" || value === "viewer";
}

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

function toSummary(workspace: WorkspaceRecord, membership: WorkspaceMembershipRecord, memberCount: number): WorkspaceOwnershipSummary {
  return {
    workspaceCode: workspace.code,
    name: workspace.name,
    role: toPublicRole(membership.role),
    isOwner: membership.role === "OWNER",
    pinned: membership.pinned,
    archived: membership.archived,
    createdAt: workspace.createdAt.toISOString(),
    memberCount,
  };
}

export async function getDashboard(identity: Identity): Promise<WorkspaceDashboardResponse> {
  const memberships = await identityStore.listMembershipsForIdentity(toIdentityKey(identity));
  const workspaceIds = memberships.map((membership) => membership.workspaceId);

  const [workspaces, memberCounts] = await Promise.all([
    identityStore.findWorkspacesByIds(workspaceIds),
    identityStore.countMembershipsForWorkspaces(workspaceIds),
  ]);
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  const entries: { workspace: WorkspaceRecord; membership: WorkspaceMembershipRecord }[] = [];
  for (const membership of memberships) {
    const workspace = workspaceById.get(membership.workspaceId);
    if (workspace) {
      entries.push({ workspace, membership });
    }
  }

  const summaries = entries.map((entry) => toSummary(entry.workspace, entry.membership, memberCounts[entry.workspace.id] ?? 0));

  const all = summaries.filter((summary) => !summary.archived);
  const created = summaries.filter((summary) => summary.isOwner && !summary.archived);
  const joined = summaries.filter((summary) => !summary.isOwner && !summary.archived);
  const recent = [...all]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const pinned = summaries.filter((summary) => summary.pinned && !summary.archived);
  const archived = summaries.filter((summary) => summary.archived);

  return { created, joined, recent, pinned, archived, all };
}

export async function getSessionHistory(identity: Identity): Promise<SessionHistoryEntry[]> {
  const memberships = await identityStore.listMembershipsForIdentity(toIdentityKey(identity));
  const workspaceIds = memberships.map((membership) => membership.workspaceId);
  const workspaces = await identityStore.findWorkspacesByIds(workspaceIds);
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  const records = await workspaceStore.listSessionsForWorkspaceIds(workspaceIds);

  return records.map((record) => {
    const workspace = workspaceById.get(record.workspaceId);
    return {
      id: record.id,
      workspaceCode: workspace?.code ?? "",
      workspaceName: workspace?.name ?? "Workspace",
      roomCode: record.roomCode,
      status: record.status,
      fileCount: record.fileCount,
      folderCount: record.folderCount,
      participants: record.participants,
      timeline: record.timeline.map((event) => ({
        id: event.id,
        actorName: event.actorName,
        description: event.description,
        occurredAt: event.occurredAt,
      })),
      startedAt: record.startedAt.toISOString(),
      endedAt: record.endedAt ? record.endedAt.toISOString() : null,
      lastActivityAt: record.lastActivityAt.toISOString(),
    };
  });
}

export async function requireMembership(identity: Identity, workspaceId: string): Promise<WorkspaceMembershipRecord> {
  const membership = await identityStore.findMembership(workspaceId, toIdentityKey(identity));
  if (!membership) {
    throw new AuthError("unknown_error", "You are not a member of this workspace.", 403);
  }
  return membership;
}

export async function requireRole(
  identity: Identity,
  workspaceId: string,
  allowedRoles: WorkspaceMemberRole[],
): Promise<WorkspaceMembershipRecord> {
  const membership = await requireMembership(identity, workspaceId);
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthError("unknown_error", "You do not have permission to perform this action.", 403);
  }
  return membership;
}

export { MUTATING_ROLES };

export async function transferOwnership(
  identity: Identity,
  code: string,
  target: Identity,
): Promise<{ workspaceId: string; previousOwner: Identity; newOwner: Identity }> {
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

  await identityStore.transferWorkspaceOwnership(workspace.id, requesterMembership.id, targetMembership.id, toIdentityKey(target));
  return { workspaceId: workspace.id, previousOwner: identity, newOwner: target };
}

export async function updateMemberRole(
  identity: Identity,
  code: string,
  target: Identity,
  role: "editor" | "viewer",
): Promise<{ workspaceId: string; targetUserId: string; targetIdentityType: "user" | "guest" }> {
  if (!isAssignableRole(role)) {
    throw new AuthError("unknown_error", "Role must be either 'editor' or 'viewer'.", 400);
  }
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
  const nextRole = role.toUpperCase() as WorkspaceMemberRole;
  if (!ASSIGNABLE_ROLES.includes(nextRole)) {
    throw new AuthError("unknown_error", "Role must be either 'editor' or 'viewer'.", 400);
  }
  await identityStore.updateMembershipRole(targetMembership.id, nextRole);
  return { workspaceId: workspace.id, targetUserId: target.id, targetIdentityType: target.type };
}

export async function leaveWorkspace(identity: Identity, code: string): Promise<{ workspaceId: string }> {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  const membership = await requireMembership(identity, workspace.id);
  if (membership.role === "OWNER") {
    throw new AuthError(
      "unknown_error",
      "Transfer ownership to another member before leaving this workspace.",
      409,
    );
  }
  await identityStore.deleteMembership(membership.id);
  return { workspaceId: workspace.id };
}

export async function removeMember(
  identity: Identity,
  code: string,
  target: Identity,
): Promise<{ workspaceId: string }> {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  const requesterMembership = await requireMembership(identity, workspace.id);
  if (requesterMembership.role !== "OWNER") {
    throw new AuthError("unknown_error", "Only the workspace owner can remove members.", 403);
  }
  if (identity.type === target.type && identity.id === target.id) {
    throw new AuthError("unknown_error", "Use Leave Workspace to remove yourself.", 400);
  }
  const targetMembership = await identityStore.findMembership(workspace.id, toIdentityKey(target));
  if (!targetMembership) {
    throw new AuthError("unknown_error", "Target member is not part of this workspace.", 404);
  }
  if (targetMembership.role === "OWNER") {
    throw new AuthError("unknown_error", "Transfer ownership before removing the current owner.", 400);
  }
  await identityStore.deleteMembership(targetMembership.id);
  return { workspaceId: workspace.id };
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
