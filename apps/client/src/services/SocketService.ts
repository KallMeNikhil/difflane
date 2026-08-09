import type { Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type RoomJoinErrorPayload,
  type RoomJoinPayload,
  type RoomJoinedPayload,
  type RoomParticipant,
  type RoomParticipantLeftPayload,
} from "@difflane/shared-types";
import { createSocketConnection } from "../lib/socket/socketClient";

const JOIN_TIMEOUT_MS = 15000;

export class RoomJoinError extends Error {
  readonly code?: RoomJoinErrorPayload["code"];

  constructor(message: string, code?: RoomJoinErrorPayload["code"]) {
    super(message);
    this.code = code;
  }
}

export function connectSocket(): Socket {
  const socket = createSocketConnection();
  socket.connect();
  return socket;
}

export function joinRoom(socket: Socket, payload: RoomJoinPayload): Promise<RoomJoinedPayload> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      socket.off("connect_error", handleConnectError);
      reject(new Error("Joining this workspace took too long. Please try again."));
    }, JOIN_TIMEOUT_MS);

    function handleAck(response: RoomJoinedPayload | RoomJoinErrorPayload) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      socket.off("connect_error", handleConnectError);
      if ("error" in response) {
        reject(new RoomJoinError(response.error, response.code));
        return;
      }
      resolve(response);
    }

    function handleConnectError() {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      reject(new Error("Unable to reach the Difflane server. Please try again in a moment."));
    }

    if (!socket.connected) {
      socket.once("connect", () => socket.emit(SOCKET_EVENTS.ROOM_JOIN, payload, handleAck));
      socket.once("connect_error", handleConnectError);
      return;
    }
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, payload, handleAck);
  });
}

export function leaveRoom(socket: Socket): void {
  socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
}

export function disconnectSocket(socket: Socket): void {
  socket.disconnect();
}

export function onParticipantJoined(socket: Socket, listener: (participant: RoomParticipant) => void): () => void {
  const handler = (payload: { participant: RoomParticipant }) => listener(payload.participant);
  socket.on(SOCKET_EVENTS.ROOM_PARTICIPANT_JOINED, handler);
  return () => socket.off(SOCKET_EVENTS.ROOM_PARTICIPANT_JOINED, handler);
}

export function onParticipantLeft(socket: Socket, listener: (payload: RoomParticipantLeftPayload) => void): () => void {
  socket.on(SOCKET_EVENTS.ROOM_PARTICIPANT_LEFT, listener);
  return () => socket.off(SOCKET_EVENTS.ROOM_PARTICIPANT_LEFT, listener);
}
