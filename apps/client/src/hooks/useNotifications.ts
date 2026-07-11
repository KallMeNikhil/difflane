import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchNotifications,
  filterNotifications,
  getUnreadCount,
  groupNotificationsByDate,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/NotificationService";
import type { NotificationFilter, NotificationRecord } from "../types/notifications";

export type NotificationStatus = "loading" | "ready" | "error";

export function useNotifications() {
  const [status, setStatus] = useState<NotificationStatus>("loading");
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await fetchNotifications();
      setRecords(result);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(() => getUnreadCount(records), [records]);

  const visibleGroups = useMemo(
    () => groupNotificationsByDate(filterNotifications(records, filter)),
    [records, filter],
  );

  const markAsRead = useCallback((id: string) => {
    setRecords((current) => markNotificationAsRead(current, id));
  }, []);

  const markAllAsRead = useCallback(() => {
    setRecords((current) => markAllNotificationsAsRead(current));
  }, []);

  return {
    status,
    records,
    unreadCount,
    filter,
    setFilter,
    visibleGroups,
    markAsRead,
    markAllAsRead,
    refresh: load,
  };
}
