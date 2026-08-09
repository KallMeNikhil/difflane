import { useState } from "react";
import { Icon } from "../common";
import type { DiscussionThread } from "../../types/workspace";

interface InlineCommentThreadProps {
  thread: DiscussionThread;
  onSubmitReply: (threadId: string, body: string) => void;
}

export function InlineCommentThread({ thread, onSubmitReply }: InlineCommentThreadProps) {
  const [replyText, setReplyText] = useState("");
  const primaryComment = thread.comments[0];

  function handleSend() {
    if (!replyText.trim()) {
      return;
    }
    onSubmitReply(thread.id, replyText);
    setReplyText("");
  }

  return (
    <div className="absolute top-[320px] left-1/2 -translate-x-1/4 w-[400px] bg-surface-container rounded-xl border border-outline-variant shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-20 overflow-hidden">
      <div className="px-md py-sm border-b border-outline-variant bg-surface flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full overflow-hidden border border-outline-variant">
            <div className="w-full h-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
              {primaryComment.authorInitials}
            </div>
          </div>
          <span className="font-body-sm text-body-sm font-medium text-on-surface">{primaryComment.authorName}</span>
          <span className="font-body-sm text-[11px] text-on-surface-variant">{primaryComment.timestampLabel}</span>
        </div>
        {primaryComment.tone === "blocking" && (
          <span className="px-2 py-0.5 rounded bg-secondary-container/10 text-secondary font-label-sm text-[10px] border border-outline-variant/30">
            BLOCKING
          </span>
        )}
      </div>
      <div className="p-md text-body-sm text-on-surface">
        <p>{primaryComment.body}</p>
      </div>
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
          placeholder="Reply to this thread..."
          aria-label="Reply to this thread"
          className="flex-1 bg-surface border border-outline-variant rounded px-sm py-1.5 font-body-sm text-body-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
        />
        <button type="button" onClick={handleSend} className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors">
          <Icon name="send" size={18} />
        </button>
      </div>
    </div>
  );
}
