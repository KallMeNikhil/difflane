import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { repositoryRouter } from "./routes/repository.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/user.js";
import { workspaceRouter } from "./routes/workspace.js";
import { createPersistenceRouter } from "./routes/persistence.js";
import type { WorkspaceLifecycleManager } from "./workspaces/WorkspaceLifecycleManager.js";

export function createApp(lifecycleManager: WorkspaceLifecycleManager): Express {
  const app = express();
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "25mb" }));
  app.use(cookieParser());
  app.use(healthRouter);
  app.use(repositoryRouter);
  app.use(authRouter);
  app.use(userRouter);
  app.use(workspaceRouter);
  app.use(createPersistenceRouter(lifecycleManager));
  app.use(errorHandler);
  return app;
}
