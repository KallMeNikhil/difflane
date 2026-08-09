import { io, type Socket } from "socket.io-client";

const DEV_FALLBACK_SERVER_URL = "http://localhost:4000";

export function resolveServerUrl(): string | undefined {
  const configured = import.meta.env.VITE_SERVER_URL?.trim();
  if (configured) {
    return configured;
  }
  if (import.meta.env.DEV) {
    return DEV_FALLBACK_SERVER_URL;
  }
  return undefined;
}

export function createSocketConnection(): Socket {
  const serverUrl = resolveServerUrl();

  if (!serverUrl && import.meta.env.PROD) {
    console.warn(
      "[difflane] VITE_SERVER_URL is not configured. Set it in your Vercel project's " +
        "Environment Variables to the deployed backend URL once it is available.",
    );
  }

  return io(serverUrl ?? "", {
    autoConnect: false,
    transports: ["websocket"],
    timeout: 10_000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
  });
}
