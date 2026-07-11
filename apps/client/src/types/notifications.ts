export type NotificationCategory = "mentions" | "workspace" | "discussions" | "system";

export type NotificationFilter = "all" | "unread" | NotificationCategory;

export type NotificationActionKind = "accept" | "decline" | "openWorkspace" | "openDiscussion" | "openExplorer";

export interface NotificationAction {
  id: string;
  label: string;
  kind: NotificationActionKind;
  emphasis: "primary" | "secondary";
}

export type NotificationTone = "accent" | "success" | "warning";

export interface NotificationRecord {
  id: string;
  category: NotificationCategory;
  icon: string;
  tone: NotificationTone;
  actorInitials?: string;
  actorName?: string;
  message: string;
  targetLabel?: string;
  quote?: string;
  roomCode?: string;
  createdAt: string;
  isRead: boolean;
  actions: NotificationAction[];
}

export interface NotificationGroup {
  label: string;
  notifications: NotificationRecord[];
}

export const NOTIFICATION_FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "workspace", label: "Workspace" },
  { id: "discussions", label: "Discussions" },
  { id: "system", label: "System" },
];
