import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { assertProductionSecurityConfig, env } from "./config/env.js";
import { RoomRegistry } from "./rooms/RoomRegistry.js";
import { ConnectionAwarenessTracker } from "./socket/ConnectionAwarenessTracker.js";
import { WorkspaceLifecycleManager } from "./workspaces/WorkspaceLifecycleManager.js";
import { registerSocketServer } from "./socket/index.js";
import { prisma } from "./db/prismaClient.js";

assertProductionSecurityConfig();

const io = new Server({
  cors: { origin: env.corsOrigin, credentials: true },
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

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully.`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await lifecycleManager.flushPendingPersists();
    await prisma.$disconnect();
    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
