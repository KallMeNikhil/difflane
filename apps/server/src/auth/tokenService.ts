import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AccessTokenClaims {
  sub: string;
  email: string;
  username: string;
}

export function signAccessToken(claims: AccessTokenClaims): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + env.auth.accessTokenTtlSeconds * 1000);
  const token = jwt.sign(claims, env.auth.accessTokenSecret, { expiresIn: env.auth.accessTokenTtlSeconds });
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessTokenClaims | null {
  try {
    return jwt.verify(token, env.auth.accessTokenSecret) as AccessTokenClaims & jwt.JwtPayload;
  } catch {
    return null;
  }
}

export function createRefreshTokenValue(): string {
  return `${randomUUID()}.${randomUUID()}`;
}

export function createOAuthStateValue(): string {
  return `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.auth.refreshTokenTtlSeconds * 1000);
}
