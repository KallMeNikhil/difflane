import { Icon } from "../common";
import type { SessionStatus } from "../../types/session";

interface SessionStatusPillProps {
  status: SessionStatus;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; icon?: string; className: string; dotClassName?: string }> = {
  active: {
    label: "Active",
    className: "text-primary",
    dotClassName: "bg-primary",
  },
  completed: {
    label: "Completed",
    icon: "check_circle",
    className: "text-success-mint",
  },
  archived: {
    label: "Archived",
    className: "text-on-surface-variant",
  },
};

export function SessionStatusPill({ status }: SessionStatusPillProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-surface-container-lowest border border-outline-variant font-label-sm text-label-sm">
      {config.icon && <Icon name={config.icon} size={14} className={config.className} />}
      {config.dotClassName && <span className={`w-1.5 h-1.5 rounded-full ${config.dotClassName}`} />}
      <span className={config.className}>{config.label}</span>
    </span>
  );
}
