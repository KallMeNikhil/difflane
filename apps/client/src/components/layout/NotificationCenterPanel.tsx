import { useEffect } from "react";
import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Icon, IconButton, PlaceholderNotice } from "../common";
import { MODAL_IN } from "../../constants/motion";
import { buildWorkspacePath } from "../../constants/routes";
import { formatNotificationTimeLabel } from "../../services/NotificationService";
import { NOTIFICATION_FILTERS } from "../../types/notifications";
import type { NotificationAction, NotificationFilter, NotificationGroup, NotificationRecord } from "../../types/notifications";
import type { NotificationStatus } from "../../hooks/useNotifications";

interface NotificationCenterPanelProps {
  status: NotificationStatus;
  unreadCount: number;
  filter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  visibleGroups: NotificationGroup[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function NotificationCenterPanel({
  status,
  unreadCount,
  filter,
  onFilterChange,
  visibleGroups,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onClose,
}: NotificationCenterPanelProps) {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleAction(record: NotificationRecord, action: NotificationAction) {
    onMarkAsRead(record.id);
    if ((action.kind === "openDiscussion" || action.kind === "openExplorer" || action.kind === "openWorkspace" || action.kind === "accept") && record.roomCode) {
      navigate(buildWorkspacePath(record.roomCode));
      onClose();
    }
  }

  const hasNotifications = visibleGroups.some((group) => group.notifications.length > 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-md bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Notifications">
      <m.div
        initial="hidden"
        animate="visible"
        variants={MODAL_IN}
        className="relative w-full max-w-2xl bg-surface border border-outline rounded-xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between px-lg py-md border-b border-outline shrink-0">
          <div className="flex items-center gap-sm">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-primary text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-md">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-primary hover:text-on-surface font-label-md text-label-md transition-colors"
              >
                Mark all as read
              </button>
            )}
            <IconButton icon="close" aria-label="Close notifications" onClick={onClose} />
          </div>
        </div>

        <div className="px-lg pt-sm border-b border-outline bg-surface-container-low flex gap-md overflow-x-auto shrink-0">
          {NOTIFICATION_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={`px-xs pb-sm border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-surface">
          {status === "loading" && (
            <PlaceholderNotice icon="hourglass_empty" title="Loading Notifications" description="Fetching your latest notifications…" />
          )}

          {status === "error" && (
            <PlaceholderNotice
              icon="error"
              title="Unable to Load Notifications"
              description="Something went wrong while loading notifications."
              action={
                <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
                  Retry
                </Button>
              }
            />
          )}

          {status === "ready" && !hasNotifications && (
            <PlaceholderNotice icon="notifications_off" title="All Caught Up" description="You have no new notifications right now." />
          )}

          {status === "ready" &&
            hasNotifications &&
            visibleGroups.map((group) => (
              <div key={group.label}>
                <div className="px-lg py-sm sticky top-0 bg-surface border-b border-outline-variant z-10">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{group.label}</span>
                </div>
                <div className="flex flex-col">
                  {group.notifications.map((record) => (
                    <div
                      key={record.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onMarkAsRead(record.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onMarkAsRead(record.id);
                        }
                      }}
                      className={`text-left px-lg py-md border-b border-outline-variant hover:bg-surface-variant transition-colors flex gap-md relative cursor-pointer ${
                        record.isRead ? "bg-surface opacity-70 hover:opacity-100" : "bg-surface-container-low"
                      }`}
                    >
                      {!record.isRead && <div className="absolute left-md top-lg w-2 h-2 rounded-full bg-primary" />}

                      {record.actorInitials ? (
                        <Avatar initials={record.actorInitials} tone="neutral" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
                          <Icon
                            name={record.icon}
                            size={20}
                            className={
                              record.tone === "success"
                                ? "text-success-mint"
                                : record.tone === "warning"
                                  ? "text-tertiary"
                                  : "text-primary"
                            }
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-sm mb-1">
                          <div className="font-body-md text-body-md text-on-surface line-clamp-2">
                            {record.actorName && <span className="font-bold">{record.actorName} </span>}
                            {record.message}{" "}
                            {record.targetLabel && <span className="font-code text-code text-on-surface-variant">{record.targetLabel}</span>}
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap shrink-0">
                            {formatNotificationTimeLabel(record.createdAt)}
                          </span>
                        </div>

                        {record.quote && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant mb-sm truncate border-l-2 border-outline pl-sm ml-sm">
                            &ldquo;{record.quote}&rdquo;
                          </p>
                        )}

                        {record.actions.length > 0 && (
                          <div className="flex items-center gap-sm mt-sm">
                            {record.actions.map((action) => (
                              <Button
                                key={action.id}
                                type="button"
                                variant={action.emphasis === "primary" ? "primary" : "secondary"}
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleAction(record, action);
                                }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </m.div>
    </div>
  );
}
