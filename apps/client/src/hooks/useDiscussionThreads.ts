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
import {
  appendDiscussionReply,
  createDiscussionThread,
  deleteDiscussionComment,
  deleteDiscussionThread,
  editDiscussionComment,
  readDiscussionFeed,
  setDiscussionThreadStatus,
  subscribeDiscussionFeed,
} from "../services/CollaborationService";
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

  const resolve = useCallback(
    (threadId: string) => {
      if (doc) {
        setDiscussionThreadStatus(doc, threadId, "resolved");
      } else {
        setLocalFeed((prev) => resolveThread(prev, threadId));
      }
    },
    [doc],
  );

  const reply = useCallback(
    (threadId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) {
        return;
      }
      const comment = {
        id: `comment-${Date.now()}`,
        authorInitials: author.initials,
        authorName: author.name,
        timestampLabel: "Just now",
        body: trimmed,
        tone: "default" as const,
      };
      if (doc) {
        appendDiscussionReply(doc, threadId, comment);
      } else {
        setLocalFeed((prev) => appendReply(prev, threadId, comment));
      }
    },
    [doc, author],
  );

  const create = useCallback(
    (thread: DiscussionThread) => {
      if (doc) {
        createDiscussionThread(doc, thread);
      } else {
        setLocalFeed((prev) => createThread(prev, thread));
      }
    },
    [doc],
  );

  const edit = useCallback(
    (threadId: string, commentId: string, body: string) => {
      if (doc) {
        editDiscussionComment(doc, threadId, commentId, body);
      } else {
        setLocalFeed((prev) => editComment(prev, threadId, commentId, body));
      }
    },
    [doc],
  );

  const remove = useCallback(
    (threadId: string, commentId: string) => {
      if (doc) {
        deleteDiscussionComment(doc, threadId, commentId);
      } else {
        setLocalFeed((prev) => deleteComment(prev, threadId, commentId));
      }
    },
    [doc],
  );

  const removeThread = useCallback(
    (threadId: string) => {
      if (doc) {
        deleteDiscussionThread(doc, threadId);
      } else {
        setLocalFeed((prev) => deleteThread(prev, threadId));
      }
    },
    [doc],
  );

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
