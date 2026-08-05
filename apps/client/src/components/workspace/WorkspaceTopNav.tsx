import { Button, Icon, IconButton } from "../common";
import { ParticipantPresencePopover } from "./ParticipantPresencePopover";
import { useRoom } from "../../hooks/useRoom";
import { useWorkspaceMetadata } from "../../hooks/useWorkspaceMetadata";
import type { WorkspaceTopTab } from "../../types/workspace";

interface WorkspaceTopNavProps {
  activeTab: WorkspaceTopTab;
  onTabChange: (tab: WorkspaceTopTab) => void;
  onOpenShare: () => void;
  onOpenSettings: () => void;
  onOpenSessionSummary: () => void;
  onExportWorkspace: () => void;
  isExporting: boolean;
  onJumpToUser: (userId: string) => void;
  onRequestAttention: (targetConnectionId: string) => void;
  fileNameById: (fileId: string | null) => string | null;
}

const TABS: { id: WorkspaceTopTab; label: string }[] = [
  { id: "files", label: "Files" },
  { id: "changes", label: "Changes" },
  { id: "discussion", label: "Discussion" },
  { id: "review", label: "Review" },
];

export function WorkspaceTopNav({
  activeTab,
  onTabChange,
  onOpenShare,
  onOpenSettings,
  onOpenSessionSummary,
  onExportWorkspace,
  isExporting,
  onJumpToUser,
  onRequestAttention,
  fileNameById,
}: WorkspaceTopNavProps) {
  const { collaborators, participants, doc, followedUserId, followUser, unfollowUser, attentionCooldownIds } = useRoom();
  const metadata = useWorkspaceMetadata(doc);

  return (
    <header className="flex justify-between items-center w-full px-lg h-16 bg-surface-container-lowest border-b border-outline-variant flex-shrink-0 z-50">
      <div className="flex items-center gap-md min-w-0">
        <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight text-[22px] flex-shrink-0">
          DIFFLANE
        </span>
        <div className="h-6 w-px bg-outline-variant mx-sm hidden sm:block" />
        <div className="hidden sm:flex items-center gap-sm bg-surface-container-lowest px-md py-1 rounded-full border border-outline-variant/50 min-w-0">
          <Icon name="meeting_room" size={16} className="text-on-surface-variant flex-shrink-0" />
          <span className="font-code text-code text-on-surface-variant truncate">{metadata.name}</span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-lg h-full ml-lg">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`h-full flex items-center transition-colors cursor-pointer active:opacity-80 border-b-2 ${
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-on-surface-variant border-transparent hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-md ml-auto">
        <ParticipantPresencePopover
          collaborators={collaborators}
          participants={participants}
          followedUserId={followedUserId}
          onFollow={followUser}
          onUnfollow={unfollowUser}
          onJumpToUser={onJumpToUser}
          onRequestAttention={onRequestAttention}
          attentionCooldownIds={attentionCooldownIds}
          fileNameById={fileNameById}
        />

        <IconButton icon="settings" aria-label="Settings" onClick={onOpenSettings} />
        <IconButton
          icon="help"
          aria-label="Help"
          title="Help — coming soon"
          disabled
          className="opacity-40 cursor-not-allowed hover:bg-transparent hover:text-on-surface-variant"
        />

        <IconButton
          icon={isExporting ? "sync" : "download"}
          aria-label="Export Workspace"
          onClick={onExportWorkspace}
          disabled={isExporting}
          className="hidden sm:inline-flex"
        />
        <Button type="button" variant="secondary" size="sm" onClick={onOpenShare} className="hidden sm:inline-flex">
          Share
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={onOpenSessionSummary}>
          Session Summary
        </Button>
      </div>
    </header>
  );
}
