import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceDashboardResponse } from "@difflane/shared-types";
import * as AuthService from "../services/AuthService";
import { useCurrentUser } from "./useCurrentUser";

const EMPTY_DASHBOARD: WorkspaceDashboardResponse = { created: [], joined: [], recent: [], pinned: [], archived: [], all: [] };

export function useWorkspaceDashboard() {
  const { status, guestId, userId } = useCurrentUser();
  const [dashboard, setDashboard] = useState<WorkspaceDashboardResponse>(EMPTY_DASHBOARD);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (status === "loading") return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await AuthService.fetchDashboard(status === "authenticated" ? null : guestId);
      if (requestId !== requestIdRef.current) return;
      setDashboard(result);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("Unable to load your workspaces right now.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [status, guestId]);

  useEffect(() => {
    setDashboard(EMPTY_DASHBOARD);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, userId]);

  return { dashboard, isLoading, error, refresh };
}
