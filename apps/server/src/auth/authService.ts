import type { AuthUserProfile, OAuthProvider } from "@difflane/shared-types";
import { identityStore } from "../db/index.js";
import type { UserRecord } from "../db/models.js";
import { AuthError } from "./AuthError.js";
import { validatePasswordPolicy } from "./passwordPolicy.js";
import { hashPassword, verifyPassword } from "./passwordService.js";
import {
  createRefreshTokenValue,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyAccessToken,
  type AccessTokenClaims,
} from "./tokenService.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export interface AuthSessionResult {
  user: UserRecord;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
}

function deriveInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : trimmed.slice(0, 2);
  return initials.toUpperCase();
}

export async function toPublicUser(user: UserRecord): Promise<AuthUserProfile> {
  const oauthAccounts = await identityStore.listOAuthAccounts(user.id);
  const linkedProviders = oauthAccounts.map((account) => account.provider) as OAuthProvider[];
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    initials: deriveInitials(user.displayName),
    createdAt: user.createdAt.toISOString(),
    linkedProviders,
    primaryProvider: user.passwordHash ? "password" : (linkedProviders[0] ?? "password"),
  };
}

function validateRegistrationInput(email: string, username: string, displayName: string, password: string): void {
  if (!EMAIL_PATTERN.test(email)) {
    throw new AuthError("unknown_error", "Enter a valid email address.");
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw new AuthError("unknown_error", "Username must be 3-24 characters (letters, numbers, underscore).");
  }
  if (!displayName.trim()) {
    throw new AuthError("unknown_error", "Display name is required.");
  }
  const policyErrors = validatePasswordPolicy(password);
  if (policyErrors.length > 0) {
    throw new AuthError("weak_password", policyErrors.join(" "));
  }
}

async function issueSession(user: UserRecord): Promise<AuthSessionResult> {
  const claims: AccessTokenClaims = { sub: user.id, email: user.email, username: user.username };
  const { token: accessToken, expiresAt: accessTokenExpiresAt } = signAccessToken(claims);

  await identityStore.revokeRefreshSessionsForUser(user.id);
  const refreshToken = createRefreshTokenValue();
  await identityStore.createRefreshSession(user.id, hashRefreshToken(refreshToken), refreshTokenExpiry());

  return { user, accessToken, accessTokenExpiresAt, refreshToken };
}

export async function issueSessionForUser(user: UserRecord): Promise<AuthSessionResult> {
  return issueSession(user);
}

export async function register(email: string, username: string, displayName: string, password: string): Promise<AuthSessionResult> {
  validateRegistrationInput(email, username, displayName, password);

  const existingEmail = await identityStore.findUserByEmail(email);
  if (existingEmail) {
    throw new AuthError("account_exists", "An account with this email address already exists.");
  }
  const existingUsername = await identityStore.findUserByUsername(username);
  if (existingUsername) {
    throw new AuthError("username_taken", "Username is already taken.");
  }

  const passwordHash = await hashPassword(password);
  const user = await identityStore.createUser({ email, username, displayName, passwordHash });
  return issueSession(user);
}

export async function login(email: string, password: string): Promise<AuthSessionResult> {
  const user = await identityStore.findUserByEmail(email);
  if (!user || !user.passwordHash) {
    throw new AuthError("invalid_credentials", "Invalid email or password.", 401);
  }
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AuthError("invalid_credentials", "Invalid email or password.", 401);
  }
  return issueSession(user);
}

export async function refreshSession(refreshTokenValue: string): Promise<AuthSessionResult> {
  const tokenHash = hashRefreshToken(refreshTokenValue);
  const session = await identityStore.findRefreshSessionByHash(tokenHash);
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    throw new AuthError("expired_token", "Your session has expired. Please sign in again.", 401);
  }
  const user = await identityStore.findUserById(session.userId);
  if (!user) {
    throw new AuthError("invalid_token", "Session is no longer valid.", 401);
  }
  await identityStore.revokeRefreshSession(session.id);
  return issueSession(user);
}

export async function logout(refreshTokenValue: string | undefined): Promise<void> {
  if (!refreshTokenValue) {
    return;
  }
  const session = await identityStore.findRefreshSessionByHash(hashRefreshToken(refreshTokenValue));
  if (session) {
    await identityStore.revokeRefreshSession(session.id);
  }
}

export function verifyAccessTokenClaims(token: string): AccessTokenClaims | null {
  return verifyAccessToken(token);
}

export async function createGuestSession(displayName: string) {
  const trimmed = displayName.trim() || "Guest";
  return identityStore.createGuestSession(trimmed);
}

export async function upgradeGuestSession(
  guestId: string,
  email: string,
  username: string,
  displayName: string,
  password: string,
): Promise<AuthSessionResult> {
  const guest = await identityStore.findGuestSession(guestId);
  if (!guest) {
    throw new AuthError("invalid_token", "Guest session is no longer active.", 401);
  }
  validateRegistrationInput(email, username, displayName, password);

  const existingEmail = await identityStore.findUserByEmail(email);
  if (existingEmail) {
    throw new AuthError("account_exists", "An account with this email address already exists.");
  }
  const existingUsername = await identityStore.findUserByUsername(username);
  if (existingUsername) {
    throw new AuthError("username_taken", "Username is already taken.");
  }

  const passwordHash = await hashPassword(password);
  const user = await identityStore.createUser({ email, username, displayName, passwordHash });
  await identityStore.reassignWorkspaceMembershipsOnGuestUpgrade(guestId, user.id);
  await identityStore.deleteGuestSession(guestId);
  return issueSession(user);
}

export async function updateProfile(userId: string, patch: { displayName?: string; username?: string }): Promise<UserRecord> {
  if (patch.username) {
    if (!USERNAME_PATTERN.test(patch.username)) {
      throw new AuthError("unknown_error", "Username must be 3-24 characters (letters, numbers, underscore).");
    }
    const existing = await identityStore.findUserByUsername(patch.username);
    if (existing && existing.id !== userId) {
      throw new AuthError("username_taken", "Username is already taken.");
    }
  }
  return identityStore.updateUser(userId, patch);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await identityStore.findUserById(userId);
  if (!user || !user.passwordHash) {
    throw new AuthError("invalid_credentials", "Unable to verify current password.", 401);
  }
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AuthError("invalid_credentials", "Current password is incorrect.", 401);
  }
  const policyErrors = validatePasswordPolicy(newPassword);
  if (policyErrors.length > 0) {
    throw new AuthError("weak_password", policyErrors.join(" "));
  }
  const passwordHash = await hashPassword(newPassword);
  await identityStore.updateUser(userId, { passwordHash });
  await identityStore.revokeRefreshSessionsForUser(userId);
}

export async function deleteAccount(userId: string): Promise<void> {
  await identityStore.revokeRefreshSessionsForUser(userId);
  await identityStore.deleteUser(userId);
}

export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await identityStore.findUserByEmail(email);
  if (!user) {
    return null;
  }
  const tokenValue = createRefreshTokenValue();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await identityStore.createPasswordResetToken(user.id, hashRefreshToken(tokenValue), expiresAt);
  return tokenValue;
}

export async function resetPassword(tokenValue: string, newPassword: string): Promise<void> {
  const tokenHash = hashRefreshToken(tokenValue);
  const token = await identityStore.findPasswordResetTokenByHash(tokenHash);
  if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) {
    throw new AuthError("expired_token", "This password reset link is invalid or has expired.", 400);
  }
  const policyErrors = validatePasswordPolicy(newPassword);
  if (policyErrors.length > 0) {
    throw new AuthError("weak_password", policyErrors.join(" "));
  }
  const passwordHash = await hashPassword(newPassword);
  await identityStore.updateUser(token.userId, { passwordHash });
  await identityStore.markPasswordResetTokenUsed(token.id);
  await identityStore.revokeRefreshSessionsForUser(token.userId);
}

export async function findOrCreateOAuthUser(
  provider: OAuthProvider,
  providerAccountId: string,
  email: string,
  displayName: string,
): Promise<UserRecord> {
  const existingLink = await identityStore.findOAuthAccount(provider, providerAccountId);
  if (existingLink) {
    const user = await identityStore.findUserById(existingLink.userId);
    if (user) {
      return user;
    }
  }

  const existingEmailUser = await identityStore.findUserByEmail(email);
  if (existingEmailUser) {
    await identityStore.linkOAuthAccount(existingEmailUser.id, provider, providerAccountId);
    return existingEmailUser;
  }

  let username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "user";
  let suffix = 0;
  while (await identityStore.findUserByUsername(username)) {
    suffix += 1;
    username = `${username}${suffix}`;
  }

  const user = await identityStore.createUser({ email, username, displayName, passwordHash: null });
  await identityStore.linkOAuthAccount(user.id, provider, providerAccountId);
  return user;
}
