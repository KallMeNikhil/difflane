import type { ActivityItem } from "../components/dashboard";

export const MOCK_RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "activity-1",
    emphasized: true,
    timeLabel: "10 mins ago",
    message: (
      <>
        <span className="font-medium">Frontend Engineer</span> resolved a discussion in{" "}
        <span className="font-code text-[11px] text-secondary">Frontend Auth</span>.
      </>
    ),
  },
  {
    id: "activity-2",
    timeLabel: "1 hour ago",
    message: (
      <>
        <span className="font-medium">You</span> joined workspace{" "}
        <span className="font-code text-[11px] text-secondary">Stripe Webhook Refactor</span>.
      </>
    ),
  },
  {
    id: "activity-3",
    timeLabel: "2 hours ago",
    message: (
      <>
        <span className="font-medium">Backend Engineer</span> started a new workspace in{" "}
        <span className="font-code text-[11px] text-secondary">webapp</span>.
      </>
    ),
  },
];
