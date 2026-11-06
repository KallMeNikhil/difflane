import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchSessionRecords,
  filterSessionRecords,
  getWorkspaceNameOptions,
  sortSessionRecords,
} from "../services/SessionHistoryService";
import { DEFAULT_SESSION_HISTORY_FILTERS, type SessionHistoryFilters, type SessionRecord, type SessionSortOrder } from "../types/session";
import { useCurrentUser } from "./useCurrentUser";

export type SessionHistoryStatus = "loading" | "ready" | "error";

export function useSessionHistory() {
  const { status: authStatus, guestId, userId } = useCurrentUser();
  const [status, setStatus] = useState<SessionHistoryStatus>("loading");
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [filters, setFilters] = useState<SessionHistoryFilters>(DEFAULT_SESSION_HISTORY_FILTERS);
  const [sortOrder, setSortOrder] = useState<SessionSortOrder>("newest");
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    if (authStatus === "loading") {
      return;
    }
    try {
      const result = await fetchSessionRecords(authStatus === "authenticated" ? null : guestId);
      if (requestId !== requestIdRef.current) return;
      setRecords(result);
      setStatus("ready");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setStatus("error");
    }
  }, [authStatus, guestId]);

  useEffect(() => {
    setRecords([]);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, userId]);

  const workspaceOptions = useMemo(() => getWorkspaceNameOptions(records), [records]);

  const visibleRecords = useMemo(
    () => sortSessionRecords(filterSessionRecords(records, filters, userId), sortOrder),
    [records, filters, sortOrder, userId],
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
