import type { RepositoryImportResult, RepositorySummary } from "@difflane/shared-types";
import { apiRequest } from "../http/apiRequest";

function requestJson<T>(path: string, init: RequestInit | undefined, guestId: string | null, timeoutMs?: number): Promise<T> {
  return apiRequest<T>(path, init, { guestId, timeoutMs });
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
    120_000,
  );
}
