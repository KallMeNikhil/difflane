import type { AuthSessionResponse, AuthUserProfile, WorkspaceDashboardResponse } from "@difflane/shared-types";
import * as authClient from "../lib/auth/authClient";
import { setAccessToken } from "../lib/auth/tokenStore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export function validateEmail(email: string): string | null {
  return EMAIL_PATTERN.test(email) ? null : "Enter a valid email address.";
}

export function validateUsername(username: string): string | null {
  return USERNAME_PATTERN.test(username) ? null : "Username must be 3-24 characters (letters, numbers, underscore).";
}

export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  return errors;
}

function applySession(session: AuthSessionResponse): void {
  setAccessToken(session.accessToken);
}

export async function register(email: string, username: string, displayName: string, password: string): Promise<AuthSessionResponse> {
  const session = await authClient.registerAccount(email, username, displayName, password);
  applySession(session);
  return session;
}

export async function login(email: string, password: string): Promise<AuthSessionResponse> {
  const session = await authClient.loginWithPassword(email, password);
  applySession(session);
  return session;
}

export async function refresh(): Promise<AuthSessionResponse> {
  const session = await authClient.refreshAccessToken();
  applySession(session);
  return session;
}

export async function logout(): Promise<void> {
  await authClient.logoutSession();
  setAccessToken(null);
}

export async function bootstrapGuest(displayName: string) {
  return authClient.bootstrapGuestSession(displayName);
}

export async function upgradeGuest(
  guestId: string,
  email: string,
  username: string,
  displayName: string,
  password: string,
): Promise<AuthSessionResponse> {
  const session = await authClient.upgradeGuestAccount(guestId, email, username, displayName, password);
  applySession(session);
  return session;
}

export async function beginOAuthFlow(provider: "google" | "github", guestId?: string | null): Promise<string> {
  const { url } = await authClient.startOAuthFlow(provider, guestId);
  return url;
}

export async function completeOAuthFlow(provider: "google" | "github", code: string, state: string): Promise<AuthSessionResponse> {
  const session = await authClient.completeOAuthFlow(provider, code, state);
  applySession(session);
  return session;
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return authClient.requestPasswordResetEmail(email);
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return authClient.resetPasswordWithToken(token, newPassword);
}

export function fetchProfile(): Promise<AuthUserProfile> {
  return authClient.fetchCurrentUser();
}

export function updateProfile(patch: { displayName?: string; username?: string }): Promise<AuthUserProfile> {
  return authClient.updateCurrentUserProfile(patch);
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return authClient.changeCurrentUserPassword(currentPassword, newPassword);
}

export function deleteAccount(): Promise<void> {
  return authClient.deleteCurrentUserAccount();
}

export function fetchDashboard(guestId: string | null): Promise<WorkspaceDashboardResponse> {
  return authClient.fetchWorkspaceDashboard(guestId);
}

export function createWorkspaceRecord(name: string, guestId: string | null) {
  return authClient.createWorkspaceRecord(name, guestId);
}

export function deleteWorkspaceRecord(code: string, guestId: string | null) {
  return authClient.deleteWorkspaceRecord(code, guestId);
}

export function setWorkspacePinned(code: string, pinned: boolean, guestId: string | null) {
  return authClient.setWorkspacePinned(code, pinned, guestId);
}

export function setWorkspaceArchived(code: string, archived: boolean, guestId: string | null) {
  return authClient.setWorkspaceArchived(code, archived, guestId);
}
