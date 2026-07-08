import type { Server } from "socket.io";
import { RoomRegistry } from "../rooms/RoomRegistry.js";
import { ConnectionAwarenessTracker } from "./ConnectionAwarenessTracker.js";
import { registerRoomHandlers } from "./roomHandlers.js";
import { registerSyncHandlers } from "./syncHandlers.js";

export function registerSocketServer(io: Server): void {
  const awarenessTracker = new ConnectionAwarenessTracker();
  const registry = new RoomRegistry(awarenessTracker);

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket, registry, awarenessTracker);
    registerSyncHandlers(socket, registry);
  });
}
