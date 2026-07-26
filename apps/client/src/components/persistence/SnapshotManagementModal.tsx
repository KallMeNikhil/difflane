import { useEffect, useState } from "react";
import { Icon, IconButton, ModalShell, TextField, getButtonClasses } from "../common";
import { useWorkspaceLifecycle } from "../../hooks/useWorkspaceLifecycle";
import type { WorkspaceSnapshotSummary } from "@difflane/shared-types";

const TRIGGER_LABELS: Record<WorkspaceSnapshotSummary["trigger"], string> = {
  manual: "Manual",
  before_import: "Pre-Import",
  before_restore: "Pre-Restore",
  before_destructive: "Safety",
};

interface SnapshotManagementModalProps {
  onClose: () => void;
  onRequestRestore: (snapshot: WorkspaceSnapshotSummary) => void;
}

export function SnapshotManagementModal({ onClose, onRequestRestore }: SnapshotManagementModalProps) {
  const { snapshots, isLoadingSnapshots, refreshSnapshots, createSnapshot, renameSnapshot, deleteSnapshot } = useWorkspaceLifecycle();
  const [search, setSearch] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  const filtered = snapshots.filter((snapshot) => snapshot.label.toLowerCase().includes(search.toLowerCase()));

  async function handleCreate() {
    if (!newLabel.trim() || isCreating) {
      return;
    }
    setIsCreating(true);
    try {
      await createSnapshot(newLabel.trim());
      setNewLabel("");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRenameSubmit(snapshotId: string) {
    if (renameValue.trim()) {
      await renameSnapshot(snapshotId, renameValue.trim());
    }
    setRenamingId(null);
  }

  return (
    <ModalShell
      icon="history_toggle_off"
      title="Snapshot Management"
      description="Create manual checkpoints and restore your workspace to any saved point in time."
      onClose={onClose}
      maxWidthClassName="max-w-[680px]"
      footer={
        <div className="flex justify-end">
          <button type="button" className={getButtonClasses("secondary")} onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="p-lg flex flex-col gap-md">
        <div className="flex gap-sm">
          <div className="flex-1">
            <TextField
              label="Search snapshots"
              hideLabel
              placeholder="Search snapshots..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex-1 flex gap-sm">
            <TextField
              label="New snapshot label"
              hideLabel
              placeholder="Label this snapshot..."
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleCreate()}
            />
            <button
              type="button"
              className={getButtonClasses("primary", "md", "flex-shrink-0")}
              onClick={handleCreate}
              disabled={isCreating || !newLabel.trim()}
            >
              <Icon name="add" size={18} />
              Create
            </button>
          </div>
        </div>

        {isLoadingSnapshots && <p className="text-body-sm text-on-surface-variant">Loading snapshots…</p>}

        {!isLoadingSnapshots && filtered.length === 0 && (
          <div className="py-xl text-center text-on-surface-variant">
            <Icon name="history_toggle_off" size={28} />
            <p className="mt-sm font-body-sm">No snapshots yet. Create one to checkpoint this workspace.</p>
          </div>
        )}

        <ul className="flex flex-col gap-sm">
          {filtered.map((snapshot) => (
            <li
              key={snapshot.id}
              className="flex items-center justify-between gap-md rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm"
            >
              <div className="min-w-0 flex-1">
                {renamingId === snapshot.id ? (
                  <input
                    autoFocus
                    className="w-full bg-surface-container-high border border-outline rounded-md px-sm py-1 text-body-sm text-on-surface outline-none"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={() => handleRenameSubmit(snapshot.id)}
                    onKeyDown={(event) => event.key === "Enter" && handleRenameSubmit(snapshot.id)}
                  />
                ) : (
                  <p className="font-label-md text-label-md text-on-surface truncate">{snapshot.label}</p>
                )}
                <p className="text-body-sm text-on-surface-variant">
                  {TRIGGER_LABELS[snapshot.trigger]} · {snapshot.fileCount} files · {snapshot.folderCount} folders ·{" "}
                  {new Date(snapshot.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <IconButton
                  icon="settings_backup_restore"
                  aria-label={`Restore ${snapshot.label}`}
                  onClick={() => onRequestRestore(snapshot)}
                />
                <IconButton
                  icon="edit"
                  aria-label={`Rename ${snapshot.label}`}
                  onClick={() => {
                    setRenamingId(snapshot.id);
                    setRenameValue(snapshot.label);
                  }}
                />
                <IconButton icon="delete" aria-label={`Delete ${snapshot.label}`} onClick={() => deleteSnapshot(snapshot.id)} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </ModalShell>
  );
}
