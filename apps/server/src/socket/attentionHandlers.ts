import type { Server, Socket } from "socket.io";
import { SOCKET_EVENTS, type AttentionReceivedPayload, type AttentionRequestPayload } from "@difflane/shared-types";
import type { RoomRegistry } from "../rooms/RoomRegistry.js";
import { env } from "../config/env.js";

interface RateState {
  count: number;
  windowStart: number;
}

const attentionRequestRate = new Map<string, RateState>();

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const state = attentionRequestRate.get(socketId);
  if (!state || now - state.windowStart > env.socketRateLimit.windowMs) {
    attentionRequestRate.set(socketId, { count: 1, windowStart: now });
    return false;
  }
  state.count += 1;
  return state.count > env.socketRateLimit.attentionRequestMax;
}

const FILE_LABEL_MAX_LENGTH = 120;

export function registerAttentionHandlers(io: Server, socket: Socket, registry: RoomRegistry): void {
  socket.on(SOCKET_EVENTS.ATTENTION_REQUEST, (payload: AttentionRequestPayload) => {
    const roomId = socket.data.roomId;
    if (!roomId || roomId !== payload.roomId) {
      return;
    }
    if (isRateLimited(socket.id)) {
      socket.emit(SOCKET_EVENTS.ATTENTION_ERROR, { message: "You're pinging too frequently. Please wait a moment." });
      return;
    }
    const requester = registry.getParticipant(roomId, socket.id);
    const target = registry.getParticipant(roomId, payload.targetConnectionId);
    if (!requester || !target || typeof payload.targetConnectionId !== "string") {
      return;
    }

    const received: AttentionReceivedPayload = {
      fromConnectionId: socket.id,
      fromUserId: requester.userId,
      fromDisplayName: requester.displayName,
      fromInitials: requester.initials,
      fileId: typeof payload.fileId === "string" ? payload.fileId : null,
      fileLabel: typeof payload.fileLabel === "string" ? payload.fileLabel.slice(0, FILE_LABEL_MAX_LENGTH) : null,
      receivedAt: new Date().toISOString(),
    };

    io.to(payload.targetConnectionId).emit(SOCKET_EVENTS.ATTENTION_RECEIVED, received);
  });

  socket.on("disconnect", () => {
    attentionRequestRate.delete(socket.id);
  });
}
