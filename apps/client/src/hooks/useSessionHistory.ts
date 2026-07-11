import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchSessionRecords,
  filterSessionRecords,
  getWorkspaceNameOptions,
  sortSessionRecords,
} from "../services/SessionHistoryService";
import { DEFAULT_SESSION_HISTORY_FILTERS, type SessionHistoryFilters, type SessionRecord, type SessionSortOrder } from "../types/session";

export type SessionHistoryStatus = "loading" | "ready" | "error";

export function useSessionHistory() {
  const [status, setStatus] = useState<SessionHistoryStatus>("loading");
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [filters, setFilters] = useState<SessionHistoryFilters>(DEFAULT_SESSION_HISTORY_FILTERS);
  const [sortOrder, setSortOrder] = useState<SessionSortOrder>("newest");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await fetchSessionRecords();
      setRecords(result);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const workspaceOptions = useMemo(() => getWorkspaceNameOptions(records), [records]);

  const visibleRecords = useMemo(
    () => sortSessionRecords(filterSessionRecords(records, filters), sortOrder),
    [records, filters, sortOrder],
  );

  const updateFilters = useCallback((patch: Partial<SessionHistoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_SESSION_HISTORY_FILTERS);
  }, []);

  return {
    status,
    records,
    visibleRecords,
    workspaceOptions,
    filters,
    updateFilters,
    resetFilters,
    sortOrder,
    setSortOrder,
    refresh: load,
  };
}
