import { Link } from "react-router-dom";
import { Icon, getButtonClasses } from "../components/common";
import {
  ActiveRoomCard,
  RecentRoomsTable,
  ConnectedRepositoriesCard,
  TeamPresenceCard,
  RecentActivityCard,
  type ActiveRoom,
  type RecentRoom,
  type ConnectedRepository,
  type TeamPresenceMember,
  type ActivityItem,
} from "../components/dashboard";
import { ROUTES } from "../constants/routes";

const ACTIVE_ROOMS: ActiveRoom[] = [
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

const RECENT_ROOMS: RecentRoom[] = [
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

const CONNECTED_REPOSITORIES: ConnectedRepository[] = [
  { id: "repo-1", name: "core-platform", syncedLabel: "Synced just now" },
  { id: "repo-2", name: "webapp", syncedLabel: "Synced 5m ago" },
];

const TEAM_PRESENCE: TeamPresenceMember[] = [
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

const RECENT_ACTIVITY: ActivityItem[] = [
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

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-lg md:gap-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Welcome back, Your Name.</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            You have {ACTIVE_ROOMS.length} active workspaces requiring your attention.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <Link to={ROUTES.joinRoom} className={getButtonClasses("secondary", "md")}>
            <Icon name="meeting_room" size={18} />
            Join Workspace
          </Link>
          <Link to={ROUTES.createRoom} className={getButtonClasses("primary", "md")}>
            <Icon name="add_box" size={18} />
            Create Workspace
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-md">
        <h2 className="font-headline-md text-headline-md text-on-surface pb-sm border-b border-outline-variant">
          Active Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {ACTIVE_ROOMS.map((room) => (
            <ActiveRoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-md md:gap-lg items-start">
        <div className="xl:col-span-2 flex flex-col gap-md md:gap-lg">
          <RecentRoomsTable rooms={RECENT_ROOMS} />
          <ConnectedRepositoriesCard repositories={CONNECTED_REPOSITORIES} />
        </div>

        <div className="xl:col-span-1 flex flex-col gap-md md:gap-lg">
          <TeamPresenceCard members={TEAM_PRESENCE} />
          <RecentActivityCard items={RECENT_ACTIVITY} />
        </div>
      </div>
    </div>
  );
}
