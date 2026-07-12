import type { RecentRoom } from "../components/dashboard";

export const MOCK_DASHBOARD_RECENT_ROOMS: RecentRoom[] = [
  {
    id: "recent-1",
    name: "GraphQL Schema Update",
    repository: "api-services",
    lastOpened: "2 hours ago",
    status: { label: "Closed", tone: "closed" },
  },
  {
    id: "recent-2",
    name: "Navigation Rebuild",
    repository: "webapp",
    lastOpened: "Yesterday",
    status: { label: "Active", tone: "active" },
  },
  {
    id: "recent-3",
    name: "Database Migration V4",
    repository: "core-platform",
    lastOpened: "3 days ago",
    status: { label: "Closed", tone: "closed" },
  },
];
