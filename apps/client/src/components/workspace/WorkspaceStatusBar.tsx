import { Icon } from "../common";
import { DISCUSSION_STATUS_BAR_TYPING_LABEL } from "../../constants/mockDiscussionThreads";

interface WorkspaceStatusBarProps {
  latencyMs: number;
  collaboratorsEditingCount: number;
}

export function WorkspaceStatusBar({ latencyMs, collaboratorsEditingCount }: WorkspaceStatusBarProps) {
  return (
    <footer className="h-[26px] bg-surface-container-lowest border-t border-outline-variant flex items-center px-sm gap-4 text-[11px] font-code text-on-surface-variant flex-shrink-0 z-50">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success-mint" />
        <span>Connected</span>
      </div>
      <div className="h-3 w-px bg-outline-variant/50" />
      <div className="flex items-center gap-1">
        <Icon name="sync" size={13} />
        <span>Synced</span>
      </div>
      <div className="h-3 w-px bg-outline-variant/50" />
      <span>{latencyMs}ms</span>
      <div className="h-3 w-px bg-outline-variant/50" />
      <span className="italic text-primary/80">{DISCUSSION_STATUS_BAR_TYPING_LABEL}</span>
      <div className="ml-auto flex items-center gap-1">
        <Icon name="group" size={13} />
        <span>{collaboratorsEditingCount} collaborators editing</span>
      </div>
    </footer>
  );
}
