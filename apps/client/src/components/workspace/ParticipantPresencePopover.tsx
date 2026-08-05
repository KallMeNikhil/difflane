import { useEffect, useRef, useState } from "react";
import { Avatar, IconButton } from "../common";
import { describeActivityState, formatLastActiveLabel } from "../../services/PresenceService";
import type { Collaborator } from "../../types/workspace";
import type { RoomParticipant } from "@difflane/shared-types";

interface ParticipantPresencePopoverProps {
  collaborators: Collaborator[];
  participants: RoomParticipant[];
  followedUserId: string | null;
  onFollow: (userId: string) => void;
  onUnfollow: () => void;
  onJumpToUser: (userId: string) => void;
  onRequestAttention: (targetConnectionId: string) => void;
  attentionCooldownIds: string[];
  fileNameById: (fileId: string | null) => string | null;
}

const ACTIVITY_DOT_CLASSES: Record<string, string> = {
  typing: "bg-primary animate-pulse",
  editing: "bg-tertiary",
  viewing: "bg-success-mint",
  idle: "bg-on-surface-variant/40",
};

export function ParticipantPresencePopover({
  collaborators,
  participants,
  followedUserId,
  onFollow,
  onUnfollow,
  onJumpToUser,
  onRequestAttention,
  attentionCooldownIds,
  fileNameById,
}: ParticipantPresencePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="hidden lg:flex items-center -space-x-sm mr-sm cursor-pointer"
        aria-label="View collaborators"
      >
        {collaborators.slice(0, 3).map((collaborator) => (
          <Avatar
            key={collaborator.id}
            initials={collaborator.initials}
            presence={collaborator.presence}
            tone="neutral"
            className="[&>div:first-child]:border-2 [&>div:first-child]:border-surface-container-lowest"
          />
        ))}
        {collaborators.length > 3 && (
          <div className="relative w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant">+{collaborators.length - 3}</span>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-outline rounded-xl shadow-2xl shadow-black/60 z-50 py-2 max-h-96 overflow-y-auto">
          <div className="px-md py-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            {collaborators.length} Collaborator{collaborators.length === 1 ? "" : "s"}
          </div>
          {collaborators.map((collaborator) => {
            const participant = participants.find((candidate) => candidate.userId === collaborator.id);
            const isOwner = collaborator.roleValue === "owner";
            const isFollowing = followedUserId === collaborator.id;
            const isCoolingDown = participant ? attentionCooldownIds.includes(participant.connectionId) : false;
            const fileName = fileNameById(collaborator.activeFileId ?? null);
            return (
              <div key={collaborator.id} className="px-md py-sm hover:bg-surface-variant transition-colors">
                <div className="flex items-center gap-sm">
                  <div className="relative shrink-0">
                    <Avatar initials={collaborator.initials} tone="neutral" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                        ACTIVITY_DOT_CLASSES[collaborator.activityState ?? "idle"]
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-body-sm text-body-sm font-medium text-on-surface truncate">{collaborator.name}</span>
                      {isOwner && (
                        <span className="font-label-sm text-label-sm text-tertiary px-1 rounded bg-tertiary/10 shrink-0">Owner</span>
                      )}
                    </div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {describeActivityState(collaborator.activityState ?? "idle", fileName)}
                    </div>
                    {collaborator.lastActiveAt && (
                      <div className="font-label-sm text-[10px] text-on-surface-variant/70">
                        {formatLastActiveLabel(collaborator.lastActiveAt)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton
                      icon="my_location"
                      aria-label={`Jump to ${collaborator.name}`}
                      title="Jump to User"
                      onClick={() => onJumpToUser(collaborator.id)}
                      disabled={!collaborator.activeFileId}
                    />
                    <IconButton
                      icon={isFollowing ? "visibility_off" : "visibility"}
                      aria-label={isFollowing ? `Stop following ${collaborator.name}` : `Follow ${collaborator.name}`}
                      title={isFollowing ? "Stop Following" : "Follow User"}
                      onClick={() => (isFollowing ? onUnfollow() : onFollow(collaborator.id))}
                    />
                    {participant && (
                      <IconButton
                        icon="notifications_active"
                        aria-label={`Request attention from ${collaborator.name}`}
                        title="Request Attention"
                        onClick={() => onRequestAttention(participant.connectionId)}
                        disabled={isCoolingDown}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
