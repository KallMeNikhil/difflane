import { useEffect, useState } from "react";
import { Avatar, Button, Icon, IconButton } from "../common";
import { useRoom } from "../../hooks/useRoom";
import { useRepositoryInfo } from "../../hooks/useRepositoryInfo";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { transferWorkspaceOwnership } from "../../lib/auth/authClient";
import { getImportSourceLabel, getMemberRoleLabel } from "../../utils/workspaceDisplay";

interface ShareWorkspaceModalProps {
  onClose: () => void;
}

export function ShareWorkspaceModal({ onClose }: ShareWorkspaceModalProps) {
  const { roomCode, participants, doc } = useRoom();
  const { userId, isAuthenticated, guestId } = useCurrentUser();
  const [copiedField, setCopiedField] = useState<"code" | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const repositoryInfo = useRepositoryInfo(doc);

  const selfParticipant = participants.find((participant) => participant.userId === userId);
  const isSelfOwner = selfParticipant?.role === "owner";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleCopy(field: "code", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Clipboard access denied; the field remains selectable for manual copy.
    }
  }

  async function handleTransferOwnership(targetUserId: string, targetIdentityType: "user" | "guest") {
    setTransferringId(targetUserId);
    setTransferNotice(null);
    try {
      await transferWorkspaceOwnership(
        roomCode,
        { targetIdentityId: targetUserId, targetIdentityType },
        isAuthenticated ? null : guestId,
      );
      setTransferNotice("Ownership transferred. This updates for everyone the next time they rejoin.");
    } catch {
      setTransferNotice("Unable to transfer ownership right now.");
    } finally {
      setTransferringId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-[750px] bg-surface rounded-xl border border-outline-variant shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between px-lg pt-lg pb-md border-b border-outline-variant/50 shrink-0">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Share Workspace</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Invite collaborators to join this live workspace session.</p>
          </div>
          <IconButton icon="close" aria-label="Close" shape="square" onClick={onClose} />
        </div>

        <div className="p-lg flex flex-col gap-lg overflow-y-auto">
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-md flex items-center justify-between flex-wrap gap-sm">
            <div className="flex items-center gap-md">
              <div className="h-10 w-10 rounded bg-primary-container/20 flex items-center justify-center border border-primary/30">
                <Icon name="folder" size={20} filled className="text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-sm">
                  <span className="font-label-md text-label-md text-on-surface">{repositoryInfo?.name ?? "Project Alpha"}</span>
                  <span className="bg-primary-container/20 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    LIVE
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Active Workspace Session{repositoryInfo ? ` • ${getImportSourceLabel(repositoryInfo.provider)}` : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-xs text-on-surface-variant bg-surface px-3 py-1.5 rounded border border-outline-variant">
              <Icon name="group" size={18} />
              <span className="font-label-sm text-label-sm">{participants.length} Collaborators</span>
            </div>
          </div>

          <div className="flex flex-col gap-md">
            <h3 className="font-label-md text-label-md text-on-surface">Share Access</h3>
            <div className="max-w-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Workspace Code</label>
                <div className="flex items-center">
                  <input
                    readOnly
                    type="text"
                    value={roomCode}
                    className="font-code text-code w-full bg-surface-dim border border-outline-variant rounded-l-lg py-2 px-3 text-on-surface-variant cursor-not-allowed focus:outline-none"
                  />
                  <button
                    type="button"
                    title="Copy Code"
                    onClick={() => handleCopy("code", roomCode)}
                    className="bg-surface-variant border-y border-r border-outline-variant rounded-r-lg p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors"
                  >
                    <Icon name={copiedField === "code" ? "check" : "content_copy"} size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-outline-variant/50" />

          <div className="flex flex-col gap-sm">
            <h3 className="font-label-md text-label-md text-on-surface mb-xs">Active Members</h3>
            {transferNotice && (
              <div className="flex items-start gap-sm bg-primary/10 border border-primary/30 rounded-lg px-md py-sm">
                <Icon name="info" size={16} className="text-primary mt-[2px]" />
                <p className="font-body-sm text-body-sm text-on-surface">{transferNotice}</p>
              </div>
            )}
            {participants.map((participant) => (
              <div key={participant.connectionId} className="flex items-center justify-between p-sm rounded hover:bg-surface-variant/30 transition-colors group">
                <div className="flex items-center gap-md">
                  <Avatar
                    initials={participant.initials}
                    size="md"
                    presence="online"
                    className="[&>div:first-child]:bg-surface-variant [&>div:first-child]:border-outline [&>div:first-child]:text-on-surface"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface">{participant.displayName}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">Connected now</span>
                  </div>
                </div>
                <div className="flex items-center gap-md">
                  {isSelfOwner && participant.role !== "owner" && (
                    <button
                      type="button"
                      onClick={() => handleTransferOwnership(participant.userId, participant.identityType)}
                      disabled={transferringId === participant.userId}
                      className="font-label-sm text-label-sm text-primary hover:underline disabled:opacity-50"
                    >
                      {transferringId === participant.userId ? "Transferring…" : "Make Owner"}
                    </button>
                  )}
                  <span className="font-label-sm text-label-sm px-2 py-1 rounded text-on-surface-variant bg-surface-variant/50 border border-outline-variant">
                    {getMemberRoleLabel(participant.role)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-lg py-md border-t border-outline-variant/50 bg-surface-container-lowest rounded-b-xl shrink-0">
          <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-xs">
            <Icon name="info" size={16} />
            Changes are applied instantly.
          </span>
          <div className="flex items-center gap-sm">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="md" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
