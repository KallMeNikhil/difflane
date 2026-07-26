import type { NextFunction, Request, Response } from "express";
import { verifyAccessTokenClaims } from "../auth/authService.js";
import type { AccessTokenClaims } from "../auth/tokenService.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AccessTokenClaims;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    res.status(401).json({ code: "invalid_token", message: "Authentication required." });
    return;
  }
  const claims = verifyAccessTokenClaims(token);
  if (!claims) {
    res.status(401).json({ code: "expired_token", message: "Your session has expired. Please sign in again." });
    return;
  }
  req.authUser = claims;
  next();
}
