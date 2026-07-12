import type { TeamPresenceMember } from "../components/dashboard";

export const MOCK_TEAM_PRESENCE: TeamPresenceMember[] = [
  {
    id: "member-1",
    initials: "FE",
    name: "Frontend Engineer",
    statusLabel: "In Frontend Auth",
    tone: "secondary",
    presence: "online",
  },
  {
    id: "member-2",
    initials: "BE",
    name: "Backend Engineer",
    statusLabel: "Idle",
    tone: "tertiary",
    presence: "idle",
  },
];
