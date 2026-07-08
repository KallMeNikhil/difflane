import type { DiscussionComment, DiscussionFeedItem, DiscussionThread } from "../types/workspace";

export interface DiscussionFeedStats {
  commentCount: number;
  resolvedCount: number;
  pendingCount: number;
}

export function computeFeedStats(feed: DiscussionFeedItem[]): DiscussionFeedStats {
  const threads = feed.filter((item) => item.kind === "thread").map((item) => item.thread);
  const commentCount = threads.reduce((total, thread) => total + thread.comments.length, 0);
  const resolvedCount = threads.filter((thread) => thread.status === "resolved").length;
  const pendingCount = threads.filter((thread) => thread.status === "pending").length;
  return { commentCount, resolvedCount, pendingCount };
}

export function resolveThread(feed: DiscussionFeedItem[], threadId: string): DiscussionFeedItem[] {
  return feed.map((item) => {
    if (item.kind === "thread" && item.thread.id === threadId) {
      return { ...item, thread: { ...item.thread, status: "resolved" } };
    }
    return item;
  });
}

export function appendReply(feed: DiscussionFeedItem[], threadId: string, comment: DiscussionComment): DiscussionFeedItem[] {
  return feed.map((item) => {
    if (item.kind === "thread" && item.thread.id === threadId) {
      return { ...item, thread: { ...item.thread, comments: [...item.thread.comments, comment] } };
    }
    return item;
  });
}

export function createThread(feed: DiscussionFeedItem[], thread: DiscussionThread): DiscussionFeedItem[] {
  return [...feed, { kind: "thread", thread }];
}

export function editComment(
  feed: DiscussionFeedItem[],
  threadId: string,
  commentId: string,
  body: string,
): DiscussionFeedItem[] {
  return feed.map((item) => {
    if (item.kind !== "thread" || item.thread.id !== threadId) {
      return item;
    }
    return {
      ...item,
      thread: {
        ...item.thread,
        comments: item.thread.comments.map((comment) => (comment.id === commentId ? { ...comment, body } : comment)),
      },
    };
  });
}

export function deleteComment(feed: DiscussionFeedItem[], threadId: string, commentId: string): DiscussionFeedItem[] {
  return feed
    .map((item) => {
      if (item.kind !== "thread" || item.thread.id !== threadId) {
        return item;
      }
      return { ...item, thread: { ...item.thread, comments: item.thread.comments.filter((comment) => comment.id !== commentId) } };
    })
    .filter((item) => item.kind !== "thread" || item.thread.comments.length > 0);
}

export function deleteThread(feed: DiscussionFeedItem[], threadId: string): DiscussionFeedItem[] {
  return feed.filter((item) => item.kind !== "thread" || item.thread.id !== threadId);
}
