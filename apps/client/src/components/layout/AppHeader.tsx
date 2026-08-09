import { useState } from "react";
import { Avatar, Icon, IconButton } from "../common";
import { AccountMenu } from "../auth";
import { useUserSettingsModal } from "../../hooks/useUserSettingsModal";
import { useNotifications } from "../../hooks/useNotifications";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { NotificationCenterPanel } from "./NotificationCenterPanel";

interface AppHeaderProps {
  onOpenMobileNav: () => void;
  onOpenSearch: () => void;
}

export function AppHeader({ onOpenMobileNav, onOpenSearch }: AppHeaderProps) {
  const { openUserSettings } = useUserSettingsModal();
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isAccountMenuOpen, setAccountMenuOpen] = useState(false);
  const notifications = useNotifications();
  const { initials } = useCurrentUser();

  return (
    <>
      <header className="flex justify-between items-center px-lg h-16 w-full z-50 bg-surface border-b border-outline-variant flex-shrink-0 md:hidden">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="Difflane" className="w-full h-full object-cover" />
          </div>
          <span className="font-headline-md text-headline-md font-bold text-on-surface">DIFFLANE</span>
        </div>
        <IconButton icon="menu" aria-label="Open navigation menu" onClick={onOpenMobileNav} />
      </header>

      <header className="hidden md:flex justify-end items-center px-lg h-16 w-full z-30 bg-surface border-b border-outline-variant flex-shrink-0">
        <div className="flex items-center gap-md">
          <button type="button" onClick={onOpenSearch} className="relative w-64 mr-md text-left">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <Icon name="search" size={20} />
            </span>
            <span
              className="flex items-center w-full bg-surface-container-low border border-outline-variant text-on-surface-variant font-body-sm rounded-full pl-10 pr-4 py-1.5 hover:border-primary/50 transition-colors truncate"
            >
              Search files, sessions, collaborators…
            </span>
          </button>
          <div className="relative">
            <IconButton icon="notifications" aria-label="Notifications" onClick={() => setNotificationsOpen(true)} />
            {notifications.unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-on-primary text-[10px] leading-4 font-bold flex items-center justify-center">
                {notifications.unreadCount}
              </span>
            )}
          </div>
          <IconButton icon="settings" aria-label="Settings" onClick={openUserSettings} />
          <div className="relative ml-sm">
            <button
              type="button"
              aria-label="Account"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="cursor-pointer"
            >
              <Avatar initials={initials} tone="primary" />
            </button>
            {isAccountMenuOpen && <AccountMenu onClose={() => setAccountMenuOpen(false)} />}
          </div>
        </div>
      </header>

      {isNotificationsOpen && (
        <NotificationCenterPanel
          status={notifications.status}
          unreadCount={notifications.unreadCount}
          filter={notifications.filter}
          onFilterChange={notifications.setFilter}
          visibleGroups={notifications.visibleGroups}
          onMarkAsRead={notifications.markAsRead}
          onMarkAllAsRead={notifications.markAllAsRead}
          onRefresh={notifications.refresh}
          onClose={() => setNotificationsOpen(false)}
        />
      )}
    </>
  );
}
