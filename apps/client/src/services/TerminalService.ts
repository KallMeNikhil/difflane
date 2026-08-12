import type { Socket } from "socket.io-client";
import {
  TERMINAL_SOCKET_EVENTS,
  type TerminalCreatePayload,
  type TerminalDataPayload,
  type TerminalErrorPayload,
  type TerminalExitPayload,
  type TerminalReadyPayload,
} from "@difflane/shared-types";
import { connectSocket } from "./SocketService";

export function connectTerminalSocket(): Socket {
  return connectSocket();
}

export function createTerminalSession(socket: Socket, payload: TerminalCreatePayload): void {
  socket.emit(TERMINAL_SOCKET_EVENTS.CREATE, payload);
}

export function sendTerminalInput(socket: Socket, sessionId: string, data: string): void {
  const payload: TerminalDataPayload = { sessionId, data };
  socket.emit(TERMINAL_SOCKET_EVENTS.INPUT, payload);
}

export function closeTerminalSession(socket: Socket, sessionId: string): void {
  socket.emit(TERMINAL_SOCKET_EVENTS.CLOSE, { sessionId });
}

export function onTerminalReady(socket: Socket, listener: (payload: TerminalReadyPayload) => void): () => void {
  socket.on(TERMINAL_SOCKET_EVENTS.READY, listener);
  return () => socket.off(TERMINAL_SOCKET_EVENTS.READY, listener);
}

export function onTerminalData(socket: Socket, listener: (payload: TerminalDataPayload) => void): () => void {
  socket.on(TERMINAL_SOCKET_EVENTS.DATA, listener);
  return () => socket.off(TERMINAL_SOCKET_EVENTS.DATA, listener);
}

export function onTerminalExit(socket: Socket, listener: (payload: TerminalExitPayload) => void): () => void {
  socket.on(TERMINAL_SOCKET_EVENTS.EXIT, listener);
  return () => socket.off(TERMINAL_SOCKET_EVENTS.EXIT, listener);
}

export function onTerminalError(socket: Socket, listener: (payload: TerminalErrorPayload) => void): () => void {
  socket.on(TERMINAL_SOCKET_EVENTS.ERROR, listener);
  return () => socket.off(TERMINAL_SOCKET_EVENTS.ERROR, listener);
}

export function disconnectTerminalSocket(socket: Socket): void {
  socket.disconnect();
}
