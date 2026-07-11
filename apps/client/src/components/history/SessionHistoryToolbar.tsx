import { Icon } from "../common";
import type {
  SessionDateRangeFilter,
  SessionHistoryFilters,
  SessionParticipantFilter,
  SessionSortOrder,
  SessionStatusFilter,
} from "../../types/session";

interface SessionHistoryToolbarProps {
  filters: SessionHistoryFilters;
  onFiltersChange: (patch: Partial<SessionHistoryFilters>) => void;
  workspaceOptions: string[];
  sortOrder: SessionSortOrder;
  onSortOrderChange: (order: SessionSortOrder) => void;
}

const selectClassName =
  "bg-surface-container-high border border-outline rounded-lg px-md py-sm text-on-surface font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none pr-xl cursor-pointer";

export function SessionHistoryToolbar({
  filters,
  onFiltersChange,
  workspaceOptions,
  sortOrder,
  onSortOrderChange,
}: SessionHistoryToolbarProps) {
  return (
    <div className="flex-none py-md flex flex-col sm:flex-row sm:items-center gap-md">
      <div className="relative flex-1 max-w-md">
        <Icon name="search" className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          value={filters.query}
          onChange={(event) => onFiltersChange({ query: event.target.value })}
          placeholder="Search sessions..."
          className="w-full pl-[44px] pr-md py-sm bg-surface-container-high border border-outline rounded-lg text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary font-body-sm text-body-sm transition-colors"
        />
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <label className="sr-only" htmlFor="session-status-filter">
          Status
        </label>
        <select
          id="session-status-filter"
          className={selectClassName}
          value={filters.status}
          onChange={(event) => onFiltersChange({ status: event.target.value as SessionStatusFilter })}
        >
          <option value="all">Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>

        <label className="sr-only" htmlFor="session-workspace-filter">
          Workspace
        </label>
        <select
          id="session-workspace-filter"
          className={selectClassName}
          value={filters.workspaceName}
          onChange={(event) => onFiltersChange({ workspaceName: event.target.value })}
        >
          <option value="all">Workspace</option>
          {workspaceOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="session-date-range-filter">
          Date Range
        </label>
        <select
          id="session-date-range-filter"
          className={selectClassName}
          value={filters.dateRange}
          onChange={(event) => onFiltersChange({ dateRange: event.target.value as SessionDateRangeFilter })}
        >
          <option value="all">Date Range</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="year">This Year</option>
        </select>

        <label className="sr-only" htmlFor="session-participant-filter">
          Participant
        </label>
        <select
          id="session-participant-filter"
          className={selectClassName}
          value={filters.participant}
          onChange={(event) => onFiltersChange({ participant: event.target.value as SessionParticipantFilter })}
        >
          <option value="all">Participant</option>
          <option value="me">Me</option>
        </select>

        <div className="h-6 w-px bg-outline-variant mx-xs" />

        <button
          type="button"
          onClick={() => onSortOrderChange(sortOrder === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-xs px-md py-sm rounded-lg border border-outline bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-body-sm text-body-sm"
        >
          <Icon name="sort" size={18} />
          Sort By: {sortOrder === "newest" ? "Newest" : "Oldest"}
        </button>
      </div>
    </div>
  );
}
