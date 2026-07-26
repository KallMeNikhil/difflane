import { Icon } from "../common";
import { getFileIcon, getStatusBadgeLabel } from "../../utils/workspaceDisplay";
import type { OpenEditorTab } from "../../types/workspace";

interface EditorTabsBarProps {
  tabs: OpenEditorTab[];
  activeTabId: string;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
}

export function EditorTabsBar({ tabs, activeTabId, onSelectTab, onCloseTab }: EditorTabsBarProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-stretch h-9 bg-surface-container-lowest border-b border-outline-variant/50 flex-shrink-0 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.fileId === activeTabId;
        return (
          <div
            key={tab.fileId}
            role="button"
            tabIndex={0}
            onClick={() => onSelectTab(tab.fileId)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                onSelectTab(tab.fileId);
              }
            }}
            className={`group flex items-center gap-xs px-md border-r border-outline-variant/50 cursor-pointer font-code text-code whitespace-nowrap flex-shrink-0 ${
              isActive ? "bg-surface text-on-surface border-b-2 border-b-primary -mb-px" : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            <Icon name={getFileIcon(tab.name)} size={14} className={isActive ? "text-secondary" : ""} />
            <span>{tab.name}</span>
            {tab.status !== "unmodified" && (
              <span
                role="img"
                aria-label={`${getStatusBadgeLabel(tab.status)} since baseline`}
                title={`${getStatusBadgeLabel(tab.status)} since baseline — see Changes panel`}
                className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0"
              />
            )}
            <button
              type="button"
              aria-label={`Close ${tab.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onCloseTab(tab.fileId);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-surface-variant rounded p-0.5 transition-opacity"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
