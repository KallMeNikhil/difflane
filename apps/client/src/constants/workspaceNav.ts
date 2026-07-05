export interface WorkspaceRailItem {
  id: string;
  label: string;
  icon: string;
}

export const WORKSPACE_RAIL_ITEMS: WorkspaceRailItem[] = [
  { id: "workspace", label: "Workspace", icon: "grid_view" },
  { id: "files", label: "Files", icon: "description" },
  { id: "discussions", label: "Discussions", icon: "forum" },
  { id: "participants", label: "Participants", icon: "groups" },
  { id: "search", label: "Search", icon: "search" },
  { id: "activity", label: "Activity", icon: "history" },
];

export const WORKSPACE_RAIL_BOTTOM_ITEMS: WorkspaceRailItem[] = [
  { id: "settings", label: "Settings", icon: "settings" },
  { id: "account", label: "Account", icon: "account_circle" },
];
