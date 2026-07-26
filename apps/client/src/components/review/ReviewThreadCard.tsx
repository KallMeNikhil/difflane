import { useState } from "react";
import { Icon } from "../common";
import { getRelativeTimeLabel } from "../../utils/workspaceDisplay";
import type { ReviewAnchorConfidence, ReviewPermissions, ReviewThread } from "../../types/review";

interface ReviewThreadCardProps {
  thread: ReviewThread;
  anchorConfidence: ReviewAnchorConfidence;
  permissions: ReviewPermissions;
  onReply: (threadId: string, body: string) => void;
  onResolve: (threadId: string) => void;
  onReopen: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onJumpToLine?: (threadId: string) => void;
}

export function ReviewThreadCard({
  thread,
  anchorConfidence,
  permissions,
  onReply,
  onResolve,
  onReopen,
  onDeleteThread,
  onJumpToLine,
}: ReviewThreadCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const primaryComment = thread.comments[0];
  const isResolved = thread.status === "resolved";
  const isOrphaned = anchorConfidence === "orphaned";

  function handleSend() {
    onReply(thread.id, replyText);
    setReplyText("");
    setIsReplying(false);
  }

  return (
    <div
      className={`rounded-lg p-sm transition-opacity ${
        isResolved
          ? "bg-surface-container border border-outline-variant opacity-70 hover:opacity-100"
          : "bg-surface-container-highest border-l-2 border-l-primary border-y border-r border-outline-variant shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
      }`}
    >
      <div className="flex justify-between items-start mb-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
            {primaryComment.authorInitials}
          </div>
          <div>
            <div className="font-body-sm text-[12px] font-medium text-on-surface leading-tight">{primaryComment.authorName}</div>
            <div className="text-[10px] text-on-surface-variant leading-tight">
              {isResolved ? "Resolved" : "Active"} • {getRelativeTimeLabel(primaryComment.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isOrphaned && (
            <span className="px-1.5 py-0.5 rounded bg-outline-variant/20 text-on-surface-variant font-label-sm text-[9px] border border-outline-variant/30">
              ORPHANED
            </span>
          )}
          {primaryComment.tone === "blocking" && (
            <span className="px-1.5 py-0.5 rounded bg-secondary-container/10 text-secondary font-label-sm text-[9px] border border-outline-variant/30">
              BLOCKING
            </span>
          )}
          {isResolved && <Icon name="check_circle" size={16} className="text-success-mint" filled />}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onJumpToLine?.(thread.id)}
        className="w-full text-left font-code text-[11px] text-on-surface-variant bg-surface-container-lowest p-2 rounded mb-2 border border-outline-variant/50 hover:border-primary/50 transition-colors"
      >
        {thread.anchor.filePath}:{thread.anchor.startLine}
        <span className="block text-primary truncate">{thread.anchor.snapshot.split("\n")[0]}</span>
      </button>

      <div className="flex flex-col gap-2 mb-3">
        {thread.comments.map((comment) => (
          <p key={comment.id} className="font-body-sm text-[13px] text-on-surface">
            {comment.body}
          </p>
        ))}
      </div>

      <div className="flex items-center gap-sm border-t border-outline-variant/50 pt-2">
        {permissions.canReply && (
          <button
            type="button"
            onClick={() => setIsReplying((prev) => !prev)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Reply
          </button>
        )}
        {!isResolved && permissions.canResolve && (
          <button
            type="button"
            onClick={() => onResolve(thread.id)}
            className="text-[11px] font-medium text-on-surface-variant hover:text-on-surface"
          >
            Resolve
          </button>
        )}
        {isResolved && permissions.canReopen && (
          <button
            type="button"
            onClick={() => onReopen(thread.id)}
            className="text-[11px] font-medium text-on-surface-variant hover:text-on-surface"
          >
            Reopen
          </button>
        )}
        {(permissions.canDeleteOwn || permissions.canDeleteAny) && (
          <button
            type="button"
            onClick={() => onDeleteThread(thread.id)}
            className="text-[11px] font-medium text-on-surface-variant hover:text-error ml-auto"
          >
            Delete
          </button>
        )}
      </div>

      {isReplying && (
        <div className="flex items-center gap-sm mt-2">
          <input
            type="text"
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSend();
              }
            }}
            placeholder="Reply to this review thread..."
            className="flex-1 bg-surface border border-outline-variant rounded px-sm py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
          />
          <button
            type="button"
            onClick={handleSend}
            aria-label="Send reply"
            title="Send reply"
            className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
