import type { Request, Response } from "express";
import { AuthError } from "../auth/AuthError.js";
import type { Identity } from "../workspaces/workspaceService.js";

export function handleRouteError(error: unknown, res: Response): void {
  if (error instanceof AuthError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }
  res.status(500).json({ code: "unknown_error", message: "Something went wrong. Please try again." });
}

export function requireIdentity(req: Request): Identity {
  if (!req.identity) {
    throw new AuthError("invalid_token", "Identity could not be resolved.", 401);
  }
  return req.identity;
}
