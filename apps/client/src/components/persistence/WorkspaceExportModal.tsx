import { useState } from "react";
import { Icon, ModalShell, getButtonClasses } from "../common";
import { useWorkspaceLifecycle } from "../../hooks/useWorkspaceLifecycle";
import { downloadExportFile } from "../../services/WorkspaceLifecycleService";

const INCLUDED_ITEMS = [
  { icon: "description", label: "Files & folder hierarchy" },
  { icon: "forum", label: "Discussions & comments" },
  { icon: "tune", label: "Workspace settings & metadata" },
  { icon: "hub", label: "Repository connection metadata" },
];

interface WorkspaceExportModalProps {
  workspaceName: string;
  onClose: () => void;
}

export function WorkspaceExportModal({ workspaceName, onClose }: WorkspaceExportModalProps) {
  const { isExporting, exportWorkspace } = useWorkspaceLifecycle();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [didExport, setDidExport] = useState(false);

  async function handleExport() {
    setErrorMessage(null);
    try {
      const payload = await exportWorkspace();
      if (!payload) {
        throw new Error("Export failed.");
      }
      downloadExportFile(payload, workspaceName);
      setDidExport(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not export this workspace.");
    }
  }

  return (
    <ModalShell
      icon="download"
      title="Export Workspace"
      description={`Download a complete, portable copy of "${workspaceName}" as a .difflane package.`}
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-sm">
          <button type="button" className={getButtonClasses("secondary")} onClick={onClose}>
            Close
          </button>
          <button type="button" className={getButtonClasses("primary")} onClick={handleExport} disabled={isExporting}>
            <Icon name="download" size={18} />
            {isExporting ? "Preparing…" : "Export"}
          </button>
        </div>
      }
    >
      <div className="p-lg flex flex-col gap-md">
        <div>
          <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide mb-sm">Included in Export</p>
          <ul className="flex flex-col gap-sm">
            {INCLUDED_ITEMS.map((item) => (
              <li key={item.label} className="flex items-center gap-sm text-body-sm text-on-surface">
                <Icon name={item.icon} size={18} className="text-primary" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        {didExport && (
          <p className="text-body-sm text-success-mint flex items-center gap-1">
            <Icon name="check_circle" size={16} />
            Your workspace package has started downloading.
          </p>
        )}
        {errorMessage && <p className="text-body-sm text-error">{errorMessage}</p>}
      </div>
    </ModalShell>
  );
}
