import { useState } from "react";
import { Icon, ModalShell, getButtonClasses } from "../common";
import { useWorkspaceLifecycle } from "../../hooks/useWorkspaceLifecycle";
import type { WorkspaceSnapshotSummary } from "@difflane/shared-types";

interface RestoreWorkspaceModalProps {
  snapshot: WorkspaceSnapshotSummary;
  onClose: () => void;
  onRestored: () => void;
}

export function RestoreWorkspaceModal({ snapshot, onClose, onRestored }: RestoreWorkspaceModalProps) {
  const { restoreSnapshot } = useWorkspaceLifecycle();
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRestore() {
    setIsRestoring(true);
    setErrorMessage(null);
    try {
      await restoreSnapshot(snapshot.id);
      onRestored();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not restore this snapshot.");
      setIsRestoring(false);
    }
  }

  return (
    <ModalShell
      icon="settings_backup_restore"
      title="Restore Workspace"
      description="Restoring replaces the active workspace with this snapshot. A safety snapshot of the current state is taken automatically first."
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-sm">
          <button type="button" className={getButtonClasses("secondary")} onClick={onClose} disabled={isRestoring}>
            Cancel
          </button>
          <button type="button" className={getButtonClasses("primary")} onClick={handleRestore} disabled={isRestoring}>
            {isRestoring ? "Restoring…" : "Restore"}
          </button>
        </div>
      }
    >
      <div className="p-lg flex flex-col gap-md">
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
          <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide mb-xs">Snapshot Details</p>
          <p className="font-label-md text-label-md text-on-surface">{snapshot.label}</p>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            {snapshot.fileCount} files · {snapshot.folderCount} folders · Captured {new Date(snapshot.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-start gap-sm rounded-lg border border-tertiary/40 bg-tertiary/10 p-md">
          <Icon name="info" size={18} className="text-tertiary flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-on-surface-variant">
            Every connected collaborator will see the workspace resync to this snapshot's content.
          </p>
        </div>
        {errorMessage && <p className="text-body-sm text-error">{errorMessage}</p>}
      </div>
    </ModalShell>
  );
}
