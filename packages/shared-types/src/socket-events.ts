import type { RoomParticipant, RoomSnapshot } from "./room.js";

export const SOCKET_EVENTS = {
  ROOM_JOIN: "room:join",
  ROOM_JOINED: "room:joined",
  ROOM_LEAVE: "room:leave",
  ROOM_ERROR: "room:error",
  ROOM_PARTICIPANT_JOINED: "room:participant-joined",
  ROOM_PARTICIPANT_LEFT: "room:participant-left",
  DOC_UPDATE: "doc:update",
  AWARENESS_UPDATE: "awareness:update",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface RoomJoinPayload {
  roomCode: string;
  displayName: string;
  initials: string;
}

export interface RoomJoinedPayload {
  room: RoomSnapshot;
  selfConnectionId: string;
  docUpdate: Uint8Array;
  awarenessUpdate: Uint8Array | null;
}

export interface RoomParticipantJoinedPayload {
  participant: RoomParticipant;
}

export interface RoomParticipantLeftPayload {
  connectionId: string;
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
