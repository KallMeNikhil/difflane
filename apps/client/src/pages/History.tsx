import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton, PlaceholderNotice } from "../components/common";
import { SessionHistoryCard, SessionHistoryToolbar, SessionInfoPanel, SessionSummaryModal } from "../components/history";
import { useSessionHistory } from "../hooks/useSessionHistory";
import { buildWorkspacePath } from "../constants/routes";
import type { SessionRecord } from "../types/session";

export default function History() {
  const navigate = useNavigate();
  const { status, visibleRecords, workspaceOptions, filters, updateFilters, sortOrder, setSortOrder, refresh } = useSessionHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summaryRecord, setSummaryRecord] = useState<SessionRecord | null>(null);

  useEffect(() => {
    if (visibleRecords.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!visibleRecords.some((record) => record.id === selectedId)) {
      setSelectedId(visibleRecords[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRecords]);

  const selectedRecord = visibleRecords.find((record) => record.id === selectedId) ?? null;

  function openWorkspace(record: SessionRecord) {
    navigate(buildWorkspacePath(record.roomCode));
  }

  return (
    <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-md h-full">
      <header className="flex-none flex justify-between items-start gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Session History</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Browse, search and revisit previous collaborative review sessions.
          </p>
        </div>
        <IconButton icon="refresh" aria-label="Refresh session history" onClick={() => refresh()} />
      </header>

      <SessionHistoryToolbar
        filters={filters}
        onFiltersChange={updateFilters}
        workspaceOptions={workspaceOptions}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {status === "loading" && (
        <PlaceholderNotice
          icon="hourglass_empty"
          title="Loading Session History"
          description="Fetching your previous collaborative sessions..."
        />
      )}

      {status === "error" && (
        <PlaceholderNotice
          icon="error"
          title="Unable to Load Session History"
          description="Something went wrong while loading your sessions. Use the refresh button above to try again."
        />
      )}

      {status === "ready" && visibleRecords.length === 0 && (
        <PlaceholderNotice
          icon="filter_alt_off"
          title="No Matching Sessions"
          description="Try adjusting your search or filters to find what you're looking for."
        />
      )}

      {status === "ready" && visibleRecords.length > 0 && (
        <div className="flex-1 flex flex-col lg:flex-row gap-md items-start">
          <div className="flex-1 w-full flex flex-col gap-md">
            {visibleRecords.map((record) => (
              <SessionHistoryCard
                key={record.id}
                record={record}
                isSelected={record.id === selectedId}
                onSelect={() => setSelectedId(record.id)}
                onViewSummary={() => setSummaryRecord(record)}
                onOpenWorkspace={() => openWorkspace(record)}
              />
            ))}
          </div>

          {selectedRecord && (
            <SessionInfoPanel
              record={selectedRecord}
              onClose={() => setSelectedId(null)}
              onOpenWorkspace={() => openWorkspace(selectedRecord)}
              onViewSummary={() => setSummaryRecord(selectedRecord)}
            />
          )}
        </div>
      )}

      {summaryRecord && (
        <SessionSummaryModal
          record={summaryRecord}
          onClose={() => setSummaryRecord(null)}
          onOpenWorkspace={() => {
            setSummaryRecord(null);
            openWorkspace(summaryRecord);
          }}
          onOpenHistory={() => setSummaryRecord(null)}
        />
      )}
    </div>
  );
}
