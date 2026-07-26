import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, ModalShell, TextField, getButtonClasses } from "../common";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { importWorkspace as importWorkspaceRequest, parseImportFile } from "../../services/WorkspaceLifecycleService";
import { buildWorkspacePath } from "../../constants/routes";
import type { WorkspaceExportPayload } from "@difflane/shared-types";

interface WorkspaceImportModalProps {
  onClose: () => void;
}

export function WorkspaceImportModal({ onClose }: WorkspaceImportModalProps) {
  const { guestId } = useCurrentUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<WorkspaceExportPayload | null>(null);
  const [name, setName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(file: File | null) {
    setErrorMessage(null);
    setPayload(null);
    setSelectedFile(file);
    if (!file) {
      return;
    }
    try {
      const parsed = await parseImportFile(file);
      setPayload(parsed);
      setName(parsed.workspace.name);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "This file is not a valid Difflane workspace package.");
    }
  }

  async function handleImport() {
    if (!payload) {
      return;
    }
    setErrorMessage(null);
    setIsImporting(true);
    try {
      const result = await importWorkspaceRequest(name.trim() || payload.workspace.name, payload, guestId);
      onClose();
      navigate(buildWorkspacePath(result.workspaceCode));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not import this workspace package.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <ModalShell
      icon="unarchive"
      title="Import Workspace"
      description="Restore a workspace from a previously exported .difflane package into a brand new workspace."
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-sm">
          <button type="button" className={getButtonClasses("secondary")} onClick={onClose} disabled={isImporting}>
            Cancel
          </button>
          <button type="button" className={getButtonClasses("primary")} onClick={handleImport} disabled={!payload || isImporting}>
            {isImporting ? "Importing…" : "Import"}
          </button>
        </div>
      }
    >
      <div className="p-lg flex flex-col gap-md">
        <input
          ref={fileInputRef}
          type="file"
          accept=".difflane,application/json"
          className="hidden"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
        />

        {!selectedFile && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-sm rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low px-lg py-xl text-on-surface-variant hover:border-primary/60 hover:text-on-surface transition-colors"
          >
            <Icon name="terminal" size={32} />
            <p className="font-label-md text-label-md">Choose a .difflane package</p>
            <p className="text-body-sm">Supports .difflane files up to 500MB</p>
          </button>
        )}

        {selectedFile && (
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md flex items-center justify-between gap-md">
            <div className="flex items-center gap-sm min-w-0">
              <Icon name="unarchive" size={20} className="text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Selected Package</p>
                <p className="font-body-sm text-body-sm text-on-surface truncate">{selectedFile.name}</p>
              </div>
            </div>
            <button type="button" className="text-body-sm text-primary flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
              Choose different file
            </button>
          </div>
        )}

        {payload && (
          <TextField label="Workspace name" value={name} onChange={(event) => setName(event.target.value)} required />
        )}

        {errorMessage && <p className="text-body-sm text-error">{errorMessage}</p>}
      </div>
    </ModalShell>
  );
}
