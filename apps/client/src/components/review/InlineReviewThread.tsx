import { useState } from "react";
import { Icon } from "../common";
import { getRelativeTimeLabel } from "../../utils/workspaceDisplay";
import type { ReviewAnchorConfidence, ReviewPermissions, ReviewThread } from "../../types/review";

interface InlineReviewThreadProps {
  thread: ReviewThread;
  anchorConfidence: ReviewAnchorConfidence;
  permissions: ReviewPermissions;
  style?: { top: number };
  onReply: (threadId: string, body: string) => void;
  onResolve: (threadId: string) => void;
  onReopen: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onClose: () => void;
}

export function InlineReviewThread({
  thread,
  anchorConfidence,
  permissions,
  style,
  onReply,
  onResolve,
  onReopen,
  onDeleteThread,
  onClose,
}: InlineReviewThreadProps) {
  const [replyText, setReplyText] = useState("");
  const isResolved = thread.status === "resolved";

  function handleSend() {
    if (!replyText.trim()) {
      return;
    }
    onReply(thread.id, replyText);
    setReplyText("");
  }

  return (
    <div
      style={style}
      className="absolute left-16 w-[380px] bg-surface-container rounded-xl border border-outline-variant shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-20 overflow-hidden"
    >
      <div className="px-md py-sm border-b border-outline-variant bg-surface flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon name="rate_review" size={14} className="text-primary" />
          <span className="font-body-sm text-[11px] text-on-surface-variant">
            {thread.anchor.filePath}:{thread.anchor.startLine}
          </span>
          {anchorConfidence === "orphaned" && (
            <span className="px-1.5 py-0.5 rounded bg-outline-variant/20 text-on-surface-variant font-label-sm text-[9px] border border-outline-variant/30">
              ORPHANED
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close review thread"
          title="Close review thread"
          className="text-on-surface-variant hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="max-h-64 overflow-auto p-md flex flex-col gap-sm">
        {thread.comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden border border-outline-variant flex-shrink-0">
              <div className="w-full h-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                {comment.authorInitials}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-body-sm text-body-sm font-medium text-on-surface">{comment.authorName}</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">{getRelativeTimeLabel(comment.createdAt)}</span>
              </div>
              <p className="text-body-sm text-on-surface">{comment.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-md py-sm border-t border-outline-variant bg-surface-container-highest flex items-center gap-sm">
        {!isResolved && permissions.canResolve && (
          <button type="button" onClick={() => onResolve(thread.id)} className="text-[11px] font-medium text-on-surface-variant hover:text-on-surface">
            Resolve
          </button>
        )}
        {isResolved && permissions.canReopen && (
          <button type="button" onClick={() => onReopen(thread.id)} className="text-[11px] font-medium text-on-surface-variant hover:text-on-surface">
            Reopen
          </button>
        )}
        {(permissions.canDeleteOwn || permissions.canDeleteAny) && (
          <button type="button" onClick={() => onDeleteThread(thread.id)} className="text-[11px] font-medium text-on-surface-variant hover:text-error">
            Delete
          </button>
        )}
      </div>

      {permissions.canReply && (
        <div className="px-md py-sm border-t border-outline-variant bg-surface-container-highest flex items-center gap-sm">
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
            className="flex-1 bg-surface border border-outline-variant rounded px-sm py-1.5 font-body-sm text-body-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
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
