import { formatRelativeTimeLabel } from "./SessionHistoryService";
import type { NotificationFilter, NotificationGroup, NotificationRecord } from "../types/notifications";

const DAY = 24 * 60 * 60 * 1000;

export interface NotificationInput {
  category: NotificationRecord["category"];
  icon: string;
  tone: NotificationRecord["tone"];
  message: string;
  targetLabel?: string;
  roomCode?: string;
  actorName?: string;
  actorInitials?: string;
  actions?: NotificationRecord["actions"];
}

function generateNotificationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `notification-${crypto.randomUUID()}`
    : `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createNotificationRecord(input: NotificationInput): NotificationRecord {
  return {
    id: generateNotificationId(),
    category: input.category,
    icon: input.icon,
    tone: input.tone,
    actorInitials: input.actorInitials,
    actorName: input.actorName,
    message: input.message,
    targetLabel: input.targetLabel,
    roomCode: input.roomCode,
    createdAt: new Date().toISOString(),
    isRead: false,
    actions: input.actions ?? [],
  };
}

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  return Promise.resolve([]);
}

export function getUnreadCount(records: NotificationRecord[]): number {
  return records.filter((record) => !record.isRead).length;
}

export function filterNotifications(records: NotificationRecord[], filter: NotificationFilter): NotificationRecord[] {
  if (filter === "all") {
    return records;
  }
  if (filter === "unread") {
    return records.filter((record) => !record.isRead);
  }
  return records.filter((record) => record.category === filter);
}

export function markNotificationAsRead(records: NotificationRecord[], id: string): NotificationRecord[] {
  return records.map((record) => (record.id === id ? { ...record, isRead: true } : record));
}

export function markAllNotificationsAsRead(records: NotificationRecord[]): NotificationRecord[] {
  return records.map((record) => ({ ...record, isRead: true }));
}

function groupLabelForDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / DAY);

  if (diffDays <= 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function groupNotificationsByDate(records: NotificationRecord[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const indexByLabel = new Map<string, number>();

  for (const record of records) {
    const label = groupLabelForDate(record.createdAt);
    if (!indexByLabel.has(label)) {
      indexByLabel.set(label, groups.length);
      groups.push({ label, notifications: [] });
    }
    groups[indexByLabel.get(label)!].notifications.push(record);
  }

  return groups;
}

export function formatNotificationTimeLabel(iso: string): string {
  return formatRelativeTimeLabel(iso);
}
