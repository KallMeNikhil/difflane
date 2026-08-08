import { Icon } from "../common";
import { useRoom } from "../../hooks/useRoom";
import { describeConnectionStatus } from "../../services/PresenceService";
import { EDITOR_LANGUAGE_OPTIONS, getLanguageLabel } from "../../utils/workspaceDisplay";
import type { EditorLanguage } from "../../types/workspace";

const STATUS_DOT_CLASSES: Record<string, string> = {
  connected: "bg-success-mint",
  connecting: "bg-tertiary animate-pulse",
  reconnecting: "bg-tertiary animate-pulse",
  disconnected: "bg-error",
};

interface WorkspaceStatusBarProps {
  activeFileLanguage?: EditorLanguage;
  onChangeActiveFileLanguage?: (language: EditorLanguage) => void;
  canEditLanguage?: boolean;
}

export function WorkspaceStatusBar({
  activeFileLanguage,
  onChangeActiveFileLanguage,
  canEditLanguage = false,
}: WorkspaceStatusBarProps) {
  const { connectionStatus, collaborators, persistenceStatus } = useRoom();
  const status = connectionStatus ?? "connecting";
  const isConnected = status === "connected";

  const syncLabel = !isConnected ? "Syncing..." : persistenceStatus === "failed" ? "Save failed" : persistenceStatus === "saved" ? "Saved" : "Saving...";
  const syncIcon = persistenceStatus === "failed" ? "cloud_off" : "sync";
  const syncColorClass = persistenceStatus === "failed" ? "text-error" : undefined;

  const typingCount = collaborators.filter((collaborator) => collaborator.activityState === "typing").length;
  const editingCount = collaborators.filter(
    (collaborator) => collaborator.activityState === "typing" || collaborator.activityState === "editing",
  ).length;

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
      {typingCount > 0 && (
        <div className="flex items-center gap-1 text-primary">
          <Icon name="keyboard" size={13} />
          <span>{typingCount} Typing</span>
        </div>
      )}
      {editingCount > 0 && (
        <div className="flex items-center gap-1">
          <Icon name="edit" size={13} />
          <span>{editingCount} Editing</span>
        </div>
      )}
      {activeFileLanguage &&
        (canEditLanguage && onChangeActiveFileLanguage ? (
          <div className="flex items-center gap-1">
            <Icon name="code" size={13} />
            <select
              aria-label="File language"
              value={activeFileLanguage}
              onChange={(event) => onChangeActiveFileLanguage(event.target.value as EditorLanguage)}
              className="bg-transparent text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
            >
              {EDITOR_LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language} className="bg-surface-container-lowest text-on-surface">
                  {getLanguageLabel(language)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Icon name="code" size={13} />
            <span>{getLanguageLabel(activeFileLanguage)}</span>
          </div>
        ))}

      <div className="ml-auto flex items-center gap-1">
        <Icon name="group" size={13} />
        <span>{collaborators.length} Collaborators</span>
      </div>
    </footer>
  );
}
