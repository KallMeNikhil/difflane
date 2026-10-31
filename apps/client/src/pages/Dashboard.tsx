import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon, getButtonClasses } from "../components/common";
import {
  RecentRoomsTable,
  TeamPresenceCard,
  RecentActivityCard,
  WorkspaceOwnershipCard,
} from "../components/dashboard";
import type { ActivityItem, RecentRoom, TeamPresenceMember } from "../components/dashboard";
import type { AvatarTone } from "../components/common";
import { useSessionHistory } from "../hooks/useSessionHistory";
import { buildCollaborators, buildRecentActivity, describeCollaboratorStatus } from "../services/DashboardInsightsService";
import { WorkspaceImportModal } from "../components/persistence";
import { ROUTES, buildWorkspacePath } from "../constants/routes";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useWorkspaceDashboard } from "../hooks/useWorkspaceDashboard";
import { deleteWorkspaceRecord, setWorkspaceArchived, setWorkspacePinned } from "../services/AuthService";
import { formatRelativeTimeLabel } from "../services/SessionHistoryService";
import { readLastActiveWorkspaceCode, readRecoveryMarker, type RecoveryMarker } from "../lib/persistence/recoveryCache";
import type { WorkspaceOwnershipSummary } from "@difflane/shared-types";

const COLLABORATOR_TONES: AvatarTone[] = ["primary", "secondary", "tertiary", "neutral"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { displayName, isAuthenticated, guestId, userId } = useCurrentUser();
  const sessionHistory = useSessionHistory();
  const { dashboard, isLoading, refresh } = useWorkspaceDashboard();
  const [isImportOpen, setImportOpen] = useState(false);
  const [recoverable, setRecoverable] = useState<RecoveryMarker | null>(null);

  useEffect(() => {
    const lastActiveCode = readLastActiveWorkspaceCode();
    if (lastActiveCode) {
      setRecoverable(readRecoveryMarker(lastActiveCode));
    }
  }, []);

  async function handleTogglePin(workspaceCode: string, pinned: boolean) {
    await setWorkspacePinned(workspaceCode, pinned, isAuthenticated ? null : guestId);
    await refresh();
  }

  async function handleToggleArchive(workspaceCode: string, archived: boolean) {
    await setWorkspaceArchived(workspaceCode, archived, isAuthenticated ? null : guestId);
    await refresh();
  }

  async function handleDeleteWorkspace(workspaceCode: string, workspaceName: string) {
    const confirmed = window.confirm(
      `Delete "${workspaceName}"? This permanently removes the workspace, its files, and its history for every member. This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    await deleteWorkspaceRecord(workspaceCode, isAuthenticated ? null : guestId);
    await refresh();
  }

  const recentRooms: RecentRoom[] = useMemo(() => dashboard.recent.map((workspace) => toRecentRoom(workspace)), [dashboard.recent]);
  const totalWorkspaceCount = dashboard.all.length;
  const isHistoryLoading = sessionHistory.status === "loading";

  const activityItems: ActivityItem[] = useMemo(
    () =>
      buildRecentActivity(sessionHistory.records).map((event, index) => ({
        id: event.id,
        message: (
          <>
            {event.description} <span className="text-on-surface-variant">in</span> <span className="font-medium">{event.workspaceName}</span>
          </>
        ),
        timeLabel: formatRelativeTimeLabel(event.occurredAt),
        emphasized: index === 0,
      })),
    [sessionHistory.records],
  );

  const collaborators: TeamPresenceMember[] = useMemo(
    () =>
      buildCollaborators(sessionHistory.records, userId).map((collaborator, index) => ({
        id: collaborator.id,
        name: collaborator.name,
        initials: collaborator.initials,
        presence: collaborator.presence,
        statusLabel: describeCollaboratorStatus(collaborator),
        tone: COLLABORATOR_TONES[index % COLLABORATOR_TONES.length],
        onOpen: () => navigate(buildWorkspacePath(collaborator.roomCode)),
      })),
    [sessionHistory.records, userId, navigate],
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-lg md:gap-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Welcome back, {displayName}.</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {totalWorkspaceCount > 0
              ? `You have ${totalWorkspaceCount} workspace${totalWorkspaceCount === 1 ? "" : "s"}.`
              : "Create or join a workspace to get started."}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button type="button" onClick={() => setImportOpen(true)} className={getButtonClasses("secondary", "md")}>
            <Icon name="unarchive" size={18} />
            Import Workspace
          </button>
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

      {recoverable && (
        <div className="flex items-center justify-between gap-md rounded-lg border border-tertiary/40 bg-tertiary/10 px-md py-sm">
          <div className="flex items-center gap-sm">
            <Icon name="restore" size={20} className="text-tertiary" />
            <p className="font-body-sm text-body-sm text-on-surface">
              <span className="font-label-md">{recoverable.workspaceName}</span> may have unsynced changes from your last session.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <button
              type="button"
              className="text-body-sm text-primary"
              onClick={() => navigate(buildWorkspacePath(recoverable.workspaceCode))}
            >
              Resume Workspace
            </button>
            <button type="button" className="text-body-sm text-on-surface-variant" onClick={() => setRecoverable(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-md md:gap-lg items-start">
        <div className="xl:col-span-2 flex flex-col gap-md md:gap-lg">
          <WorkspaceOwnershipCard
            all={dashboard.all}
            created={dashboard.created}
            joined={dashboard.joined}
            pinned={dashboard.pinned}
            archived={dashboard.archived}
            isLoading={isLoading}
            onSelectWorkspace={(code) => navigate(buildWorkspacePath(code))}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onDeleteWorkspace={handleDeleteWorkspace}
          />
          <RecentRoomsTable
            rooms={recentRooms}
            onSelectRoom={(roomId) => navigate(buildWorkspacePath(roomId))}
            onViewAll={() => navigate(ROUTES.history)}
          />
        </div>

        <div className="xl:col-span-1 flex flex-col gap-md md:gap-lg">
          <TeamPresenceCard members={collaborators} isLoading={isHistoryLoading} />
          <RecentActivityCard items={activityItems} isLoading={isHistoryLoading} />
        </div>
      </div>

      {isImportOpen && <WorkspaceImportModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}

function toRecentRoom(workspace: WorkspaceOwnershipSummary): RecentRoom {
  return {
    id: workspace.workspaceCode,
    name: workspace.name,
    repository: "—",
    lastOpened: formatRelativeTimeLabel(workspace.createdAt),
    status: workspace.archived
      ? { label: "Archived", tone: "neutral" }
      : { label: roleLabel(workspace.role), tone: "active" },
  };
}

function roleLabel(role: WorkspaceOwnershipSummary["role"]): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
