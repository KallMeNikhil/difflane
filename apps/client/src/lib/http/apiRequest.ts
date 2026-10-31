import { resolveServerUrl } from "../socket/socketClient";
import { getAccessToken, setAccessToken } from "../auth/tokenStore";
import { refreshAccessToken } from "../auth/authClient";

const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ApiRequestOptions {
  guestId?: string | null;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, options: ApiRequestOptions = {}, allowRefreshRetry = true): Promise<T> {
  const accessToken = getAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${resolveServerUrl() ?? ""}${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.guestId ? { "x-guest-id": options.guestId } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiRequestError(
      controller.signal.aborted ? "The server took too long to respond. Please try again." : "Unable to reach the server. Check your connection.",
      0,
      "network_error",
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
  if (!response.ok) {
    if (allowRefreshRetry && accessToken && body?.code === "expired_token") {
      try {
        const session = await refreshAccessToken();
        setAccessToken(session.accessToken);
      } catch {
        throw new ApiRequestError("Your session has expired. Please sign in again.", 401, "expired_token");
      }
      return apiRequest<T>(path, init, options, false);
    }
    throw new ApiRequestError(body?.message ?? "Something went wrong. Please try again.", response.status, body?.code ?? null);
  }
  return body as T;
}
