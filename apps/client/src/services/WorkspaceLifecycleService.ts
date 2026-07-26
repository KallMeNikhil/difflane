import type {
  ImportWorkspaceResponse,
  WorkspaceExportPayload,
  WorkspaceRecoveryStatusResponse,
  WorkspaceSnapshotSummary,
} from "@difflane/shared-types";
import * as persistenceClient from "../lib/workspace/persistenceClient";

export function listSnapshots(code: string, guestId: string | null): Promise<WorkspaceSnapshotSummary[]> {
  return persistenceClient.fetchSnapshots(code, guestId).then((result) => result.snapshots);
}

export function createSnapshot(code: string, label: string, guestId: string | null): Promise<WorkspaceSnapshotSummary> {
  return persistenceClient.createSnapshot(code, { label }, guestId);
}

export function renameSnapshot(code: string, snapshotId: string, label: string, guestId: string | null): Promise<WorkspaceSnapshotSummary> {
  return persistenceClient.renameSnapshot(code, snapshotId, { label }, guestId);
}

export function deleteSnapshot(code: string, snapshotId: string, guestId: string | null): Promise<void> {
  return persistenceClient.deleteSnapshot(code, snapshotId, guestId);
}

export function restoreSnapshot(code: string, snapshotId: string, guestId: string | null): Promise<WorkspaceSnapshotSummary> {
  return persistenceClient.restoreSnapshot(code, snapshotId, guestId);
}

export function exportWorkspace(code: string, guestId: string | null): Promise<WorkspaceExportPayload> {
  return persistenceClient.fetchExport(code, guestId);
}

export function importWorkspace(name: string, payload: WorkspaceExportPayload, guestId: string | null): Promise<ImportWorkspaceResponse> {
  return persistenceClient.importWorkspace({ name, payload }, guestId);
}

export function fetchRecoveryStatus(code: string, guestId: string | null): Promise<WorkspaceRecoveryStatusResponse> {
  return persistenceClient.fetchRecoveryStatus(code, guestId);
}

export function downloadExportFile(payload: WorkspaceExportPayload, workspaceName: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const slug = workspaceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "workspace";
  anchor.href = url;
  anchor.download = `${slug}.difflane`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function parseImportFile(file: File): Promise<WorkspaceExportPayload> {
  return file.text().then((text) => {
    const parsed = JSON.parse(text) as WorkspaceExportPayload;
    if (!parsed || parsed.formatVersion !== 1) {
      throw new Error("This file is not a valid Difflane workspace package.");
    }
    return parsed;
  });
}
