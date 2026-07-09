import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { repositoryRouter } from "./routes/repository.js";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(healthRouter);
  app.use(repositoryRouter);
  app.use(errorHandler);
  return app;
}
