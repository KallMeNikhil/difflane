import { createContext, useContext } from "react";
import type { NotificationInput } from "../services/NotificationService";
import type { NotificationFilter, NotificationGroup, NotificationRecord } from "../types/notifications";

export type NotificationStatus = "loading" | "ready" | "error";

export interface NotificationsContextValue {
  status: NotificationStatus;
  records: NotificationRecord[];
  unreadCount: number;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  visibleGroups: NotificationGroup[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refresh: () => Promise<void>;
  addNotification: (input: NotificationInput) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
