import { Router, type Request, type Response } from "express";
import type { AuthSessionResponse, GuestBootstrapResponse, OAuthProvider } from "@difflane/shared-types";
import { env } from "../config/env.js";
import {
  beginOAuthFlow,
  completeOAuthFlow,
  createGuestSession,
  login,
  logout,
  refreshSession,
  register,
  requestPasswordReset,
  resetPassword,
  toPublicUser,
  upgradeGuestSession,
} from "../auth/authService.js";
import type { AuthSessionResult } from "../auth/authService.js";
import { identityStore } from "../db/index.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { moderateRateLimit, strictRateLimit } from "../middleware/rateLimit.js";
import { handleRouteError as handleAuthError } from "../middleware/routeHelpers.js";

export const authRouter = Router();

const CROSS_SITE_COOKIE_SAME_SITE = env.isProduction ? "none" : "lax";

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(env.auth.refreshCookieName, refreshToken, {
    httpOnly: true,
    sameSite: CROSS_SITE_COOKIE_SAME_SITE,
    secure: env.isProduction,
    maxAge: env.auth.refreshTokenTtlSeconds * 1000,
    path: env.auth.refreshCookiePath,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.auth.refreshCookieName, { path: env.auth.refreshCookiePath, sameSite: CROSS_SITE_COOKIE_SAME_SITE, secure: env.isProduction });
}

function setGuestCookie(res: Response, guestId: string): void {
  res.cookie(env.auth.guestCookieName, guestId, {
    httpOnly: true,
    sameSite: CROSS_SITE_COOKIE_SAME_SITE,
    secure: env.isProduction,
    maxAge: env.auth.refreshTokenTtlSeconds * 1000,
    path: env.auth.guestCookiePath,
  });
}

function clearGuestCookie(res: Response): void {
  res.clearCookie(env.auth.guestCookieName, { path: env.auth.guestCookiePath, sameSite: CROSS_SITE_COOKIE_SAME_SITE, secure: env.isProduction });
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

authRouter.post("/api/auth/register", strictRateLimit, async (req: Request, res: Response) => {
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

authRouter.post("/api/auth/login", strictRateLimit, async (req: Request, res: Response) => {
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
  moderateRateLimit,
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

authRouter.post("/api/auth/guest/upgrade", strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, username, displayName, password } = req.body as {
      email?: string;
      username?: string;
      displayName?: string;
      password?: string;
    };
    const guestId = req.cookies?.[env.auth.guestCookieName] as string | undefined;
    if (!guestId) {
      res.status(401).json({ code: "invalid_token", message: "No active guest session to upgrade." });
      return;
    }
    if (!email || !username || !displayName || !password) {
      res.status(400).json({ code: "unknown_error", message: "All fields are required." });
      return;
    }
    const session = await upgradeGuestSession(guestId, email, username, displayName, password);
    clearGuestCookie(res);
    await respondWithSession(res, session, 201);
  } catch (error) {
    handleAuthError(error, res);
  }
});

const OAUTH_PROVIDERS: OAuthProvider[] = ["google", "github"];

function isValidOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as string[]).includes(value);
}

authRouter.get("/api/auth/oauth/:provider/start", moderateRateLimit, async (req: Request, res: Response) => {
  try {
    if (!isValidOAuthProvider(req.params.provider)) {
      res.status(400).json({ code: "provider_error", message: "Unsupported sign-in provider." });
      return;
    }
    const provider = req.params.provider;
    const guestId = (req.cookies?.[env.auth.guestCookieName] as string | undefined) ?? null;
    const { url, state } = await beginOAuthFlow(provider, guestId);
    res.json({ url, state });
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post("/api/auth/oauth/:provider/callback", strictRateLimit, async (req: Request, res: Response) => {
  try {
    if (!isValidOAuthProvider(req.params.provider)) {
      res.status(400).json({ code: "provider_error", message: "Unsupported sign-in provider." });
      return;
    }
    const provider = req.params.provider;
    const { code, state } = req.body as { code?: string; state?: string };
    if (!code || !state) {
      res.status(400).json({ code: "provider_error", message: "Missing authorization code." });
      return;
    }
    const session = await completeOAuthFlow(provider, code, state);
    clearGuestCookie(res);
    await respondWithSession(res, session, 201);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post(
  "/api/auth/password/forgot",
  strictRateLimit,
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

authRouter.post("/api/auth/password/reset", strictRateLimit, async (req: Request, res: Response) => {
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
