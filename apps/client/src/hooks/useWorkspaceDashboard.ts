import { useCallback, useEffect, useState } from "react";
import type { WorkspaceDashboardResponse } from "@difflane/shared-types";
import * as AuthService from "../services/AuthService";
import { useCurrentUser } from "./useCurrentUser";

const EMPTY_DASHBOARD: WorkspaceDashboardResponse = { created: [], joined: [], recent: [], pinned: [], archived: [] };

export function useWorkspaceDashboard() {
  const { status, guestId } = useCurrentUser();
  const [dashboard, setDashboard] = useState<WorkspaceDashboardResponse>(EMPTY_DASHBOARD);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (status === "loading") return;
    setLoading(true);
    setError(null);
    try {
      const result = await AuthService.fetchDashboard(status === "authenticated" ? null : guestId);
      setDashboard(result);
    } catch {
      setError("Unable to load your workspaces right now.");
    } finally {
      setLoading(false);
    }
  }, [status, guestId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dashboard, isLoading, error, refresh };
}
