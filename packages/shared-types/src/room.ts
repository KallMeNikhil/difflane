export type MemberRole = "owner" | "editor" | "reviewer" | "viewer";

export interface RoomParticipant {
  connectionId: string;
  userId: string;
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
