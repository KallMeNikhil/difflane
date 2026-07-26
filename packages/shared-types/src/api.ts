import type { MemberRole } from "./room.js";

export type OAuthProvider = "google" | "github";

export interface AuthUserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  initials: string;
  createdAt: string;
  linkedProviders: OAuthProvider[];
  primaryProvider: OAuthProvider | "password";
}

export interface GuestIdentityProfile {
  id: string;
  displayName: string;
  initials: string;
}

export type SessionIdentity =
  | { kind: "authenticated"; user: AuthUserProfile }
  | { kind: "guest"; guest: GuestIdentityProfile };

export interface AuthSessionResponse {
  identity: SessionIdentity;
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GuestBootstrapResponse {
  identity: Extract<SessionIdentity, { kind: "guest" }>;
}

export interface UpgradeGuestRequest {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  username?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AuthErrorPayload {
  code:
    | "invalid_credentials"
    | "account_exists"
    | "username_taken"
    | "email_taken"
    | "weak_password"
    | "invalid_token"
    | "expired_token"
    | "network_error"
    | "provider_unavailable"
    | "provider_error"
    | "rate_limited"
    | "unknown_error";
  message: string;
}

export interface WorkspaceMembershipSummary {
  identityId: string;
  identityType: "user" | "guest";
  displayName: string;
  initials: string;
  role: MemberRole;
}

export interface WorkspaceOwnershipSummary {
  workspaceCode: string;
  name: string;
  role: MemberRole;
  isOwner: boolean;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  memberCount: number;
}

export interface WorkspaceDashboardResponse {
  created: WorkspaceOwnershipSummary[];
  joined: WorkspaceOwnershipSummary[];
  recent: WorkspaceOwnershipSummary[];
  pinned: WorkspaceOwnershipSummary[];
  archived: WorkspaceOwnershipSummary[];
}

export interface TransferOwnershipRequest {
  targetIdentityId: string;
  targetIdentityType: "user" | "guest";
}

export interface UpdateMemberRoleRequest {
  targetIdentityId: string;
  targetIdentityType: "user" | "guest";
  role: Exclude<MemberRole, "owner">;
}
