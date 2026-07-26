import { Icon, ModalShell, getButtonClasses } from "../common";

interface UnsavedChangesModalProps {
  message: string | null;
  onDismiss: () => void;
}

export function UnsavedChangesModal({ message, onDismiss }: UnsavedChangesModalProps) {
  return (
    <ModalShell
      icon="cloud_off"
      title="Unsaved Changes"
      description="Your latest workspace changes couldn't be saved to the server."
      onClose={onDismiss}
      maxWidthClassName="max-w-[520px]"
      footer={
        <div className="flex justify-end">
          <button type="button" className={getButtonClasses("primary")} onClick={onDismiss}>
            Keep Editing
          </button>
        </div>
      }
    >
      <div className="p-lg flex flex-col gap-md">
        <div className="flex items-start gap-sm rounded-lg border border-error/40 bg-error/10 p-md">
          <Icon name="warning" size={18} className="text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-label-md text-label-md text-on-surface">Unsynchronized changes</p>
            <p className="text-body-sm text-on-surface-variant mt-xs">
              {message ?? "You have local changes that haven't been fully saved yet."} Difflane is automatically retrying — you can
              keep editing safely.
            </p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
