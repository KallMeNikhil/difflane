import type {
  CreateSnapshotRequest,
  ImportWorkspaceRequest,
  ImportWorkspaceResponse,
  RenameSnapshotRequest,
  WorkspaceExportPayload,
  WorkspaceRecoveryStatusResponse,
  WorkspaceSnapshotSummary,
} from "@difflane/shared-types";
import { resolveServerUrl } from "../socket/socketClient";
import { getAccessToken } from "../auth/tokenStore";

export class PersistenceRequestError extends Error {}

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
  if (response.status === 204) {
    return undefined as T;
  }
  const body = await response.json().catch(() => ({ message: "Unexpected server response." }));
  if (!response.ok) {
    throw new PersistenceRequestError(body?.message ?? "Workspace persistence request failed.");
  }
  return body as T;
}

export function fetchSnapshots(code: string, guestId: string | null): Promise<{ snapshots: WorkspaceSnapshotSummary[] }> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/snapshots`, undefined, guestId);
}

export function createSnapshot(code: string, request: CreateSnapshotRequest, guestId: string | null): Promise<WorkspaceSnapshotSummary> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/snapshots`, { method: "POST", body: JSON.stringify(request) }, guestId);
}

export function renameSnapshot(
  code: string,
  snapshotId: string,
  request: RenameSnapshotRequest,
  guestId: string | null,
): Promise<WorkspaceSnapshotSummary> {
  return requestJson(
    `/api/workspaces/${encodeURIComponent(code)}/snapshots/${encodeURIComponent(snapshotId)}`,
    { method: "PATCH", body: JSON.stringify(request) },
    guestId,
  );
}

export function deleteSnapshot(code: string, snapshotId: string, guestId: string | null): Promise<void> {
  return requestJson(
    `/api/workspaces/${encodeURIComponent(code)}/snapshots/${encodeURIComponent(snapshotId)}`,
    { method: "DELETE" },
    guestId,
  );
}

export function restoreSnapshot(code: string, snapshotId: string, guestId: string | null): Promise<WorkspaceSnapshotSummary> {
  return requestJson(
    `/api/workspaces/${encodeURIComponent(code)}/snapshots/${encodeURIComponent(snapshotId)}/restore`,
    { method: "POST" },
    guestId,
  );
}

export function fetchExport(code: string, guestId: string | null): Promise<WorkspaceExportPayload> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/export`, undefined, guestId);
}

export function importWorkspace(request: ImportWorkspaceRequest, guestId: string | null): Promise<ImportWorkspaceResponse> {
  return requestJson(`/api/workspaces/import`, { method: "POST", body: JSON.stringify(request) }, guestId);
}

export function fetchRecoveryStatus(code: string, guestId: string | null): Promise<WorkspaceRecoveryStatusResponse> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/recovery-status`, undefined, guestId);
}
