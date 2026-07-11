import { formatRelativeTimeLabel } from "./SessionHistoryService";
import type { NotificationFilter, NotificationGroup, NotificationRecord } from "../types/notifications";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

const NOTIFICATION_RECORDS: NotificationRecord[] = [
  {
    id: "notification-invite",
    category: "workspace",
    icon: "grid_view",
    tone: "accent",
    actorInitials: "L",
    actorName: "Lead Architect",
    message: "invited you to",
    targetLabel: "Frontend Core Migration",
    roomCode: "auth-review",
    createdAt: minutesAgo(10),
    isRead: false,
    actions: [
      { id: "accept", label: "Accept", kind: "accept", emphasis: "primary" },
      { id: "decline", label: "Decline", kind: "decline", emphasis: "secondary" },
    ],
  },
  {
    id: "notification-mention",
    category: "mentions",
    icon: "alternate_email",
    tone: "accent",
    actorInitials: "F",
    actorName: "Frontend Engineer",
    message: "mentioned you in",
    targetLabel: "PR #142",
    quote: "Can you review the new auth flow logic here?",
    roomCode: "auth-review",
    createdAt: hoursAgo(2),
    isRead: false,
    actions: [{ id: "open-discussion", label: "Open Discussion", kind: "openDiscussion", emphasis: "secondary" }],
  },
  {
    id: "notification-discussion-resolved",
    category: "discussions",
    icon: "forum",
    tone: "accent",
    actorInitials: "B",
    actorName: "Backend Engineer",
    message: "resolved a discussion in",
    targetLabel: "Rate Limiting Implementation",
    roomCode: "rate-limiting",
    createdAt: hoursAgo(5),
    isRead: false,
    actions: [{ id: "open-discussion", label: "Open Discussion", kind: "openDiscussion", emphasis: "secondary" }],
  },
  {
    id: "notification-import",
    category: "system",
    icon: "check_circle",
    tone: "success",
    message: "Import successful:",
    targetLabel: "difflane-api",
    roomCode: "auth-review",
    createdAt: daysAgo(1),
    isRead: true,
    actions: [{ id: "open-explorer", label: "Go to Explorer", kind: "openExplorer", emphasis: "secondary" }],
  },
  {
    id: "notification-sync-warning",
    category: "system",
    icon: "sync_problem",
    tone: "warning",
    message: "Repository sync delayed for",
    targetLabel: "webapp",
    createdAt: daysAgo(2),
    isRead: true,
    actions: [],
  },
];

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  return Promise.resolve(NOTIFICATION_RECORDS.map((record) => ({ ...record })));
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
