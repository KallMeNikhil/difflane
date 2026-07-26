import type { Socket } from "socket.io";
import * as Y from "yjs";
import { applyAwarenessUpdate } from "y-protocols/awareness";
import { SOCKET_EVENTS, type AwarenessUpdatePayload, type DocUpdatePayload } from "@difflane/shared-types";
import type { RoomRegistry } from "../rooms/RoomRegistry.js";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";

export function registerSyncHandlers(socket: Socket, registry: RoomRegistry, lifecycleManager: WorkspaceLifecycleManager): void {
  socket.on(SOCKET_EVENTS.DOC_UPDATE, (payload: DocUpdatePayload) => {
    const room = registry.getRoom(payload.roomId);
    if (!room || socket.data.roomId !== payload.roomId) {
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
    applyAwarenessUpdate(room.awareness, payload.update, socket.id);
    socket.to(payload.roomId).emit(SOCKET_EVENTS.AWARENESS_UPDATE, payload);
  });
}
