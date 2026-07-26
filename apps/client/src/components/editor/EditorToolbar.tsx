import { Icon } from "../common";
import type { ReactNode } from "react";
import type { DiffViewMode } from "../../types/workspace";

interface EditorToolbarProps {
  breadcrumb: string[];
  activeFileName: string;
  statusLabel?: string;
  diffViewMode?: DiffViewMode;
  onChangeDiffViewMode?: (mode: DiffViewMode) => void;
  rightSlot?: ReactNode;
}

export function EditorToolbar({
  breadcrumb,
  activeFileName,
  statusLabel,
  diffViewMode,
  onChangeDiffViewMode,
  rightSlot,
}: EditorToolbarProps) {
  const isDiffMode = diffViewMode !== undefined && onChangeDiffViewMode !== undefined;

  return (
    <div className="h-10 px-md flex items-center justify-between border-b border-outline-variant/50 bg-surface-container-lowest flex-shrink-0">
      <div className="flex items-center gap-xs text-on-surface-variant font-code text-code text-[12px]">
        {breadcrumb.map((segment, index) => (
          <span key={`${segment}-${index}`} className="flex items-center gap-xs">
            {index > 0 && <Icon name="chevron_right" size={14} />}
            {index === breadcrumb.length - 1 ? (
              <span className="text-on-surface font-medium flex items-center gap-xs">
                <Icon name="data_object" size={14} className="text-primary" />
                {activeFileName}
              </span>
            ) : (
              <span className="hover:text-primary cursor-pointer transition-colors">{segment}</span>
            )}
          </span>
        ))}
        {statusLabel && (
          <span className="ml-sm px-2 py-0.5 rounded-full bg-secondary-container/10 text-secondary border border-outline-variant/30 font-label-sm text-[9px] tracking-widest">
            {statusLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-sm">
        <button
          type="button"
          title={isDiffMode ? "Unified View" : "Format Document"}
          onClick={isDiffMode ? () => onChangeDiffViewMode!("unified") : undefined}
          className={`p-1 rounded transition-colors ${
            isDiffMode && diffViewMode === "unified"
              ? "text-primary bg-primary-container/10"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
          }`}
        >
          <Icon name="format_align_left" size={18} />
        </button>
        <button
          type="button"
          title={isDiffMode ? "Split View" : "Split Editor"}
          onClick={isDiffMode ? () => onChangeDiffViewMode!("split") : undefined}
          className={`p-1 rounded transition-colors ${
            isDiffMode && diffViewMode === "split"
              ? "text-primary bg-primary-container/10"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
          }`}
        >
          <Icon name="splitscreen" size={18} />
        </button>
        {rightSlot}
      </div>
    </div>
  );
}
