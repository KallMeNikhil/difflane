import { Avatar, Card, Icon, getButtonClasses } from "../components/common";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useUserSettingsModal } from "../hooks/useUserSettingsModal";
import { useAuthModal } from "../hooks/useAuthModal";
import { useWorkspaceDashboard } from "../hooks/useWorkspaceDashboard";

const PRIMARY_BUTTON = getButtonClasses("primary", "md");
const SECONDARY_BUTTON = getButtonClasses("secondary", "md");

const PROVIDER_META: Record<string, { label: string; icon: string }> = {
  google: { label: "Google", icon: "account_circle" },
  github: { label: "GitHub", icon: "code" },
};

export default function Profile() {
  const { isAuthenticated, displayName, initials, user } = useCurrentUser();
  const { openUserSettings } = useUserSettingsModal();
  const { openGuestUpgrade } = useAuthModal();
  const { dashboard, isLoading } = useWorkspaceDashboard();

  const ownedCount = dashboard.created.length;
  const joinedCount = dashboard.joined.length;
  const activeCount = dashboard.recent.length;

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
            {isAuthenticated && user && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          <button type="button" className={SECONDARY_BUTTON} onClick={openUserSettings}>
            <Icon name="edit" size={18} />
            Edit Profile
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <Card className="p-lg text-center">
          <p className="font-headline-md text-headline-md text-on-surface">{isLoading ? "…" : ownedCount}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Workspaces Owned</p>
        </Card>
        <Card className="p-lg text-center">
          <p className="font-headline-md text-headline-md text-on-surface">{isLoading ? "…" : joinedCount}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Workspaces Joined</p>
        </Card>
        <Card className="p-lg text-center">
          <p className="font-headline-md text-headline-md text-on-surface">{isLoading ? "…" : activeCount}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Recently Active</p>
        </Card>
      </div>

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
