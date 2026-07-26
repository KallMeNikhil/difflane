import type { SnapshotTrigger, WorkspaceSnapshotRecord, WorkspaceStateRecord } from "./models.js";

export interface SaveStateInput {
  workspaceId: string;
  stateBytes: Uint8Array;
  fileCount: number;
  folderCount: number;
}

export interface CreateSnapshotInput {
  workspaceId: string;
  label: string;
  trigger: SnapshotTrigger;
  stateBytes: Uint8Array;
  fileCount: number;
  folderCount: number;
  createdBy: { userId: string } | { guestId: string } | null;
}

export interface WorkspaceStore {
  getState(workspaceId: string): Promise<WorkspaceStateRecord | null>;
  saveState(input: SaveStateInput): Promise<WorkspaceStateRecord>;
  deleteState(workspaceId: string): Promise<void>;

  createSnapshot(input: CreateSnapshotInput): Promise<WorkspaceSnapshotRecord>;
  listSnapshots(workspaceId: string): Promise<WorkspaceSnapshotRecord[]>;
  findSnapshot(workspaceId: string, snapshotId: string): Promise<WorkspaceSnapshotRecord | null>;
  renameSnapshot(workspaceId: string, snapshotId: string, label: string): Promise<WorkspaceSnapshotRecord>;
  deleteSnapshot(workspaceId: string, snapshotId: string): Promise<void>;
}
