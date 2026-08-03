import { useEffect, useState } from "react";
import { Icon, IconButton, Button } from "../common";
import { useRoom } from "../../hooks/useRoom";
import { useRepositoryInfo } from "../../hooks/useRepositoryInfo";
import { useWorkspaceMetadata } from "../../hooks/useWorkspaceMetadata";
import { useWorkspaceLifecycle } from "../../hooks/useWorkspaceLifecycle";
import { useModalDialog } from "../../hooks/useModalDialog";
import { SnapshotManagementModal, WorkspaceExportModal, RestoreWorkspaceModal } from "../persistence";
import {
  writeWorkspaceCollaborationPreference,
  writeWorkspaceDescription,
  writeWorkspaceName,
} from "../../services/WorkspaceFileSystemService";
import { getImportSourceLabel, getRelativeTimeLabel } from "../../utils/workspaceDisplay";
import type { WorkspaceCollaborationPreferences } from "../../types/workspace";
import type { WorkspaceSnapshotSummary } from "@difflane/shared-types";

interface WorkspaceSettingsModalProps {
  onClose: () => void;
}

type WorkspaceSettingsSection = "general" | "collaboration" | "persistence";

const NAV_ITEMS: { id: WorkspaceSettingsSection; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "tune" },
  { id: "collaboration", label: "Collaboration", icon: "group" },
  { id: "persistence", label: "Persistence & Recovery", icon: "cloud_sync" },
];

const COLLABORATION_TOGGLES: { key: keyof WorkspaceCollaborationPreferences; label: string; description: string }[] = [
  {
    key: "cursorPresence",
    label: "Live cursor presence",
    description: "Show collaborator cursors inside the editor.",
  },
  {
    key: "inlineDiscussions",
    label: "Inline discussions",
    description: "Allow collaborators to leave discussion threads on code.",
  },
  {
    key: "sharedNavigation",
    label: "Shared navigation",
    description: "Keep collaborators viewing the same active file.",
  },
];

export function WorkspaceSettingsModal({ onClose }: WorkspaceSettingsModalProps) {
  const { roomCode, doc, persistenceStatus, lastPersistedAt } = useRoom();
  const repositoryInfo = useRepositoryInfo(doc);
  const metadata = useWorkspaceMetadata(doc);
  const { snapshots, refreshSnapshots } = useWorkspaceLifecycle();
  const [section, setSection] = useState<WorkspaceSettingsSection>("general");
  const [copied, setCopied] = useState(false);
  const [isSnapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<WorkspaceSnapshotSummary | null>(null);
  const dialogRef = useModalDialog<HTMLDivElement>(onClose);

  useEffect(() => {
    if (section === "persistence") {
      void refreshSnapshots();
    }
  }, [section, refreshSnapshots]);

  function handleNameChange(value: string) {
    if (doc) {
      writeWorkspaceName(doc, value);
    }
  }

  function handleDescriptionChange(value: string) {
    if (doc) {
      writeWorkspaceDescription(doc, value);
    }
  }

  function handleCollaborationToggle(key: keyof WorkspaceCollaborationPreferences, value: boolean) {
    if (doc) {
      writeWorkspaceCollaborationPreference(doc, key, value);
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied; the field remains selectable for manual copy.
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-settings-title"
        tabIndex={-1}
        className="relative w-full max-w-[860px] bg-surface rounded-xl border border-outline-variant shadow-2xl flex flex-col max-h-[90vh] overflow-hidden outline-none"
      >
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant bg-surface-container-low shrink-0">
          <h2 id="workspace-settings-title" className="font-headline-md text-headline-md text-on-surface">Workspace Settings</h2>
          <IconButton icon="close" aria-label="Close" shape="square" onClick={onClose} />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-[220px] shrink-0 bg-surface-container-low border-r border-outline-variant p-md flex flex-col gap-xs overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-sm px-md py-sm rounded-lg font-label-md text-label-md text-left transition-colors ${
                  section === item.id
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
                }`}
              >
                <Icon name={item.icon} size={18} filled={section === item.id} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 p-xl overflow-y-auto">
            <div className="max-w-[500px] flex flex-col gap-xl">
              {section === "general" && (
                <>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">General</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Manage the core identity and details of this Workspace.
                    </p>
                  </div>

                  <div className="flex flex-col gap-lg">
                    <div>
                      <label htmlFor="workspace-name" className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
                        Workspace Name
                      </label>
                      <input
                        id="workspace-name"
                        type="text"
                        value={metadata.name}
                        onChange={(event) => handleNameChange(event.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant text-on-surface rounded-lg px-md py-sm font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="workspace-description" className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
                        Description
                      </label>
                      <textarea
                        id="workspace-description"
                        rows={3}
                        value={metadata.description}
                        onChange={(event) => handleDescriptionChange(event.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant text-on-surface rounded-lg px-md py-sm font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
                      />
                    </div>

                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-md flex flex-col gap-xs">
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Repository</p>
                      {repositoryInfo ? (
                        <div className="flex items-center justify-between">
                          <span className="font-body-sm text-body-sm text-on-surface">
                            {getImportSourceLabel(repositoryInfo.provider)}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            Last synced {getRelativeTimeLabel(repositoryInfo.lastSyncedAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-body-sm text-body-sm text-on-surface-variant">No repository connected.</span>
                      )}
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
                        Workspace Code
                      </label>
                      <div className="flex items-center">
                        <input
                          readOnly
                          type="text"
                          value={roomCode}
                          className="font-code text-code w-full bg-surface-dim border border-outline-variant rounded-l-lg py-2 px-3 text-on-surface-variant cursor-not-allowed focus:outline-none"
                        />
                        <button
                          type="button"
                          title="Copy Code"
                          onClick={handleCopyCode}
                          className="bg-surface-variant border-y border-r border-outline-variant rounded-r-lg p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors"
                        >
                          <Icon name={copied ? "check" : "content_copy"} size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {section === "collaboration" && (
                <>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Collaboration</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Configure how collaborators interact inside this Workspace.
                    </p>
                  </div>

                  <div className="flex flex-col gap-md">
                    {COLLABORATION_TOGGLES.map((toggle) => (
                      <div key={toggle.key} className="flex items-start justify-between gap-md py-sm">
                        <div className="flex-1">
                          <p className="font-label-md text-label-md text-on-surface">{toggle.label}</p>
                          <p className="text-[12px] text-on-surface-variant">{toggle.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={metadata.collaboration[toggle.key]}
                            onChange={(event) => handleCollaborationToggle(toggle.key, event.target.checked)}
                            aria-label={toggle.label}
                          />
                          <div className="w-10 h-6 bg-surface-variant rounded-full peer peer-checked:bg-primary transition-colors relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-on-surface-variant peer-checked:after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {section === "persistence" && (
                <>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Persistence & Recovery</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      This Workspace saves continuously. Create checkpoints or export a portable copy at any time.
                    </p>
                  </div>

                  <div className="flex flex-col gap-md">
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-md flex items-center justify-between gap-md">
                      <div className="flex items-center gap-sm">
                        <Icon
                          name={persistenceStatus === "failed" ? "cloud_off" : "cloud_done"}
                          size={20}
                          className={persistenceStatus === "failed" ? "text-error" : "text-success-mint"}
                        />
                        <div>
                          <p className="font-label-md text-label-md text-on-surface">
                            {persistenceStatus === "failed" ? "Save failed — retrying" : "Autosave Active"}
                          </p>
                          <p className="text-[12px] text-on-surface-variant">
                            {lastPersistedAt ? `Last saved ${getRelativeTimeLabel(lastPersistedAt)}` : "Waiting for first save…"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSnapshotModalOpen(true)}
                      className="flex items-center justify-between gap-md rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm hover:border-primary/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-sm">
                        <Icon name="history_toggle_off" size={20} className="text-primary" />
                        <div>
                          <p className="font-label-md text-label-md text-on-surface">Snapshot Management</p>
                          <p className="text-[12px] text-on-surface-variant">{snapshots.length} saved checkpoints</p>
                        </div>
                      </div>
                      <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportModalOpen(true)}
                      className="flex items-center justify-between gap-md rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm hover:border-primary/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-sm">
                        <Icon name="download" size={20} className="text-primary" />
                        <div>
                          <p className="font-label-md text-label-md text-on-surface">Export Workspace</p>
                          <p className="text-[12px] text-on-surface-variant">Download a complete portable copy</p>
                        </div>
                      </div>
                      <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-lg py-md border-t border-outline-variant bg-surface-container-lowest shrink-0">
          <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-xs">
            <Icon name={persistenceStatus === "failed" ? "cloud_off" : "cloud_done"} size={16} />
            {persistenceStatus === "failed" ? "Retrying save…" : "Changes are saved automatically."}
          </span>
          <div className="flex items-center gap-sm">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="md" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>

      {isSnapshotModalOpen && (
        <SnapshotManagementModal
          onClose={() => setSnapshotModalOpen(false)}
          onRequestRestore={(snapshot) => setRestoreTarget(snapshot)}
        />
      )}
      {isExportModalOpen && <WorkspaceExportModal workspaceName={metadata.name} onClose={() => setExportModalOpen(false)} />}
      {restoreTarget && (
        <RestoreWorkspaceModal
          snapshot={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onRestored={() => {
            setRestoreTarget(null);
            setSnapshotModalOpen(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
