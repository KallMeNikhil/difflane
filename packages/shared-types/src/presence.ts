import type { MemberRole, ParticipantIdentityType } from "./room.js";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface AwarenessState {
  userId: string;
  identityType: ParticipantIdentityType;
  displayName: string;
  initials: string;
  color: string;
  role: MemberRole;
  activeFileId: string | null;
}
