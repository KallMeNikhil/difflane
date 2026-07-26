export type MemberRole = "owner" | "editor" | "viewer";

export type ParticipantIdentityType = "user" | "guest";

export interface RoomParticipant {
  connectionId: string;
  userId: string;
  identityType: ParticipantIdentityType;
  displayName: string;
  initials: string;
  role: MemberRole;
  color: string;
}

export interface RoomSnapshot {
  roomId: string;
  roomCode: string;
  participants: RoomParticipant[];
}
