import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "../config/env.js";
import { verifyAccessTokenClaims } from "../auth/authService.js";
import { identityStore } from "../db/index.js";
import type { Identity } from "../workspaces/workspaceService.js";
import { asyncHandler } from "./asyncHandler.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      identity?: Identity;
    }
  }
}

async function resolveIdentityHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (token) {
    const claims = verifyAccessTokenClaims(token);
    if (!claims) {
      res.status(401).json({ code: "expired_token", message: "Your session has expired. Please sign in again." });
      return;
    }
    req.identity = { type: "user", id: claims.sub };
    next();
    return;
  }

  const guestId = req.cookies?.[env.auth.guestCookieName] as string | undefined;
  if (guestId) {
    const guest = await identityStore.findGuestSession(guestId);
    if (!guest) {
      res.status(401).json({ code: "invalid_token", message: "Guest session is no longer active." });
      return;
    }
    await identityStore.touchGuestSession(guestId);
    req.identity = { type: "guest", id: guestId };
    next();
    return;
  }

  res.status(401).json({ code: "invalid_token", message: "Authentication or a guest session is required." });
}

export const resolveIdentity: RequestHandler = asyncHandler(resolveIdentityHandler);
