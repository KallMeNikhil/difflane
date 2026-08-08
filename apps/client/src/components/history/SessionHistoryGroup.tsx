import { useState } from "react";
import { Icon } from "../common";
import { SessionHistoryCard } from "./SessionHistoryCard";
import type { SessionRecord } from "../../types/session";

interface SessionHistoryGroupProps {
  workspaceName: string;
  roomCode: string;
  records: SessionRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onViewSummary: (record: SessionRecord) => void;
  onOpenWorkspace: (record: SessionRecord) => void;
  defaultExpanded?: boolean;
}

export function SessionHistoryGroup({
  workspaceName,
  roomCode,
  records,
  selectedId,
  onSelect,
  onViewSummary,
  onOpenWorkspace,
  defaultExpanded = true,
}: SessionHistoryGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="flex flex-col gap-sm">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-sm w-full px-sm py-xs rounded-lg hover:bg-surface-container transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-sm min-w-0">
          <Icon name={expanded ? "expand_more" : "chevron_right"} size={18} className="text-on-surface-variant flex-shrink-0" />
          <span className="font-label-md text-label-md text-on-surface truncate">{workspaceName}</span>
          <span className="font-code text-[11px] text-on-surface-variant flex-shrink-0">{roomCode}</span>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant flex-shrink-0">
          {records.length} session{records.length === 1 ? "" : "s"}
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-md pl-md">
          {records.map((record) => (
            <SessionHistoryCard
              key={record.id}
              record={record}
              isSelected={record.id === selectedId}
              onSelect={() => onSelect(record.id)}
              onViewSummary={() => onViewSummary(record)}
              onOpenWorkspace={() => onOpenWorkspace(record)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
