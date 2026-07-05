import { useCallback, useState } from "react";
import { appendReply, computeFeedStats, resolveThread } from "../services/DiscussionService";
import type { DiscussionFeedItem } from "../types/workspace";

export function useDiscussionThreads(initialFeed: DiscussionFeedItem[]) {
  const [feed, setFeed] = useState<DiscussionFeedItem[]>(initialFeed);

  const resolve = useCallback((threadId: string) => {
    setFeed((prev) => resolveThread(prev, threadId));
  }, []);

  const reply = useCallback((threadId: string, body: string) => {
    if (!body.trim()) {
      return;
    }
    setFeed((prev) =>
      appendReply(prev, threadId, {
        id: `comment-${Date.now()}`,
        authorInitials: "ME",
        authorName: "You",
        timestampLabel: "Just now",
        body: body.trim(),
        tone: "default",
      }),
    );
  }, []);

  return { feed, stats: computeFeedStats(feed), resolve, reply };
}
