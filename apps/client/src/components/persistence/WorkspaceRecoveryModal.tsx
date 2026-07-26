import { Icon, ModalShell, getButtonClasses } from "../common";
import { useWorkspaceLifecycle } from "../../hooks/useWorkspaceLifecycle";

export function WorkspaceRecoveryModal() {
  const { recoveryPrompt, recoveryConflictAt, dismissRecoveryPrompt } = useWorkspaceLifecycle();

  if (!recoveryPrompt || recoveryConflictAt) {
    return null;
  }

  return (
    <ModalShell
      icon="restore"
      title="Workspace Recovery"
      description="Your last session in this workspace ended before your changes were confirmed saved."
      onClose={dismissRecoveryPrompt}
      maxWidthClassName="max-w-[520px]"
      footer={
        <div className="flex justify-end">
          <button type="button" className={getButtonClasses("primary")} onClick={dismissRecoveryPrompt}>
            Continue to Workspace
          </button>
        </div>
      }
    >
      <div className="p-lg flex flex-col gap-md">
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
          <p className="font-label-md text-label-md text-on-surface">{recoveryPrompt.workspaceName}</p>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            {recoveryPrompt.fileCount} files · {recoveryPrompt.folderCount} folders · last seen{" "}
            {new Date(recoveryPrompt.savedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-start gap-sm rounded-lg border border-tertiary/40 bg-tertiary/10 p-md">
          <Icon name="info" size={18} className="text-tertiary flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-on-surface-variant">
            Real-time sync has already merged any pending edits into the live workspace, so nothing further is required — this is
            just a heads up. You can review Snapshot Management in Workspace Settings for saved checkpoints at any time.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
