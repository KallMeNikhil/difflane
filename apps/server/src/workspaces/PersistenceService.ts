import { workspaceStore } from "../db/index.js";
import type { SnapshotTrigger, WorkspaceSnapshotRecord, WorkspaceStateRecord } from "../db/models.js";

export interface DocSummary {
  fileCount: number;
  folderCount: number;
}

export type PersistenceIdentity = { userId: string } | { guestId: string } | null;

export async function readState(workspaceId: string): Promise<WorkspaceStateRecord | null> {
  return workspaceStore.getState(workspaceId);
}

export async function writeState(workspaceId: string, stateBytes: Uint8Array, summary: DocSummary): Promise<WorkspaceStateRecord> {
  return workspaceStore.saveState({
    workspaceId,
    stateBytes,
    fileCount: summary.fileCount,
    folderCount: summary.folderCount,
  });
}

export async function writeSnapshot(
  workspaceId: string,
  label: string,
  trigger: SnapshotTrigger,
  stateBytes: Uint8Array,
  summary: DocSummary,
  createdBy: PersistenceIdentity,
): Promise<WorkspaceSnapshotRecord> {
  return workspaceStore.createSnapshot({
    workspaceId,
    label,
    trigger,
    stateBytes,
    fileCount: summary.fileCount,
    folderCount: summary.folderCount,
    createdBy,
  });
}

export async function listSnapshots(workspaceId: string): Promise<WorkspaceSnapshotRecord[]> {
  return workspaceStore.listSnapshots(workspaceId);
}

export async function readSnapshot(workspaceId: string, snapshotId: string): Promise<WorkspaceSnapshotRecord | null> {
  return workspaceStore.findSnapshot(workspaceId, snapshotId);
}

export async function renameSnapshotLabel(workspaceId: string, snapshotId: string, label: string): Promise<WorkspaceSnapshotRecord> {
  return workspaceStore.renameSnapshot(workspaceId, snapshotId, label);
}

export async function removeSnapshot(workspaceId: string, snapshotId: string): Promise<void> {
  await workspaceStore.deleteSnapshot(workspaceId, snapshotId);
}
