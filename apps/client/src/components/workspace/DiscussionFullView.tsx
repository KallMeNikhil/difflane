import { DiscussionThreadCard } from "./DiscussionThreadCard";
import type { DiscussionFeedItem } from "../../types/workspace";

interface DiscussionFullViewProps {
  feed: DiscussionFeedItem[];
  onResolve: (threadId: string) => void;
  onSubmitReply: (threadId: string, body: string) => void;
}

export function DiscussionFullView({ feed, onResolve, onSubmitReply }: DiscussionFullViewProps) {
  const threads = feed.filter((item) => item.kind === "thread");

  return (
    <div className="flex-1 overflow-auto p-lg">
      <div className="max-w-3xl mx-auto flex flex-col gap-md">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">Discussion Threads</h2>
        {threads.map((item) =>
          item.kind === "thread" ? (
            <DiscussionThreadCard key={item.thread.id} thread={item.thread} onResolve={onResolve} onSubmitReply={onSubmitReply} />
          ) : null,
        )}
      </div>
    </div>
  );
}
