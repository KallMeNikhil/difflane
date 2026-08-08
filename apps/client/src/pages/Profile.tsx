import { useNavigate } from "react-router-dom";
import { Avatar, Card, Icon, getButtonClasses } from "../components/common";
import { SessionStatusPill } from "../components/history";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useUserSettingsModal } from "../hooks/useUserSettingsModal";
import { useAuthModal } from "../hooks/useAuthModal";
import { useWorkspaceDashboard } from "../hooks/useWorkspaceDashboard";
import { useSessionHistory } from "../hooks/useSessionHistory";
import { formatRelativeTimeLabel } from "../services/SessionHistoryService";
import { getMemberRoleLabel } from "../utils/workspaceDisplay";
import { ROUTES } from "../constants/routes";

const PRIMARY_BUTTON = getButtonClasses("primary", "md");
const SECONDARY_BUTTON = getButtonClasses("secondary", "md");

const PROVIDER_META: Record<string, { label: string; icon: string }> = {
  google: { label: "Google", icon: "account_circle" },
  github: { label: "GitHub", icon: "code" },
};

const RECENT_ACTIVITY_LIMIT = 5;

export default function Profile() {
  const navigate = useNavigate();
  const { isAuthenticated, displayName, initials, user, userId } = useCurrentUser();
  const { openUserSettings } = useUserSettingsModal();
  const { openGuestUpgrade } = useAuthModal();
  const { dashboard, isLoading } = useWorkspaceDashboard();
  const { records: sessionRecords, status: sessionStatus } = useSessionHistory();

  const ownedCount = dashboard.created.length;
  const joinedCount = dashboard.joined.length;
  const pinnedCount = dashboard.pinned.length;
  const archivedCount = dashboard.archived.length;
  const sessionsParticipatedCount = sessionRecords.length;
  const recentSessions = [...sessionRecords]
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT);
  const ownerSessionCount = sessionRecords.filter((record) =>
    record.participants.some((participant) => participant.id === userId && participant.role === getMemberRoleLabel("owner")),
  ).length;

  return (
    <div className="max-w-4xl mx-auto space-y-lg">
      <Card className="p-lg">
        <div className="flex items-center gap-lg">
          <Avatar initials={initials} tone="primary" size="md" />
          <div className="flex-1 min-w-0">
            <h1 className="font-headline-md text-headline-md text-on-surface truncate">{displayName}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {isAuthenticated ? `@${user?.username} · ${user?.email}` : "Guest Session"}
            </p>
            <div className="flex items-center gap-sm mt-xs flex-wrap">
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-variant/50 border border-outline-variant text-on-surface-variant">
                {isAuthenticated ? "Registered Account" : "Guest Account"}
              </span>
              {isAuthenticated && user && (
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
          <button type="button" className={SECONDARY_BUTTON} onClick={openUserSettings}>
            <Icon name="edit" size={18} />
            Edit Profile
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-md">
        <Card className="p-lg text-center">
          <p className="font-headline-md text-headline-md text-on-surface">{isLoading ? "…" : ownedCount}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Owned</p>
        </Card>
        <Card className="p-lg text-center">
          <p className="font-headline-md text-headline-md text-on-surface">{isLoading ? "…" : joinedCount}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Joined</p>
        </Card>
        <Card className="p-lg text-center">
          <p className="font-headline-md text-headline-md text-on-surface">{isLoading ? "…" : pinnedCount}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Pinned</p>
        </Card>
        <Card className="p-lg text-center">
          <p className="font-headline-md text-headline-md text-on-surface">{isLoading ? "…" : archivedCount}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Archived</p>
        </Card>
        <Card className="p-lg text-center">
          <p className="font-headline-md text-headline-md text-on-surface">
            {sessionStatus === "loading" ? "…" : sessionsParticipatedCount}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Sessions</p>
        </Card>
      </div>

      <Card className="p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-label-md text-label-md text-primary uppercase tracking-wider">Recent Activity</h2>
          {sessionRecords.length > 0 && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.history)}
              className="font-label-sm text-label-sm text-primary hover:underline"
            >
              View All
            </button>
          )}
        </div>
        {sessionStatus === "loading" ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">Loading activity…</p>
        ) : recentSessions.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            No collaborative sessions yet. Join or create a workspace to get started.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant/50">
            {recentSessions.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => navigate(ROUTES.history)}
                className="flex items-center justify-between gap-md py-sm text-left hover:bg-surface-variant/20 transition-colors rounded px-xs -mx-xs"
              >
                <div className="min-w-0">
                  <p className="font-label-sm text-label-sm text-on-surface truncate">{record.workspace.name}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{formatRelativeTimeLabel(record.lastActivityAt)}</p>
                </div>
                <SessionStatusPill status={record.status} />
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-lg">
        <h2 className="font-label-md text-label-md text-primary uppercase tracking-wider mb-md">Collaboration Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-md">
          <div>
            <p className="font-headline-sm text-headline-sm text-on-surface">{sessionStatus === "loading" ? "…" : ownerSessionCount}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Sessions as Owner</p>
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm text-on-surface">
              {sessionStatus === "loading" ? "…" : sessionsParticipatedCount - ownerSessionCount}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Sessions as Collaborator</p>
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm text-on-surface">{isLoading ? "…" : ownedCount + joinedCount}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Active Workspaces</p>
          </div>
        </div>
      </Card>

      <Card className="p-lg">
        <h2 className="font-label-md text-label-md text-primary uppercase tracking-wider mb-md">Connected Accounts</h2>
        {isAuthenticated && user && user.linkedProviders.length > 0 ? (
          <div className="space-y-sm">
            {user.linkedProviders.map((provider) => (
              <div key={provider} className="flex items-center gap-sm px-md py-sm bg-surface-container-high border border-outline-variant rounded-lg">
                <Icon name={PROVIDER_META[provider]?.icon ?? "link"} size={20} className="text-on-surface-variant" />
                <span className="font-body-sm text-body-sm text-on-surface">{PROVIDER_META[provider]?.label ?? provider}</span>
                <span className="ml-auto font-body-sm text-body-sm text-success">Connected</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {isAuthenticated ? "No external accounts connected." : "Create an account to connect Google or GitHub."}
          </p>
        )}
      </Card>

      {!isAuthenticated && (
        <Card className="p-lg flex items-center justify-between gap-md">
          <div>
            <p className="font-label-md text-label-md text-on-surface">You're browsing as a guest</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Create a free account to keep ownership of your workspaces.</p>
          </div>
          <button type="button" className={PRIMARY_BUTTON} onClick={openGuestUpgrade}>
            Create Account
          </button>
        </Card>
      )}
    </div>
  );
}
