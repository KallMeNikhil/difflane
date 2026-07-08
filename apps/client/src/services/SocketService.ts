import type { Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type RoomJoinPayload,
  type RoomJoinedPayload,
  type RoomParticipant,
  type RoomParticipantLeftPayload,
} from "@difflane/shared-types";
import { createSocketConnection } from "../lib/socket/socketClient";

export function connectSocket(): Socket {
  const socket = createSocketConnection();
  socket.connect();
  return socket;
}

export function joinRoom(socket: Socket, payload: RoomJoinPayload): Promise<RoomJoinedPayload> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      socket.once("connect", () => socket.emit(SOCKET_EVENTS.ROOM_JOIN, payload, resolve));
      socket.once("connect_error", reject);
      return;
    }
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, payload, resolve);
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

export function onConnectionStatusChange(socket: Socket, listener: (connected: boolean) => void): () => void {
  const handleConnect = () => listener(true);
  const handleDisconnect = () => listener(false);
  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  return () => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
  };
}
