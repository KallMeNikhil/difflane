import { Icon } from "../common";
import { useRoom } from "../../hooks/useRoom";
import { describeConnectionStatus } from "../../services/PresenceService";

const STATUS_DOT_CLASSES: Record<string, string> = {
  connected: "bg-success-mint",
  connecting: "bg-tertiary animate-pulse",
  reconnecting: "bg-tertiary animate-pulse",
  disconnected: "bg-error",
};

export function WorkspaceStatusBar() {
  const { connectionStatus, collaborators, persistenceStatus } = useRoom();
  const status = connectionStatus ?? "connecting";
  const isConnected = status === "connected";

  const syncLabel = !isConnected ? "Syncing..." : persistenceStatus === "failed" ? "Save failed" : persistenceStatus === "saved" ? "Saved" : "Saving...";
  const syncIcon = persistenceStatus === "failed" ? "cloud_off" : "sync";
  const syncColorClass = persistenceStatus === "failed" ? "text-error" : undefined;

  return (
    <footer className="h-[26px] bg-surface-container-lowest border-t border-outline-variant flex items-center px-sm gap-4 text-[11px] font-code text-on-surface-variant flex-shrink-0 z-50">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLASSES[status] ?? STATUS_DOT_CLASSES.disconnected}`} />
        <span>{describeConnectionStatus(status)}</span>
      </div>
      <div className="h-3 w-px bg-outline-variant/50" />
      <div className={`flex items-center gap-1 ${syncColorClass ?? ""}`}>
        <Icon name={syncIcon} size={13} />
        <span>{syncLabel}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Icon name="group" size={13} />
        <span>{collaborators.length} collaborators editing</span>
      </div>
    </footer>
  );
}
