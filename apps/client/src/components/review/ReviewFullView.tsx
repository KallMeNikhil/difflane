import { useState } from "react";
import { ReviewThreadCard } from "./ReviewThreadCard";
import type { ResolvedReviewAnchor, ReviewPermissions, ReviewThread } from "../../types/review";

interface ReviewFullViewProps {
  threads: ReviewThread[];
  permissions: ReviewPermissions;
  resolveAnchorConfidence: (thread: ReviewThread) => ResolvedReviewAnchor["confidence"];
  onReply: (threadId: string, body: string) => void;
  onResolve: (threadId: string) => void;
  onReopen: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onJumpToThread: (thread: ReviewThread) => void;
}

type ReviewFilter = "open" | "resolved" | "all";

export function ReviewFullView({
  threads,
  permissions,
  resolveAnchorConfidence,
  onReply,
  onResolve,
  onReopen,
  onDeleteThread,
  onJumpToThread,
}: ReviewFullViewProps) {
  const [filter, setFilter] = useState<ReviewFilter>("open");

  const visibleThreads = threads
    .filter((thread) => {
      if (filter === "all") {
        return true;
      }
      return thread.status === filter;
    })
    .sort((a, b) => (a.fileId === b.fileId ? a.anchor.startLine - b.anchor.startLine : a.fileId.localeCompare(b.fileId)));

  return (
    <div className="flex-1 overflow-auto p-lg">
      <div className="max-w-3xl mx-auto flex flex-col gap-md">
        <div className="flex items-center justify-between mb-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface">Review Threads</h2>
          <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5 border border-outline-variant">
            {(["open", "resolved", "all"] as ReviewFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${
                  filter === option ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {visibleThreads.length === 0 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">No {filter !== "all" ? filter : ""} review comments yet.</p>
        )}

        {visibleThreads.map((thread) => (
          <ReviewThreadCard
            key={thread.id}
            thread={thread}
            anchorConfidence={resolveAnchorConfidence(thread)}
            permissions={permissions}
            onReply={onReply}
            onResolve={onResolve}
            onReopen={onReopen}
            onDeleteThread={onDeleteThread}
            onJumpToLine={() => onJumpToThread(thread)}
          />
        ))}
      </div>
    </div>
  );
}
