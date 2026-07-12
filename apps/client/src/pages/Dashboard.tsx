import { Link, useNavigate } from "react-router-dom";
import { Icon, getButtonClasses } from "../components/common";
import {
  ActiveRoomCard,
  RecentRoomsTable,
  ConnectedRepositoriesCard,
  TeamPresenceCard,
  RecentActivityCard,
} from "../components/dashboard";
import { ROUTES, buildWorkspacePath } from "../constants/routes";
import { MOCK_CONNECTED_REPOSITORIES } from "../constants/mockConnectedRepositories";
import { MOCK_ACTIVE_ROOMS } from "../constants/mockActiveRooms";
import { MOCK_DASHBOARD_RECENT_ROOMS } from "../constants/mockDashboardRecentRooms";
import { MOCK_TEAM_PRESENCE } from "../constants/mockTeamPresence";
import { MOCK_RECENT_ACTIVITY } from "../constants/mockRecentActivity";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-lg md:gap-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Welcome back, Your Name.</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            You have {MOCK_ACTIVE_ROOMS.length} active workspaces requiring your attention.
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
          {MOCK_ACTIVE_ROOMS.map((room) => (
            <ActiveRoomCard key={room.id} room={room} onContinue={(roomId) => navigate(buildWorkspacePath(roomId))} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-md md:gap-lg items-start">
        <div className="xl:col-span-2 flex flex-col gap-md md:gap-lg">
          <RecentRoomsTable
            rooms={MOCK_DASHBOARD_RECENT_ROOMS}
            onSelectRoom={(roomId) => navigate(buildWorkspacePath(roomId))}
            onViewAll={() => navigate(ROUTES.history)}
          />
          <ConnectedRepositoriesCard
            repositories={MOCK_CONNECTED_REPOSITORIES}
            onAddRepository={() => navigate(ROUTES.createRoom)}
            onOpenRoom={(repositoryId) => navigate(buildWorkspacePath(repositoryId))}
          />
        </div>

        <div className="xl:col-span-1 flex flex-col gap-md md:gap-lg">
          <TeamPresenceCard members={MOCK_TEAM_PRESENCE} />
          <RecentActivityCard items={MOCK_RECENT_ACTIVITY} />
        </div>
      </div>
    </div>
  );
}
