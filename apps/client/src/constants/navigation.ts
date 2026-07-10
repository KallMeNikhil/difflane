import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export const SIDE_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: ROUTES.dashboard, icon: "dashboard" },
  { label: "Activity", path: ROUTES.history, icon: "history" },
  { label: "Workspace", path: ROUTES.workspaceRoot, icon: "terminal" },
];

export const MARKETING_NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "Workspace", href: "#workspace" },
  { label: "Documentation", href: "#docs" },
];
