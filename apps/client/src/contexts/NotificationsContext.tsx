import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createNotificationRecord,
  fetchNotifications,
  filterNotifications,
  getUnreadCount,
  groupNotificationsByDate,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/NotificationService";
import { NotificationsContext, type NotificationsContextValue, type NotificationStatus } from "../hooks/useNotifications";
import type { NotificationFilter, NotificationRecord } from "../types/notifications";

export function NotificationsProvider({ children }: { children: ReactNode }) {
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

  const addNotification = useCallback<NotificationsContextValue["addNotification"]>((input) => {
    setRecords((current) => [createNotificationRecord(input), ...current]);
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      status,
      records,
      unreadCount,
      filter,
      setFilter,
      visibleGroups,
      markAsRead,
      markAllAsRead,
      refresh: load,
      addNotification,
    }),
    [status, records, unreadCount, filter, visibleGroups, markAsRead, markAllAsRead, load, addNotification],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
