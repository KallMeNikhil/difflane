import { useState } from "react";
import { Icon, IconButton } from "../common";
import { DiscussionThreadCard } from "./DiscussionThreadCard";
import type { DiscussionFeedItem, DiscussionThread } from "../../types/workspace";
import type { DiscussionFeedStats } from "../../services/DiscussionService";

interface DiscussionPanelProps {
  feed: DiscussionFeedItem[];
  stats: DiscussionFeedStats;
  onResolve: (threadId: string) => void;
  onSubmitReply: (threadId: string, body: string) => void;
  onCreateThread: (thread: DiscussionThread) => void;
}

export function DiscussionPanel({ feed, stats, onResolve, onSubmitReply, onCreateThread }: DiscussionPanelProps) {
  const [isComposing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  function handleCreate() {
    const body = draft.trim();
    if (!body) {
      return;
    }
    onCreateThread({
      id: `thread-${Date.now()}`,
      status: "pending",
      comments: [
        {
          id: `comment-${Date.now()}`,
          authorInitials: "ME",
          authorName: "You",
          timestampLabel: "Just now",
          body,
          tone: "default",
        },
      ],
    });
    setDraft("");
    setComposing(false);
  }

  return (
    <aside className="w-[270px] xl:w-[320px] bg-surface-container-lowest border-l border-outline-variant hidden lg:flex flex-col h-full flex-shrink-0 z-30">
      <div className="h-12 px-md flex items-center justify-between border-b border-outline-variant/50">
        <span className="font-body-lg text-body-lg font-bold text-on-surface flex items-center gap-sm">
          <Icon name="forum" size={20} className="text-primary" />
          Workspace Activity
        </span>
        <div className="flex items-center gap-xs">
          <IconButton
            icon="add_comment"
            aria-label="New Discussion"
            size={18}
            shape="square"
            onClick={() => setComposing((prev) => !prev)}
            className="w-8 h-8"
          />
          <button type="button" aria-label="Collapse panel" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <Icon name="close_fullscreen" size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-md py-sm border-b border-outline-variant/50 bg-surface-container/50">
        <span className="text-[11px] font-medium text-on-surface-variant">{stats.commentCount} Comments</span>
        <span className="w-1 h-1 rounded-full bg-outline-variant" />
        <span className="text-[11px] text-success-mint">{stats.resolvedCount} Resolved</span>
        <span className="w-1 h-1 rounded-full bg-outline-variant" />
        <span className="text-[11px] text-secondary">{stats.pendingCount} Pending</span>
      </div>

      {isComposing && (
        <div className="p-md border-b border-outline-variant/50 flex flex-col gap-sm bg-surface-container/30">
          <span className="font-label-sm text-label-sm text-on-surface-variant tracking-wider">NEW DISCUSSION</span>
          <textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Start a new discussion..."
            rows={3}
            className="w-full bg-surface border border-outline-variant rounded px-sm py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex items-center justify-end gap-sm">
            <button
              type="button"
              onClick={() => {
                setComposing(false);
                setDraft("");
              }}
              className="text-[11px] font-medium text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="px-3 py-1.5 rounded bg-primary text-on-primary text-[11px] font-medium hover:bg-primary-fixed-dim transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-md flex flex-col gap-md">
        {feed.map((item) =>
          item.kind === "thread" ? (
            <DiscussionThreadCard key={item.thread.id} thread={item.thread} onResolve={onResolve} onSubmitReply={onSubmitReply} />
          ) : (
            <div key={item.event.id} className="flex items-start gap-sm pl-sm border-l-2 border-outline-variant/30 py-xs ml-3 relative">
              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary" />
              <div className="text-[12px] text-on-surface-variant">
                <span className="font-medium text-on-surface">{item.event.actorName}</span> {item.event.description}
                <div className="text-[10px] mt-0.5">{item.event.timestampLabel}</div>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="p-md border-t border-outline-variant">
        <button
          type="button"
          className="w-full py-2 rounded border border-outline-variant text-on-surface hover:bg-surface-container transition-colors font-body-sm text-body-sm font-medium flex items-center justify-center gap-sm"
        >
          <Icon name="summarize" size={16} />
          Generate Summary
        </button>
      </div>
    </aside>
  );
}
