import type { Socket } from "socket.io";
import * as Y from "yjs";
import { applyAwarenessUpdate } from "y-protocols/awareness";
import { SOCKET_EVENTS, type AwarenessUpdatePayload, type DocUpdatePayload } from "@difflane/shared-types";
import type { RoomRegistry } from "../rooms/RoomRegistry.js";
import { env } from "../config/env.js";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";

interface RateState {
  count: number;
  windowStart: number;
}

function isRateLimited(bucket: Map<string, RateState>, key: string, max: number): boolean {
  const now = Date.now();
  const state = bucket.get(key);
  if (!state || now - state.windowStart > env.socketRateLimit.windowMs) {
    bucket.set(key, { count: 1, windowStart: now });
    return false;
  }
  state.count += 1;
  return state.count > max;
}

const docUpdateRate = new Map<string, RateState>();
const awarenessUpdateRate = new Map<string, RateState>();

export function registerSyncHandlers(socket: Socket, registry: RoomRegistry, lifecycleManager: WorkspaceLifecycleManager): void {
  socket.on(SOCKET_EVENTS.DOC_UPDATE, (payload: DocUpdatePayload) => {
    const room = registry.getRoom(payload.roomId);
    if (!room || socket.data.roomId !== payload.roomId) {
      return;
    }
    const participant = registry.getParticipant(payload.roomId, socket.id);
    if (!participant || participant.role === "viewer") {
      return;
    }
    if (isRateLimited(docUpdateRate, socket.id, env.socketRateLimit.docUpdateMax)) {
      return;
    }
    Y.applyUpdate(room.doc, payload.update, socket.id);
    socket.to(payload.roomId).emit(SOCKET_EVENTS.DOC_UPDATE, payload);
    lifecycleManager.persistDocUpdate(room.roomId, room.workspaceId, room.doc);
  });

  socket.on(SOCKET_EVENTS.AWARENESS_UPDATE, (payload: AwarenessUpdatePayload) => {
    const room = registry.getRoom(payload.roomId);
    if (!room || socket.data.roomId !== payload.roomId) {
      return;
    }
    if (isRateLimited(awarenessUpdateRate, socket.id, env.socketRateLimit.awarenessUpdateMax)) {
      return;
    }
    applyAwarenessUpdate(room.awareness, payload.update, socket.id);
    socket.to(payload.roomId).emit(SOCKET_EVENTS.AWARENESS_UPDATE, payload);
  });

  socket.on("disconnect", () => {
    docUpdateRate.delete(socket.id);
    awarenessUpdateRate.delete(socket.id);
  });
}
