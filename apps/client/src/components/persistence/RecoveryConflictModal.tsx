import { Icon, ModalShell, getButtonClasses } from "../common";
import { useWorkspaceLifecycle } from "../../hooks/useWorkspaceLifecycle";

export function RecoveryConflictModal() {
  const { recoveryPrompt, recoveryConflictAt, dismissRecoveryPrompt } = useWorkspaceLifecycle();

  if (!recoveryPrompt || !recoveryConflictAt) {
    return null;
  }

  return (
    <ModalShell
      icon="difference"
      title="Recovery Conflict Detected"
      description="This workspace was updated elsewhere after your last local session ended."
      onClose={dismissRecoveryPrompt}
      maxWidthClassName="max-w-[600px]"
      footer={
        <div className="flex justify-end">
          <button type="button" className={getButtonClasses("primary")} onClick={dismissRecoveryPrompt}>
            Use Latest Workspace
          </button>
        </div>
      }
    >
      <div className="p-lg flex flex-col gap-md">
        <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Version Selection</p>
        <div className="grid grid-cols-2 gap-sm">
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
            <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Local Recovery</p>
            <p className="font-body-sm text-body-sm text-on-surface mt-xs">
              Last seen {new Date(recoveryPrompt.savedAt).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-md">
            <p className="text-label-sm font-label-sm text-primary uppercase tracking-wide">Latest Workspace</p>
            <p className="font-body-sm text-body-sm text-on-surface mt-xs">Saved {new Date(recoveryConflictAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-start gap-sm rounded-lg border border-tertiary/40 bg-tertiary/10 p-md">
          <Icon name="info" size={18} className="text-tertiary flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-on-surface-variant">
            Collaborative sync automatically merges changes, so the live workspace already reflects the latest saved content.
            Use Snapshot Management if you need to recover an earlier version.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
