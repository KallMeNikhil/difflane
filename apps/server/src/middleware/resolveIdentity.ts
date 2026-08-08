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

const GUEST_ID_HEADER = "x-guest-id";

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

  const cookieGuestId = req.cookies?.[env.auth.guestCookieName] as string | undefined;
  if (cookieGuestId) {
    const guest = await identityStore.findGuestSession(cookieGuestId);
    if (guest) {
      await identityStore.touchGuestSession(cookieGuestId);
      req.identity = { type: "guest", id: cookieGuestId };
      next();
      return;
    }
  }

  const headerGuestId = req.headers[GUEST_ID_HEADER];
  const candidateGuestId = typeof headerGuestId === "string" ? headerGuestId : undefined;
  if (candidateGuestId) {
    const guest = await identityStore.findGuestSession(candidateGuestId);
    if (guest) {
      await identityStore.touchGuestSession(candidateGuestId);
      req.identity = { type: "guest", id: candidateGuestId };
      next();
      return;
    }
  }

  if (cookieGuestId || candidateGuestId) {
    res.status(401).json({ code: "invalid_token", message: "Guest session is no longer active." });
    return;
  }

  res.status(401).json({ code: "invalid_token", message: "Authentication is required." });
}

export const resolveIdentity: RequestHandler = asyncHandler(resolveIdentityHandler);
