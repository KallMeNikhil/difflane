import type { RepositoryImportResult, RepositorySummary } from "@difflane/shared-types";
import { resolveServerUrl } from "../socket/socketClient";
import { getAccessToken } from "../auth/tokenStore";

export class RepositoryRequestError extends Error {}

function guestHeaders(guestId: string | null): Record<string, string> {
  return guestId ? { "x-guest-id": guestId } : {};
}

async function requestJson<T>(path: string, init?: RequestInit, guestId: string | null = null): Promise<T> {
  const baseUrl = resolveServerUrl() ?? "";
  const accessToken = getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...guestHeaders(guestId),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({ message: "Unexpected server response." }));
  if (!response.ok) {
    throw new RepositoryRequestError(body?.message ?? "Repository request failed.");
  }
  return body as T;
}

export function searchRepository(query: string, guestId: string | null = null): Promise<RepositorySummary> {
  return requestJson<RepositorySummary>(`/api/repository/search?query=${encodeURIComponent(query)}`, undefined, guestId);
}

export function listBranches(owner: string, repo: string, guestId: string | null = null): Promise<{ branches: string[] }> {
  return requestJson<{ branches: string[] }>(
    `/api/repository/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
    undefined,
    guestId,
  );
}

export function importRepository(
  owner: string,
  repo: string,
  branch: string,
  guestId: string | null = null,
): Promise<RepositoryImportResult> {
  return requestJson<RepositoryImportResult>(
    `/api/repository/import`,
    { method: "POST", body: JSON.stringify({ owner, repo, branch }) },
    guestId,
  );
}
