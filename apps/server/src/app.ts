import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { repositoryRouter } from "./routes/repository.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/user.js";
import { createWorkspaceRouter } from "./routes/workspace.js";
import { createPersistenceRouter } from "./routes/persistence.js";
import type { WorkspaceLifecycleManager } from "./workspaces/WorkspaceLifecycleManager.js";

export function createApp(lifecycleManager: WorkspaceLifecycleManager): Express {
  const app = express();
  if (env.isProduction) {
    app.set("trust proxy", 1);
  }
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(compression());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "25mb" }));
  app.use(cookieParser());
  app.use(healthRouter);
  app.use(repositoryRouter);
  app.use(authRouter);
  app.use(userRouter);
  app.use(createWorkspaceRouter(lifecycleManager));
  app.use(createPersistenceRouter(lifecycleManager));
  app.use(errorHandler);
  return app;
}
