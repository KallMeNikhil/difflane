import type { RepositoryImportResult, RepositorySummary } from "@difflane/shared-types";
import { resolveServerUrl } from "../socket/socketClient";

export class RepositoryRequestError extends Error {}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = resolveServerUrl() ?? "";
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({ message: "Unexpected server response." }));
  if (!response.ok) {
    throw new RepositoryRequestError(body?.message ?? "Repository request failed.");
  }
  return body as T;
}

export function searchRepository(query: string): Promise<RepositorySummary> {
  return requestJson<RepositorySummary>(`/api/repository/search?query=${encodeURIComponent(query)}`);
}

export function listBranches(owner: string, repo: string): Promise<{ branches: string[] }> {
  return requestJson<{ branches: string[] }>(`/api/repository/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`);
}

export function importRepository(owner: string, repo: string, branch: string): Promise<RepositoryImportResult> {
  return requestJson<RepositoryImportResult>(`/api/repository/import`, {
    method: "POST",
    body: JSON.stringify({ owner, repo, branch }),
  });
}
