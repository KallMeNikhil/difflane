import type {
  GuestSessionRecord,
  OAuthAccountRecord,
  OAuthProviderType,
  PasswordResetTokenRecord,
  RefreshSessionRecord,
  UserRecord,
  WorkspaceMembershipRecord,
  WorkspaceRecord,
} from "./models.js";

export interface CreateUserInput {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string | null;
}

export interface IdentityStore {
  createUser(input: CreateUserInput): Promise<UserRecord>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  updateUser(id: string, patch: Partial<Pick<UserRecord, "displayName" | "username" | "passwordHash">>): Promise<UserRecord>;
  deleteUser(id: string): Promise<void>;

  linkOAuthAccount(userId: string, provider: OAuthProviderType, providerAccountId: string): Promise<OAuthAccountRecord>;
  findOAuthAccount(provider: OAuthProviderType, providerAccountId: string): Promise<OAuthAccountRecord | null>;
  listOAuthAccounts(userId: string): Promise<OAuthAccountRecord[]>;
  unlinkOAuthAccount(userId: string, provider: OAuthProviderType): Promise<void>;

  createRefreshSession(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshSessionRecord>;
  findRefreshSessionByHash(tokenHash: string): Promise<RefreshSessionRecord | null>;
  revokeRefreshSessionsForUser(userId: string): Promise<void>;
  revokeRefreshSession(id: string): Promise<void>;
  replaceRefreshSession(sessionId: string, newTokenHash: string, newExpiresAt: Date): Promise<RefreshSessionRecord>;

  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetTokenRecord>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markPasswordResetTokenUsed(id: string): Promise<void>;

  createGuestSession(displayName: string): Promise<GuestSessionRecord>;
  findGuestSession(id: string): Promise<GuestSessionRecord | null>;
  touchGuestSession(id: string): Promise<void>;
  deleteGuestSession(id: string): Promise<void>;

  createWorkspace(code: string, name: string, owner: { userId: string } | { guestId: string }): Promise<WorkspaceRecord>;
  findWorkspaceByCode(code: string): Promise<WorkspaceRecord | null>;
  findWorkspaceById(id: string): Promise<WorkspaceRecord | null>;
  updateWorkspaceOwner(workspaceId: string, owner: { userId: string } | { guestId: string }): Promise<WorkspaceRecord>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  reassignWorkspaceMembershipsOnGuestUpgrade(guestId: string, userId: string): Promise<void>;

  upsertMembership(
    workspaceId: string,
    identity: { userId: string } | { guestId: string },
    role: WorkspaceMembershipRecord["role"],
  ): Promise<WorkspaceMembershipRecord>;
  findMembership(workspaceId: string, identity: { userId: string } | { guestId: string }): Promise<WorkspaceMembershipRecord | null>;
  listMembershipsForWorkspace(workspaceId: string): Promise<WorkspaceMembershipRecord[]>;
  listMembershipsForIdentity(identity: { userId: string } | { guestId: string }): Promise<WorkspaceMembershipRecord[]>;
  updateMembershipRole(membershipId: string, role: WorkspaceMembershipRecord["role"]): Promise<WorkspaceMembershipRecord>;
  setMembershipFlags(membershipId: string, patch: Partial<Pick<WorkspaceMembershipRecord, "pinned" | "archived">>): Promise<WorkspaceMembershipRecord>;
}
