import { Icon } from "../common";
import { SessionStatusPill } from "./SessionStatusPill";
import { formatDateRangeLabel, formatDurationLabel, formatRelativeTimeLabel } from "../../services/SessionHistoryService";
import type { SessionRecord } from "../../types/session";

interface SessionHistoryCardProps {
  record: SessionRecord;
  isSelected: boolean;
  onSelect: () => void;
  onViewSummary: () => void;
  onOpenWorkspace: () => void;
}

function MetaChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-xs bg-surface-container-lowest border border-outline-variant rounded-lg px-sm py-xs text-on-surface-variant font-label-sm text-label-sm">
      <Icon name={icon} size={14} />
      {children}
    </div>
  );
}

export function SessionHistoryCard({ record, isSelected, onSelect, onViewSummary, onOpenWorkspace }: SessionHistoryCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onSelect();
        }
      }}
      className={`bg-surface-container border rounded-xl p-lg hover:border-primary transition-colors cursor-pointer group flex flex-col gap-md relative overflow-hidden ${
        isSelected ? "border-primary" : "border-outline"
      }`}
    >
      <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />

      <div className="flex justify-between items-start gap-md">
        <div>
          <div className="flex items-center gap-xs text-on-surface-variant font-label-sm text-label-sm mb-xs">
            <Icon name="folder_open" size={16} />
            {record.workspace.name}
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">{record.title}</h3>
        </div>
        <SessionStatusPill status={record.status} />
      </div>

      <div className="flex items-center gap-md flex-wrap">
        <MetaChip icon="schedule">{formatDurationLabel(record.startedAt, record.endedAt)}</MetaChip>
        <MetaChip icon="group">
          {record.participants.length} Participant{record.participants.length === 1 ? "" : "s"}
        </MetaChip>
        <MetaChip icon="draft">{record.counts.filesReviewed} Files Reviewed</MetaChip>
        <MetaChip icon="forum">
          {record.counts.discussionsResolved}/{record.counts.discussionsCreated} Resolved
        </MetaChip>
        <MetaChip icon="calendar_today">{formatDateRangeLabel(record.startedAt, record.endedAt)}</MetaChip>
      </div>

      <div className="flex justify-between items-center mt-sm pt-md border-t border-outline-variant">
        <div className="text-on-surface-variant font-label-sm text-label-sm">
          Last active: {formatRelativeTimeLabel(record.lastActivityAt)}
        </div>
        <div className="flex gap-sm" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onViewSummary}
            className="bg-transparent border border-outline text-on-surface px-md py-sm rounded-lg font-label-md text-label-md hover:bg-surface-container-highest transition-colors"
          >
            View Summary
          </button>
          {record.status === "archived" ? (
            <span className="px-sm py-xs rounded text-on-surface-variant bg-surface-container-lowest border border-outline-variant font-label-sm text-label-sm flex items-center justify-center">
              Archived
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="bg-primary-container text-on-primary-container px-md py-sm rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
            >
              Open Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
