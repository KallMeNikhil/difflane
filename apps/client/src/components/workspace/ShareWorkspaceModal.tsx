import { useEffect, useState } from "react";
import { Avatar, Button, Icon, IconButton } from "../common";
import { useRoom } from "../../hooks/useRoom";
import type { MemberRole } from "../../types/workspace";

interface ShareWorkspaceModalProps {
  onClose: () => void;
}

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "viewer", label: "Viewer" },
  { value: "reviewer", label: "Reviewer" },
  { value: "editor", label: "Editor" },
];

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  editor: "Editor",
  reviewer: "Reviewer",
  viewer: "Viewer",
};

export function ShareWorkspaceModal({ onClose }: ShareWorkspaceModalProps) {
  const { roomCode, participants } = useRoom();
  const inviteLink = `difflane.io/r/${roomCode}`;
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("reviewer");
  const [copiedField, setCopiedField] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleCopy(field: "code" | "link", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Clipboard access can be denied by the browser; copying is best-effort.
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
                  <span className="font-label-md text-label-md text-on-surface">Project Alpha</span>
                  <span className="bg-primary-container/20 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    LIVE
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Active Workspace Session</span>
              </div>
            </div>
            <div className="flex items-center gap-xs text-on-surface-variant bg-surface px-3 py-1.5 rounded border border-outline-variant">
              <Icon name="group" size={18} />
              <span className="font-label-sm text-label-sm">{participants.length} Collaborators</span>
            </div>
          </div>

          <div className="flex flex-col gap-md">
            <h3 className="font-label-md text-label-md text-on-surface">Share Access</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
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
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Secure Invite Link</label>
                <div className="flex items-center">
                  <input
                    readOnly
                    type="text"
                    value={inviteLink}
                    className="font-body-sm text-body-sm w-full bg-surface-dim border border-outline-variant rounded-l-lg py-2 px-3 text-on-surface-variant cursor-not-allowed focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    title="Copy Link"
                    onClick={() => handleCopy("link", inviteLink)}
                    className="bg-surface-variant border-y border-r border-outline-variant rounded-r-lg p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors"
                  >
                    <Icon name={copiedField === "link" ? "check" : "content_copy"} size={20} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface flex items-center gap-xs transition-colors">
                <Icon name="refresh" size={16} />
                Regenerate Invite Link
              </button>
            </div>
          </div>

          <div className="h-px w-full bg-outline-variant/50" />

          <div className="flex flex-col gap-md">
            <h3 className="font-label-md text-label-md text-on-surface">Invite via Email</h3>
            <div className="flex items-start gap-sm flex-col md:flex-row">
              <div className="flex-1 w-full relative">
                <Icon name="mail" size={20} className="absolute left-3 top-2.5 text-on-surface-variant" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-surface border border-outline-variant rounded-lg py-2 pl-10 pr-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50"
                />
              </div>
              <div className="flex items-center gap-sm w-full md:w-auto">
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as MemberRole)}
                  className="bg-surface border border-outline-variant rounded-lg py-2 px-3 pr-8 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer w-full md:w-[120px]"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="primary" size="md" onClick={() => setInviteEmail("")}>
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-sm">
            <h3 className="font-label-md text-label-md text-on-surface mb-xs">Active Members</h3>
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
                  <span className="font-label-sm text-label-sm px-2 py-1 rounded text-on-surface-variant bg-surface-variant/50 border border-outline-variant">
                    {ROLE_LABELS[participant.role]}
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
