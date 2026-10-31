import type { Server } from "socket.io";
import type { RoomRegistry } from "../rooms/RoomRegistry.js";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";
import type { ConnectionAwarenessTracker } from "./ConnectionAwarenessTracker.js";
import { registerRoomHandlers } from "./roomHandlers.js";
import { registerSyncHandlers } from "./syncHandlers.js";
import { registerAttentionHandlers } from "./attentionHandlers.js";

export function registerSocketServer(
  io: Server,
  registry: RoomRegistry,
  awarenessTracker: ConnectionAwarenessTracker,
  lifecycleManager: WorkspaceLifecycleManager,
): void {
  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket, registry, awarenessTracker, lifecycleManager);
    registerSyncHandlers(socket, registry, lifecycleManager);
    registerAttentionHandlers(io, socket, registry);
  });
}
