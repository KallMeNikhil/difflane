import { Router, type Request, type Response } from "express";
import type { AuthSessionResponse, GuestBootstrapResponse, OAuthProvider } from "@difflane/shared-types";
import { env } from "../config/env.js";
import { AuthError } from "../auth/AuthError.js";
import {
  createGuestSession,
  issueSessionForUser,
  login,
  logout,
  refreshSession,
  register,
  requestPasswordReset,
  resetPassword,
  toPublicUser,
  upgradeGuestSession,
} from "../auth/authService.js";
import { buildAuthorizationUrl, exchangeCodeForIdentity } from "../auth/oauthService.js";
import { findOrCreateOAuthUser } from "../auth/authService.js";
import type { AuthSessionResult } from "../auth/authService.js";
import { identityStore } from "../db/index.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const authRouter = Router();

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(env.auth.refreshCookieName, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: env.auth.refreshTokenTtlSeconds * 1000,
    path: "/api/auth",
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.auth.refreshCookieName, { path: "/api/auth" });
}

function setGuestCookie(res: Response, guestId: string): void {
  res.cookie(env.auth.guestCookieName, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: env.auth.refreshTokenTtlSeconds * 1000,
    path: "/api/auth",
  });
}

async function respondWithSession(res: Response, session: AuthSessionResult, status = 200): Promise<void> {
  setRefreshCookie(res, session.refreshToken);
  const payload: AuthSessionResponse = {
    identity: { kind: "authenticated", user: await toPublicUser(session.user) },
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
  };
  res.status(status).json(payload);
}

function handleAuthError(error: unknown, res: Response): void {
  if (error instanceof AuthError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }
  res.status(500).json({ code: "unknown_error", message: "Something went wrong. Please try again." });
}

authRouter.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, username, displayName, password } = req.body as {
      email?: string;
      username?: string;
      displayName?: string;
      password?: string;
    };
    if (!email || !username || !displayName || !password) {
      res.status(400).json({ code: "unknown_error", message: "All fields are required." });
      return;
    }
    const session = await register(email, username, displayName, password);
    await respondWithSession(res, session, 201);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ code: "invalid_credentials", message: "Email and password are required." });
      return;
    }
    const session = await login(email, password);
    await respondWithSession(res, session);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post("/api/auth/refresh", async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.[env.auth.refreshCookieName] as string | undefined;
    if (!refreshToken) {
      res.status(401).json({ code: "expired_token", message: "No active session." });
      return;
    }
    const session = await refreshSession(refreshToken);
    await respondWithSession(res, session);
  } catch (error) {
    clearRefreshCookie(res);
    handleAuthError(error, res);
  }
});

authRouter.post(
  "/api/auth/logout",
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[env.auth.refreshCookieName] as string | undefined;
    await logout(refreshToken);
    clearRefreshCookie(res);
    res.status(204).send();
  }),
);

authRouter.post(
  "/api/auth/guest",
  asyncHandler(async (req: Request, res: Response) => {
    const { displayName } = req.body as { displayName?: string };
    const existingGuestId = req.cookies?.[env.auth.guestCookieName] as string | undefined;
    const existingGuest = existingGuestId ? await identityStore.findGuestSession(existingGuestId) : null;
    const guest = existingGuest ?? (await createGuestSession(displayName ?? "Guest"));
    setGuestCookie(res, guest.id);
    const payload: GuestBootstrapResponse = {
      identity: { kind: "guest", guest: { id: guest.id, displayName: guest.displayName, initials: guest.displayName.slice(0, 2).toUpperCase() } },
    };
    res.status(existingGuest ? 200 : 201).json(payload);
  }),
);

authRouter.post("/api/auth/guest/upgrade", async (req: Request, res: Response) => {
  try {
    const { guestId, email, username, displayName, password } = req.body as {
      guestId?: string;
      email?: string;
      username?: string;
      displayName?: string;
      password?: string;
    };
    if (!guestId || !email || !username || !displayName || !password) {
      res.status(400).json({ code: "unknown_error", message: "All fields are required." });
      return;
    }
    const session = await upgradeGuestSession(guestId, email, username, displayName, password);
    await respondWithSession(res, session, 201);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.get("/api/auth/oauth/:provider/start", (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as OAuthProvider;
    const guestId = typeof req.query.guestId === "string" ? req.query.guestId : undefined;
    const nonce = Math.random().toString(36).slice(2);
    const state = guestId ? `guest:${guestId}:${nonce}` : nonce;
    const url = buildAuthorizationUrl(provider, state);
    res.json({ url, state });
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post("/api/auth/oauth/:provider/callback", async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as OAuthProvider;
    const { code, state } = req.body as { code?: string; state?: string };
    if (!code) {
      res.status(400).json({ code: "provider_error", message: "Missing authorization code." });
      return;
    }
    const identity = await exchangeCodeForIdentity(provider, code);
    const user = await findOrCreateOAuthUser(provider, identity.providerAccountId, identity.email, identity.displayName);

    if (state?.startsWith("guest:")) {
      const guestId = state.split(":")[1];
      if (guestId) {
        await identityStore.reassignWorkspaceMembershipsOnGuestUpgrade(guestId, user.id);
        await identityStore.deleteGuestSession(guestId);
      }
    }

    const session = await issueSessionForUser(user);
    await respondWithSession(res, session, 201);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post(
  "/api/auth/password/forgot",
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ code: "unknown_error", message: "Email is required." });
      return;
    }
    await requestPasswordReset(email);
    res.status(202).json({ message: "If an account exists for this email, a reset link has been sent." });
  }),
);

authRouter.post("/api/auth/password/reset", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword) {
      res.status(400).json({ code: "unknown_error", message: "Token and new password are required." });
      return;
    }
    await resetPassword(token, newPassword);
    res.status(204).send();
  } catch (error) {
    handleAuthError(error, res);
  }
});
