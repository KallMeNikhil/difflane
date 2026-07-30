import rateLimit, { ipKeyGenerator, type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response } from "express";
import { env } from "../config/env.js";

function identityAwareKey(req: Request): string {
  if (req.authUser?.sub) {
    return `user:${req.authUser.sub}`;
  }
  if (req.identity) {
    return `${req.identity.type}:${req.identity.id}`;
  }
  return ipKeyGenerator(req.ip ?? "unknown");
}

function tooManyRequests(_req: Request, res: Response): void {
  res.status(429).json({ code: "rate_limited", message: "Too many requests. Please slow down and try again shortly." });
}

function buildLimiter(windowMs: number, max: number, keyGenerator: (req: Request) => string): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: tooManyRequests,
  });
}

export const strictRateLimit = buildLimiter(env.rateLimit.strict.windowMs, env.rateLimit.strict.max, (req) =>
  ipKeyGenerator(req.ip ?? "unknown"),
);

export const moderateRateLimit = buildLimiter(env.rateLimit.moderate.windowMs, env.rateLimit.moderate.max, identityAwareKey);

export const relaxedRateLimit = buildLimiter(env.rateLimit.relaxed.windowMs, env.rateLimit.relaxed.max, identityAwareKey);
