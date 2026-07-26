import { useCallback, useEffect, useState } from "react";
import type * as Y from "yjs";
import {
  appendReply,
  computeFeedStats,
  createThread,
  deleteComment,
  deleteThread,
  editComment,
  resolveThread,
} from "../services/DiscussionService";
import { readDiscussionFeed, subscribeDiscussionFeed, writeDiscussionFeed } from "../services/CollaborationService";
import type { DiscussionFeedItem, DiscussionThread } from "../types/workspace";

export interface DiscussionAuthorIdentity {
  name: string;
  initials: string;
}

const DEFAULT_AUTHOR: DiscussionAuthorIdentity = { name: "You", initials: "ME" };

export function useDiscussionThreads(
  initialFeed: DiscussionFeedItem[],
  doc?: Y.Doc | null,
  author: DiscussionAuthorIdentity = DEFAULT_AUTHOR,
) {
  const [localFeed, setLocalFeed] = useState<DiscussionFeedItem[]>(initialFeed);

  useEffect(() => {
    if (!doc) {
      return;
    }
    setLocalFeed(readDiscussionFeed(doc));
    return subscribeDiscussionFeed(doc, setLocalFeed);
  }, [doc]);

  const commit = useCallback(
    (nextFeed: DiscussionFeedItem[]) => {
      if (doc) {
        writeDiscussionFeed(doc, nextFeed);
      } else {
        setLocalFeed(nextFeed);
      }
    },
    [doc],
  );

  const resolve = useCallback((threadId: string) => commit(resolveThread(localFeed, threadId)), [commit, localFeed]);

  const reply = useCallback(
    (threadId: string, body: string) => {
      if (!body.trim()) {
        return;
      }
      commit(
        appendReply(localFeed, threadId, {
          id: `comment-${Date.now()}`,
          authorInitials: author.initials,
          authorName: author.name,
          timestampLabel: "Just now",
          body: body.trim(),
          tone: "default",
        }),
      );
    },
    [commit, localFeed, author],
  );

  const create = useCallback((thread: DiscussionThread) => commit(createThread(localFeed, thread)), [commit, localFeed]);

  const edit = useCallback(
    (threadId: string, commentId: string, body: string) => commit(editComment(localFeed, threadId, commentId, body)),
    [commit, localFeed],
  );

  const remove = useCallback(
    (threadId: string, commentId: string) => commit(deleteComment(localFeed, threadId, commentId)),
    [commit, localFeed],
  );

  const removeThread = useCallback((threadId: string) => commit(deleteThread(localFeed, threadId)), [commit, localFeed]);

  return {
    feed: localFeed,
    stats: computeFeedStats(localFeed),
    resolve,
    reply,
    create,
    edit,
    remove,
    removeThread,
  };
}
