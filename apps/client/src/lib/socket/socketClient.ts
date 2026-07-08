import { io, type Socket } from "socket.io-client";

const DEFAULT_SERVER_URL = "http://localhost:4000";

export function resolveServerUrl(): string {
  return import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL;
}

export function createSocketConnection(): Socket {
  return io(resolveServerUrl(), {
    autoConnect: false,
    transports: ["websocket"],
  });
}
