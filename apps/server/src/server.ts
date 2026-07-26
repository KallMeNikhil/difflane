import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { RoomRegistry } from "./rooms/RoomRegistry.js";
import { ConnectionAwarenessTracker } from "./socket/ConnectionAwarenessTracker.js";
import { WorkspaceLifecycleManager } from "./workspaces/WorkspaceLifecycleManager.js";
import { registerSocketServer } from "./socket/index.js";

const io = new Server({
  cors: { origin: env.corsOrigin },
});

const awarenessTracker = new ConnectionAwarenessTracker();
const registry = new RoomRegistry(awarenessTracker);
const lifecycleManager = new WorkspaceLifecycleManager(io, registry);

const app = createApp(lifecycleManager);
const httpServer = createServer(app);
io.attach(httpServer);

registerSocketServer(io, registry, awarenessTracker, lifecycleManager);

httpServer.listen(env.port, () => {
  console.log(`Difflane server listening on port ${env.port}`);
});
