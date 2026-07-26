import type {
  AuthErrorPayload,
  AuthSessionResponse,
  AuthUserProfile,
  GuestBootstrapResponse,
  UpdateMemberRoleRequest,
  TransferOwnershipRequest,
  WorkspaceDashboardResponse,
} from "@difflane/shared-types";
import { resolveServerUrl } from "../socket/socketClient";
import { getAccessToken } from "./tokenStore";

export class AuthRequestError extends Error {
  readonly code: AuthErrorPayload["code"];

  constructor(code: AuthErrorPayload["code"], message: string) {
    super(message);
    this.code = code;
  }
}

const REQUEST_TIMEOUT_MS = 15000;

async function requestJson<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const baseUrl = resolveServerUrl() ?? "";
  const accessToken = withAuth ? getAccessToken() : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AuthRequestError("network_error", "The server took too long to respond. Please try again.");
    }
    throw new AuthRequestError("network_error", "Unable to reach the server. Please check your connection.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({ code: "unknown_error", message: "Unexpected server response." }));
  if (!response.ok) {
    throw new AuthRequestError(body?.code ?? "unknown_error", body?.message ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export function registerAccount(email: string, username: string, displayName: string, password: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, username, displayName, password }) }, false);
}

export function loginWithPassword(email: string, password: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false);
}

export function refreshAccessToken(): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/refresh", { method: "POST" }, false);
}

export function logoutSession(): Promise<void> {
  return requestJson<void>("/api/auth/logout", { method: "POST" }, false);
}

export function bootstrapGuestSession(displayName: string): Promise<GuestBootstrapResponse> {
  return requestJson<GuestBootstrapResponse>("/api/auth/guest", { method: "POST", body: JSON.stringify({ displayName }) }, false);
}

export function upgradeGuestAccount(
  guestId: string,
  email: string,
  username: string,
  displayName: string,
  password: string,
): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>(
    "/api/auth/guest/upgrade",
    { method: "POST", body: JSON.stringify({ guestId, email, username, displayName, password }) },
    false,
  );
}

export function startOAuthFlow(provider: "google" | "github", guestId?: string | null): Promise<{ url: string; state: string }> {
  const query = guestId ? `?guestId=${encodeURIComponent(guestId)}` : "";
  return requestJson<{ url: string; state: string }>(`/api/auth/oauth/${provider}/start${query}`, undefined, false);
}

export function completeOAuthFlow(provider: "google" | "github", code: string, state: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>(
    `/api/auth/oauth/${provider}/callback`,
    { method: "POST", body: JSON.stringify({ code, state }) },
    false,
  );
}

export function requestPasswordResetEmail(email: string): Promise<{ message: string }> {
  return requestJson<{ message: string }>("/api/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) }, false);
}

export function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  return requestJson<void>("/api/auth/password/reset", { method: "POST", body: JSON.stringify({ token, newPassword }) }, false);
}

export function fetchCurrentUser(): Promise<AuthUserProfile> {
  return requestJson<AuthUserProfile>("/api/user/me");
}

export function updateCurrentUserProfile(patch: { displayName?: string; username?: string }): Promise<AuthUserProfile> {
  return requestJson<AuthUserProfile>("/api/user/me", { method: "PATCH", body: JSON.stringify(patch) });
}

export function changeCurrentUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  return requestJson<void>("/api/user/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
}

export function deleteCurrentUserAccount(): Promise<void> {
  return requestJson<void>("/api/user/me", { method: "DELETE" });
}

function guestHeaders(guestId: string | null): Record<string, string> {
  return guestId ? { "x-guest-id": guestId } : {};
}

export function createWorkspaceRecord(name: string, guestId: string | null): Promise<{ workspaceCode: string; name: string }> {
  return requestJson<{ workspaceCode: string; name: string }>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
    headers: guestHeaders(guestId),
  });
}

export function fetchWorkspaceDashboard(guestId: string | null): Promise<WorkspaceDashboardResponse> {
  return requestJson<WorkspaceDashboardResponse>("/api/workspaces/dashboard", { headers: guestHeaders(guestId) });
}

export function deleteWorkspaceRecord(code: string, guestId: string | null): Promise<void> {
  return requestJson<void>(`/api/workspaces/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: guestHeaders(guestId),
  });
}

export function setWorkspacePinned(code: string, pinned: boolean, guestId: string | null): Promise<void> {
  return requestJson<void>(`/api/workspaces/${encodeURIComponent(code)}/pin`, {
    method: "PATCH",
    body: JSON.stringify({ pinned }),
    headers: guestHeaders(guestId),
  });
}

export function setWorkspaceArchived(code: string, archived: boolean, guestId: string | null): Promise<void> {
  return requestJson<void>(`/api/workspaces/${encodeURIComponent(code)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archived }),
    headers: guestHeaders(guestId),
  });
}

export function transferWorkspaceOwnership(code: string, payload: TransferOwnershipRequest, guestId: string | null): Promise<void> {
  return requestJson<void>(`/api/workspaces/${encodeURIComponent(code)}/transfer-ownership`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: guestHeaders(guestId),
  });
}

export function updateWorkspaceMemberRole(code: string, payload: UpdateMemberRoleRequest, guestId: string | null): Promise<void> {
  return requestJson<void>(`/api/workspaces/${encodeURIComponent(code)}/members/role`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: guestHeaders(guestId),
  });
}
