import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Icon } from "../common";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUserSettingsModal } from "../../hooks/useUserSettingsModal";
import { useAuthModal } from "../../hooks/useAuthModal";
import { ROUTES } from "../../constants/routes";

interface AccountMenuProps {
  onClose: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Signed in with Google",
  github: "Signed in with GitHub",
  password: "Signed in with email",
};

export function AccountMenu({ onClose }: AccountMenuProps) {
  const navigate = useNavigate();
  const { isAuthenticated, displayName, initials, user, logout } = useCurrentUser();
  const { openUserSettings } = useUserSettingsModal();
  const { openGuestUpgrade } = useAuthModal();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function go(path: string) {
    onClose();
    navigate(path);
  }

  const authenticatedItems = [
    { icon: "account_circle", label: "My Profile", onClick: () => go(ROUTES.profile) },
    { icon: "dashboard", label: "Dashboard", onClick: () => go(ROUTES.dashboard) },
    { icon: "history", label: "Session History", onClick: () => go(ROUTES.history) },
    { icon: "settings", label: "Account Settings", onClick: () => { onClose(); openUserSettings(); } },
    { icon: "add", label: "Create Workspace", onClick: () => go(ROUTES.createRoom) },
    { icon: "group_add", label: "Join Workspace", onClick: () => go(ROUTES.joinRoom) },
  ];

  const guestItems = [
    { icon: "dashboard", label: "Dashboard", onClick: () => go(ROUTES.dashboard) },
    { icon: "add", label: "Create Workspace", onClick: () => go(ROUTES.createRoom) },
    { icon: "group_add", label: "Join Workspace", onClick: () => go(ROUTES.joinRoom) },
  ];

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-12 w-72 bg-surface border border-outline-variant rounded-xl shadow-2xl shadow-black/80 overflow-hidden z-50"
    >
      <div className="flex items-center gap-sm px-md py-md border-b border-outline-variant">
        <Avatar initials={initials} tone="primary" />
        <div className="min-w-0">
          <p className="font-label-md text-label-md text-on-surface truncate">{displayName}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
            {isAuthenticated ? user?.email : "Guest Session"}
          </p>
        </div>
      </div>

      <div className="py-xs">
        {(isAuthenticated ? authenticatedItems : guestItems).map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="group w-full flex items-center gap-sm px-md py-sm font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Icon name={item.icon} size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="border-t border-outline-variant py-xs">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              void logout();
            }}
            className="group w-full flex items-center gap-sm px-md py-sm font-body-sm text-body-sm text-error hover:bg-error/10 transition-colors"
          >
            <Icon name="logout" size={20} className="opacity-80 group-hover:opacity-100 transition-opacity" />
            Sign Out
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                onClose();
                openGuestUpgrade();
              }}
              className="w-full flex items-center gap-sm px-md py-sm font-body-sm text-body-sm text-primary hover:bg-surface-container-high transition-colors"
            >
              <Icon name="rocket_launch" size={20} />
              Create Account
            </button>
            <button
              type="button"
              onClick={() => go(ROUTES.signIn)}
              className="w-full flex items-center gap-sm px-md py-sm font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <Icon name="login" size={20} />
              Sign In
            </button>
          </>
        )}
      </div>

      {isAuthenticated && user && (
        <div className="px-md py-sm border-t border-outline-variant">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {PROVIDER_LABELS[user.primaryProvider] ?? "Signed in"}
          </p>
        </div>
      )}
    </div>
  );
}
