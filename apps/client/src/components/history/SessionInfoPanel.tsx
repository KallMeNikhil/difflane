import { Icon, IconButton } from "../common";
import { formatDateTimeLabel, formatDurationLabel, formatRelativeTimeLabel } from "../../services/SessionHistoryService";
import type { SessionRecord } from "../../types/session";

interface SessionInfoPanelProps {
  record: SessionRecord;
  onClose: () => void;
  onOpenWorkspace: () => void;
  onViewSummary: () => void;
}

const STATUS_TEXT_CLASSNAME: Record<SessionRecord["status"], string> = {
  active: "text-primary",
  completed: "text-success-mint",
  archived: "text-on-surface-variant",
};

const STATUS_LABEL: Record<SessionRecord["status"], string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

function MetaRow({ label, value, valueClassName = "text-on-surface" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex justify-between items-center gap-md">
      <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
      <span className={`font-body-sm text-body-sm text-right ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function SessionInfoPanel({ record, onClose, onOpenWorkspace, onViewSummary }: SessionInfoPanelProps) {
  return (
    <div className="w-full sm:w-96 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col shrink-0 overflow-y-auto max-h-[calc(100vh-260px)] sticky top-0">
      <div className="p-lg border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-headline-md text-headline-md text-on-surface">Session Information</h3>
        <IconButton icon="close" aria-label="Close session details" onClick={onClose} />
      </div>
      <div className="p-lg flex flex-col gap-lg">
        <div className="flex flex-col gap-sm">
          {record.status !== "archived" && (
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="w-full bg-primary-container text-on-primary-container py-sm rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity flex justify-center items-center gap-xs"
            >
              Open Workspace
            </button>
          )}
          <button
            type="button"
            onClick={onViewSummary}
            className="w-full bg-transparent border border-outline text-on-surface py-sm rounded-lg font-label-md text-label-md hover:bg-surface-container-highest transition-colors flex justify-center items-center gap-xs"
          >
            <Icon name="summarize" size={18} />
            View Summary
          </button>
        </div>

        <div>
          <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sm border-b border-outline-variant pb-xs">
            Metadata
          </h4>
          <div className="flex flex-col gap-sm mt-sm">
            <MetaRow label="Workspace" value={record.workspace.name} />
            <MetaRow label="Session Status" value={STATUS_LABEL[record.status]} valueClassName={STATUS_TEXT_CLASSNAME[record.status]} />
            <MetaRow label="Started" value={formatDateTimeLabel(record.startedAt)} />
            <MetaRow label="Ended" value={record.endedAt ? formatDateTimeLabel(record.endedAt) : "-"} />
            <MetaRow label="Duration" value={formatDurationLabel(record.startedAt, record.endedAt)} />
            <MetaRow label="Files Reviewed" value={String(record.counts.filesReviewed)} />
            <MetaRow label="Discussions Created" value={String(record.counts.discussionsCreated)} />
            <MetaRow label="Discussions Resolved" value={String(record.counts.discussionsResolved)} />
            <MetaRow label="Participants" value={String(record.participants.length)} />
            <MetaRow
              label="Repository Source"
              value={record.repository ? `${record.repository.owner}/${record.repository.name}` : "Not connected"}
            />
            <MetaRow label="Last Activity" value={formatRelativeTimeLabel(record.lastActivityAt)} />
          </div>
        </div>
      </div>
    </div>
  );
}
