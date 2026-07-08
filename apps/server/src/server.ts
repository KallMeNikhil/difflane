import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { registerSocketServer } from "./socket/index.js";

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.corsOrigin },
});

registerSocketServer(io);

httpServer.listen(env.port, () => {
  console.log(`Difflane server listening on port ${env.port}`);
});
