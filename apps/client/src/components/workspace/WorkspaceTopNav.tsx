import { Avatar, Button, Icon, IconButton } from "../common";
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
}

const TABS: { id: WorkspaceTopTab; label: string }[] = [
  { id: "files", label: "Files" },
  { id: "changes", label: "Changes" },
  { id: "discussion", label: "Discussion" },
  { id: "review", label: "Review" },
];

const MAX_VISIBLE_PRESENCE_DOTS = 3;

export function WorkspaceTopNav({
  activeTab,
  onTabChange,
  onOpenShare,
  onOpenSettings,
  onOpenSessionSummary,
  onExportWorkspace,
  isExporting,
}: WorkspaceTopNavProps) {
  const { collaborators, doc } = useRoom();
  const metadata = useWorkspaceMetadata(doc);
  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_PRESENCE_DOTS);
  const overflowCount = collaborators.length - visibleCollaborators.length;

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
        {visibleCollaborators.length > 0 && (
          <div className="hidden lg:flex items-center -space-x-sm mr-sm">
            {visibleCollaborators.map((collaborator) => (
              <Avatar
                key={collaborator.id}
                initials={collaborator.initials}
                presence={collaborator.presence}
                tone="neutral"
                className="[&>div:first-child]:border-2 [&>div:first-child]:border-surface-container-lowest"
              />
            ))}
            {overflowCount > 0 && (
              <div className="relative w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">+{overflowCount}</span>
              </div>
            )}
          </div>
        )}

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
