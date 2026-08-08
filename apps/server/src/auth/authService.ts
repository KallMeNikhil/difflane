import type { AuthUserProfile, OAuthProvider } from "@difflane/shared-types";
import { env } from "../config/env.js";
import { identityStore } from "../db/index.js";
import type { RefreshSessionRecord, UserRecord } from "../db/models.js";
import { AuthError } from "./AuthError.js";
import { buildAuthorizationUrl, exchangeCodeForIdentity } from "./oauthService.js";
import { validatePasswordPolicy } from "./passwordPolicy.js";
import { hashPassword, verifyPassword } from "./passwordService.js";
import {
  createOAuthStateValue,
  createRefreshTokenValue,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyAccessToken,
  type AccessTokenClaims,
} from "./tokenService.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;
const DISPLAY_NAME_MAX_LENGTH = 60;

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
  if (displayName.trim().length > DISPLAY_NAME_MAX_LENGTH) {
    throw new AuthError("unknown_error", `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`);
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

export async function login(identifier: string, password: string): Promise<AuthSessionResult> {
  const trimmedIdentifier = identifier.trim();
  const user = EMAIL_PATTERN.test(trimmedIdentifier)
    ? await identityStore.findUserByEmail(trimmedIdentifier)
    : await identityStore.findUserByUsername(trimmedIdentifier);
  if (!user || !user.passwordHash) {
    throw new AuthError("invalid_credentials", "Invalid email/username or password.", 401);
  }
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AuthError("invalid_credentials", "Invalid email/username or password.", 401);
  }
  return issueSession(user);
}

const REFRESH_GRACE_PERIOD_MS = 10_000;
const MAX_REFRESH_CHAIN_HOPS = 5;

async function rotateRefreshSession(session: RefreshSessionRecord, user: UserRecord): Promise<AuthSessionResult> {
  const claims: AccessTokenClaims = { sub: user.id, email: user.email, username: user.username };
  const { token: accessToken, expiresAt: accessTokenExpiresAt } = signAccessToken(claims);
  const refreshToken = createRefreshTokenValue();
  await identityStore.replaceRefreshSession(session.id, hashRefreshToken(refreshToken), refreshTokenExpiry());
  return { user, accessToken, accessTokenExpiresAt, refreshToken };
}

function isWithinGracePeriod(revokedAt: Date | null): boolean {
  return revokedAt !== null && Date.now() - revokedAt.getTime() <= REFRESH_GRACE_PERIOD_MS;
}

async function resolveConcurrentRefresh(session: RefreshSessionRecord): Promise<AuthSessionResult> {
  let current = session;
  let hops = 0;

  while (isWithinGracePeriod(current.revokedAt) && current.replacedByHash && hops < MAX_REFRESH_CHAIN_HOPS) {
    const next = await identityStore.findRefreshSessionByHash(current.replacedByHash);
    if (!next) {
      break;
    }
    if (!next.revokedAt && next.expiresAt.getTime() >= Date.now()) {
      const user = await identityStore.findUserById(next.userId);
      if (!user) {
        break;
      }
      return rotateRefreshSession(next, user);
    }
    current = next;
    hops += 1;
  }

  await identityStore.revokeRefreshSessionsForUser(session.userId);
  throw new AuthError("invalid_token", "Session is no longer valid. Please sign in again.", 401);
}

export async function refreshSession(refreshTokenValue: string): Promise<AuthSessionResult> {
  const tokenHash = hashRefreshToken(refreshTokenValue);
  const session = await identityStore.findRefreshSessionByHash(tokenHash);
  if (!session || session.expiresAt.getTime() < Date.now()) {
    throw new AuthError("expired_token", "Your session has expired. Please sign in again.", 401);
  }
  if (session.revokedAt) {
    return resolveConcurrentRefresh(session);
  }
  const user = await identityStore.findUserById(session.userId);
  if (!user) {
    throw new AuthError("invalid_token", "Session is no longer valid.", 401);
  }
  return rotateRefreshSession(session, user);
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
  const trimmed = displayName.trim().slice(0, DISPLAY_NAME_MAX_LENGTH) || "Guest";
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
  const memberships = await identityStore.listMembershipsForIdentity({ userId });
  const ownedWorkspaceCount = memberships.filter((membership) => membership.role === "OWNER").length;
  if (ownedWorkspaceCount > 0) {
    throw new AuthError(
      "unknown_error",
      "Transfer ownership or delete your owned workspaces before deleting your account.",
      409,
    );
  }
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
  emailVerified: boolean,
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
    if (!emailVerified) {
      throw new AuthError(
        "account_exists",
        "An account with this email already exists. Sign in with your password, or verify this email address with the provider and try again.",
        409,
      );
    }
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

export async function beginOAuthFlow(provider: OAuthProvider, guestId: string | null): Promise<{ url: string; state: string }> {
  let verifiedGuestId: string | null = null;
  if (guestId) {
    const guest = await identityStore.findGuestSession(guestId);
    verifiedGuestId = guest ? guest.id : null;
  }
  const stateValue = createOAuthStateValue();
  const expiresAt = new Date(Date.now() + env.auth.oauthStateTtlMinutes * 60 * 1000);
  await identityStore.createOAuthState(stateValue, provider, verifiedGuestId, expiresAt);
  const url = buildAuthorizationUrl(provider, stateValue);
  return { url, state: stateValue };
}

export async function completeOAuthFlow(provider: OAuthProvider, code: string, stateValue: string): Promise<AuthSessionResult> {
  const stateRecord = await identityStore.findOAuthStateByValue(stateValue);
  if (!stateRecord || stateRecord.usedAt || stateRecord.provider !== provider || stateRecord.expiresAt.getTime() < Date.now()) {
    throw new AuthError("invalid_state", "This sign-in attempt is invalid or has expired. Please try again.", 400);
  }
  await identityStore.markOAuthStateUsed(stateRecord.id);

  const identity = await exchangeCodeForIdentity(provider, code);
  const user = await findOrCreateOAuthUser(provider, identity.providerAccountId, identity.email, identity.emailVerified, identity.displayName);

  if (stateRecord.guestId) {
    await identityStore.reassignWorkspaceMembershipsOnGuestUpgrade(stateRecord.guestId, user.id);
    await identityStore.deleteGuestSession(stateRecord.guestId);
  }

  return issueSession(user);
}
