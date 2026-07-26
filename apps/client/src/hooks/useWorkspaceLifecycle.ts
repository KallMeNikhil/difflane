import { createContext, useContext } from "react";
import type { WorkspaceExportPayload, WorkspaceSnapshotSummary } from "@difflane/shared-types";import type { RecoveryMarker } from "../lib/persistence/recoveryCache";

export interface WorkspaceLifecycleContextValue {
  snapshots: WorkspaceSnapshotSummary[];
  isLoadingSnapshots: boolean;
  refreshSnapshots: () => Promise<void>;
  createSnapshot: (label: string) => Promise<void>;
  renameSnapshot: (snapshotId: string, label: string) => Promise<void>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;

  isExporting: boolean;
  exportWorkspace: () => Promise<WorkspaceExportPayload | null>;

  recoveryPrompt: RecoveryMarker | null;
  recoveryConflictAt: string | null;
  dismissRecoveryPrompt: () => void;
  discardRecovery: () => void;
}

export const WorkspaceLifecycleContext = createContext<WorkspaceLifecycleContextValue | undefined>(undefined);

export function useWorkspaceLifecycle(): WorkspaceLifecycleContextValue {
  const context = useContext(WorkspaceLifecycleContext);
  if (!context) {
    throw new Error("useWorkspaceLifecycle must be used within a WorkspaceLifecycleProvider");
  }
  return context;
}
