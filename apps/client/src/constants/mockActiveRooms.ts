import type { ActiveRoom } from "../components/dashboard";

export const MOCK_ACTIVE_ROOMS: ActiveRoom[] = [
  {
    id: "room-1",
    repositoryLabel: "core-platform",
    title: "Frontend Authentication Review",
    collaborators: [
      { initials: "A", tone: "neutral" },
      { initials: "S", tone: "secondary" },
    ],
    overflowLabel: "+2",
    unresolvedCount: 14,
  },
  {
    id: "room-2",
    repositoryLabel: "payment-gateway",
    title: "Stripe Webhook Refactor",
    collaborators: [
      { initials: "A", tone: "neutral" },
      { initials: "M", tone: "primary" },
    ],
    unresolvedCount: 3,
  },
];
