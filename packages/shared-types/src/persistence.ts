export type SnapshotTrigger = "manual" | "before_import" | "before_restore" | "before_destructive";

export interface WorkspaceSnapshotSummary {
  id: string;
  workspaceCode: string;
  label: string;
  trigger: SnapshotTrigger;
  fileCount: number;
  folderCount: number;
  createdAt: string;
  createdBy: { identityType: "user" | "guest"; displayName: string } | null;
}

export interface CreateSnapshotRequest {
  label: string;
}

export interface RenameSnapshotRequest {
  label: string;
}

export interface WorkspaceRecoveryStatusResponse {
  hasPersistedState: boolean;
  lastPersistedAt: string | null;
  fileCount: number;
  folderCount: number;
  unsyncedEditorCount: number;
  repository: { provider: string; owner: string; name: string; branch: string } | null;
}

export interface WorkspaceExportPayload {
  formatVersion: 1;
  exportedAt: string;
  workspace: {
    name: string;
    description: string;
    collaboration: {
      cursorPresence: boolean;
      inlineDiscussions: boolean;
      sharedNavigation: boolean;
    };
  };
  fileSystem: unknown[];
  fileContents: Record<string, string>;
  discussions: unknown[];
  reviews: unknown[];
  fileReviewStatus: unknown[];
  repository: unknown | null;
  sessionHistory: unknown[];
  stats: {
    fileCount: number;
    folderCount: number;
    discussionCount: number;
    reviewCommentCount: number;
  };
}

export interface ImportWorkspaceRequest {
  name: string;
  payload: WorkspaceExportPayload;
}

export interface ImportWorkspaceResponse {
  workspaceCode: string;
  name: string;
}

