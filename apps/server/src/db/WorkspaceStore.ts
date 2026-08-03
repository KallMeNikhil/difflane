import type {
  SessionHistoryRecord,
  SessionParticipantEntry,
  SnapshotTrigger,
  WorkspaceSnapshotRecord,
  WorkspaceStateRecord,
} from "./models.js";

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

export interface SessionTimelineEventInput {
  actorName: string;
  description: string;
  occurredAt: Date;
}

export interface StartOrTouchSessionInput {
  workspaceId: string;
  roomCode: string;
  fileCount: number;
  folderCount: number;
  participant: SessionParticipantEntry;
  event: SessionTimelineEventInput;
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

  startOrTouchSession(input: StartOrTouchSessionInput): Promise<SessionHistoryRecord>;
  recordSessionEvent(workspaceId: string, roomCode: string, event: SessionTimelineEventInput): Promise<void>;
  completeSession(workspaceId: string, roomCode: string, event: SessionTimelineEventInput): Promise<void>;
  listSessionsForWorkspaceIds(workspaceIds: string[]): Promise<SessionHistoryRecord[]>;
}
