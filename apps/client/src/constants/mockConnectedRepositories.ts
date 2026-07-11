import type { ConnectedRepository } from "../components/dashboard";

export const MOCK_CONNECTED_REPOSITORIES: ConnectedRepository[] = [
  { id: "repo-1", name: "core-platform", syncedLabel: "Synced just now" },
  { id: "repo-2", name: "webapp", syncedLabel: "Synced 5m ago" },
];
