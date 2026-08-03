export type OAuthProviderType = "google" | "github";
export type WorkspaceMemberRole = "OWNER" | "EDITOR" | "VIEWER";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthAccountRecord {
  id: string;
  provider: OAuthProviderType;
  providerAccountId: string;
  userId: string;
  createdAt: Date;
}

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByHash: string | null;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface OAuthStateRecord {
  id: string;
  state: string;
  provider: OAuthProviderType;
  guestId: string | null;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface GuestSessionRecord {
  id: string;
  displayName: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface WorkspaceRecord {
  id: string;
  code: string;
  name: string;
  ownerUserId: string | null;
  ownerGuestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMembershipRecord {
  id: string;
  workspaceId: string;
  userId: string | null;
  guestId: string | null;
  role: WorkspaceMemberRole;
  pinned: boolean;
  archived: boolean;
  joinedAt: Date;
}

export type SnapshotTrigger = "manual" | "before_import" | "before_restore" | "before_destructive";

export interface WorkspaceStateRecord {
  workspaceId: string;
  stateBytes: Uint8Array;
  fileCount: number;
  folderCount: number;
  updatedAt: Date;
}

export interface WorkspaceSnapshotRecord {
  id: string;
  workspaceId: string;
  label: string;
  trigger: SnapshotTrigger;
  stateBytes: Uint8Array;
  fileCount: number;
  folderCount: number;
  createdByUserId: string | null;
  createdByGuestId: string | null;
  createdAt: Date;
}

export type SessionRecordStatus = "active" | "completed";

export interface SessionParticipantEntry {
  userId: string;
  identityType: "user" | "guest";
  displayName: string;
  initials: string;
  role: string;
}

export interface SessionTimelineEntry {
  id: string;
  actorName: string;
  description: string;
  occurredAt: string;
}

export interface SessionHistoryRecord {
  id: string;
  workspaceId: string;
  roomCode: string;
  status: SessionRecordStatus;
  fileCount: number;
  folderCount: number;
  participants: SessionParticipantEntry[];
  timeline: SessionTimelineEntry[];
  startedAt: Date;
  endedAt: Date | null;
  lastActivityAt: Date;
}
