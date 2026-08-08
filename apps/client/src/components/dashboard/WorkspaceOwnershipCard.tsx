import { useState } from "react";
import type { WorkspaceOwnershipSummary } from "@difflane/shared-types";
import { Card, CardHeader, Icon, StatusBadge } from "../common";

type OwnershipTab = "all" | "created" | "joined" | "pinned" | "archived";

const TABS: { id: OwnershipTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "created", label: "Created" },
  { id: "joined", label: "Joined" },
  { id: "pinned", label: "Pinned" },
  { id: "archived", label: "Archived" },
];

export interface WorkspaceOwnershipCardProps {
  all: WorkspaceOwnershipSummary[];
  created: WorkspaceOwnershipSummary[];
  joined: WorkspaceOwnershipSummary[];
  pinned: WorkspaceOwnershipSummary[];
  archived: WorkspaceOwnershipSummary[];
  isLoading: boolean;
  onSelectWorkspace: (workspaceCode: string) => void;
  onTogglePin: (workspaceCode: string, pinned: boolean) => void;
  onToggleArchive: (workspaceCode: string, archived: boolean) => void;
  onDeleteWorkspace: (workspaceCode: string, workspaceName: string) => void;
}

export function WorkspaceOwnershipCard({
  all,
  created,
  joined,
  pinned,
  archived,
  isLoading,
  onSelectWorkspace,
  onTogglePin,
  onToggleArchive,
  onDeleteWorkspace,
}: WorkspaceOwnershipCardProps) {
  const [tab, setTab] = useState<OwnershipTab>("all");
  const dataByTab: Record<OwnershipTab, WorkspaceOwnershipSummary[]> = { all, created, joined, pinned, archived };
  const items = dataByTab[tab];

  return (
    <Card>
      <CardHeader
        title="Your Workspaces"
        action={
          <div className="flex gap-xs">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-sm py-xs rounded-lg font-label-sm text-label-sm transition-colors ${
                  tab === item.id
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant py-md">Loading workspaces…</p>
      ) : items.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant py-md">No workspaces in this list yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-outline-variant">
          {items.map((workspace) => (
            <div key={workspace.workspaceCode} className="flex items-center justify-between gap-sm py-sm">
              <button
                type="button"
                onClick={() => onSelectWorkspace(workspace.workspaceCode)}
                className="flex-1 text-left flex items-center gap-sm min-w-0"
              >
                <Icon name="folder" size={18} className="text-on-surface-variant flex-shrink-0" />
                <span className="font-body-md text-body-md text-on-surface truncate">{workspace.name}</span>
                <StatusBadge tone={workspace.isOwner ? "active" : "neutral"} label={workspace.role} />
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {workspace.memberCount} member{workspace.memberCount === 1 ? "" : "s"}
                </span>
              </button>
              <button
                type="button"
                aria-label={workspace.pinned ? "Unpin workspace" : "Pin workspace"}
                onClick={() => onTogglePin(workspace.workspaceCode, !workspace.pinned)}
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                <Icon name="push_pin" size={18} filled={workspace.pinned} />
              </button>
              {workspace.isOwner && (
                <button
                  type="button"
                  aria-label={workspace.archived ? "Unarchive workspace" : "Archive workspace"}
                  onClick={() => onToggleArchive(workspace.workspaceCode, !workspace.archived)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name={workspace.archived ? "unarchive" : "archive"} size={18} />
                </button>
              )}
              {workspace.isOwner && (
                <button
                  type="button"
                  aria-label="Delete workspace"
                  onClick={() => onDeleteWorkspace(workspace.workspaceCode, workspace.name)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                >
                  <Icon name="delete" size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
