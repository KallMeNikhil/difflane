import type {
  CreateSnapshotRequest,
  ImportWorkspaceRequest,
  ImportWorkspaceResponse,
  RenameSnapshotRequest,
  WorkspaceExportPayload,
  WorkspaceRecoveryStatusResponse,
  WorkspaceSnapshotSummary,
} from "@difflane/shared-types";
import { apiRequest } from "../http/apiRequest";

function requestJson<T>(path: string, init: RequestInit | undefined, guestId: string | null, timeoutMs?: number): Promise<T> {
  return apiRequest<T>(path, init, { guestId, timeoutMs });
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
  return requestJson(`/api/workspaces/import`, { method: "POST", body: JSON.stringify(request) }, guestId, 120_000);
}

export function fetchRecoveryStatus(code: string, guestId: string | null): Promise<WorkspaceRecoveryStatusResponse> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/recovery-status`, undefined, guestId);
}
