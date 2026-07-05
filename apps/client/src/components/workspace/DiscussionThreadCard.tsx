import { useState } from "react";
import { Icon } from "../common";
import type { DiscussionThread } from "../../types/workspace";

interface DiscussionThreadCardProps {
  thread: DiscussionThread;
  onResolve: (threadId: string) => void;
  onSubmitReply: (threadId: string, body: string) => void;
}

export function DiscussionThreadCard({ thread, onResolve, onSubmitReply }: DiscussionThreadCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const primaryComment = thread.comments[0];
  const isResolved = thread.status === "resolved";

  function handleSend() {
    onSubmitReply(thread.id, replyText);
    setReplyText("");
    setIsReplying(false);
  }

  if (isResolved) {
    return (
      <div className="bg-surface-container rounded-lg border border-outline-variant p-sm opacity-70 hover:opacity-100 transition-opacity">
        <div className="flex justify-between items-start mb-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
              {primaryComment.authorInitials}
            </div>
            <div>
              <div className="font-body-sm text-[12px] font-medium text-on-surface leading-tight">{primaryComment.authorName}</div>
              <div className="text-[10px] text-on-surface-variant leading-tight">Resolved {primaryComment.timestampLabel}</div>
            </div>
          </div>
          <Icon name="check_circle" size={16} className="text-success-mint" filled />
        </div>
        <p className="font-body-sm text-[13px] text-on-surface-variant line-clamp-2">{primaryComment.body}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-highest rounded-lg border-l-2 border-l-primary border-y border-r border-outline-variant p-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-start mb-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
            {primaryComment.authorInitials}
          </div>
          <div>
            <div className="font-body-sm text-[12px] font-medium text-on-surface leading-tight">{primaryComment.authorName}</div>
            <div className="text-[10px] text-on-surface-variant leading-tight">Active • {primaryComment.timestampLabel}</div>
          </div>
        </div>
        {primaryComment.tone === "blocking" && (
          <span className="px-1.5 py-0.5 rounded bg-secondary-container/10 text-secondary font-label-sm text-[9px] border border-outline-variant/30">
            BLOCKING
          </span>
        )}
      </div>

      {thread.anchor && (
        <div className="font-code text-[11px] text-on-surface-variant bg-surface-container-lowest p-2 rounded mb-2 border border-outline-variant/50">
          Line {thread.anchor.lineNumber}: <span className="text-primary">{thread.anchor.snippet}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3">
        {thread.comments.map((comment) => (
          <p key={comment.id} className="font-body-sm text-[13px] text-on-surface">
            {comment.body}
          </p>
        ))}
      </div>

      <div className="flex items-center gap-sm border-t border-outline-variant/50 pt-2">
        <button
          type="button"
          onClick={() => setIsReplying((prev) => !prev)}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Reply
        </button>
        <button
          type="button"
          onClick={() => onResolve(thread.id)}
          className="text-[11px] font-medium text-on-surface-variant hover:text-on-surface"
        >
          Resolve
        </button>
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
            placeholder="Reply to this thread..."
            className="flex-1 bg-surface border border-outline-variant rounded px-sm py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
          />
          <button type="button" onClick={handleSend} className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors">
            <Icon name="send" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
