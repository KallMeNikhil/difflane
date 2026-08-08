import type { MemberRole, RoomParticipant, RoomSnapshot } from "./room.js";

export const SOCKET_EVENTS = {
  ROOM_JOIN: "room:join",
  ROOM_JOINED: "room:joined",
  ROOM_LEAVE: "room:leave",
  ROOM_ERROR: "room:error",
  ROOM_PARTICIPANT_JOINED: "room:participant-joined",
  ROOM_PARTICIPANT_LEFT: "room:participant-left",
  ROOM_ROLE_CHANGED: "room:role-changed",
  ROOM_MEMBER_REMOVED: "room:member-removed",
  DOC_UPDATE: "doc:update",
  AWARENESS_UPDATE: "awareness:update",
  WORKSPACE_PERSISTED: "workspace:persisted",
  WORKSPACE_PERSISTENCE_FAILED: "workspace:persistence-failed",
  WORKSPACE_RESTORED: "workspace:restored",
  ATTENTION_REQUEST: "attention:request",
  ATTENTION_RECEIVED: "attention:received",
  ATTENTION_ERROR: "attention:error",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface RoomJoinPayload {
  roomCode: string;
  displayName: string;
  initials: string;
  accessToken?: string;
  guestId?: string;
}

export interface RoomJoinedPayload {
  room: RoomSnapshot;
  selfConnectionId: string;
  docUpdate: Uint8Array;
  awarenessUpdate: Uint8Array | null;
}

export interface RoomJoinErrorPayload {
  error: string;
  code?: "expired_token" | "guest_required";
}

export interface RoomParticipantJoinedPayload {
  participant: RoomParticipant;
}

export interface RoomParticipantLeftPayload {
  connectionId: string;
}

export interface RoomRoleChangedPayload {
  roomId: string;
  connectionId: string;
  role: MemberRole;
}

export interface RoomMemberRemovedPayload {
  roomId: string;
  connectionId: string;
  reason: "removed" | "left";
}

export interface RoomErrorPayload {
  message: string;
}

export interface DocUpdatePayload {
  roomId: string;
  update: Uint8Array;
}

export interface AwarenessUpdatePayload {
  roomId: string;
  update: Uint8Array;
}

export interface WorkspacePersistedPayload {
  roomId: string;
  persistedAt: string;
}

export interface WorkspacePersistenceFailedPayload {
  roomId: string;
  message: string;
  willRetry: boolean;
}

export interface WorkspaceRestoredPayload {
  roomId: string;
}

export interface AttentionRequestPayload {
  roomId: string;
  targetConnectionId: string;
  fileId: string | null;
  fileLabel: string | null;
}

export interface AttentionReceivedPayload {
  fromConnectionId: string;
  fromUserId: string;
  fromDisplayName: string;
  fromInitials: string;
  fileId: string | null;
  fileLabel: string | null;
  receivedAt: string;
}

export interface AttentionErrorPayload {
  message: string;
}
