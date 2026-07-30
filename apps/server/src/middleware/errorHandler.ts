import type { NextFunction, Request, Response } from "express";
import { AuthError } from "../auth/AuthError.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return;
  }
  console.error(err);
  if (err instanceof AuthError) {
    res.status(err.status).json({ code: err.code, message: err.message });
    return;
  }
  res.status(500).json({ code: "unknown_error", message: "Something went wrong. Please try again." });
}
