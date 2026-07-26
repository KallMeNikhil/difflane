import { useCallback, useEffect, useState } from "react";
import type * as Y from "yjs";
import {
  readFileReviewStatusRecords,
  readReviewNavigation,
  readReviewThreads,
  subscribeFileReviewStatusRecords,
  subscribeReviewNavigation,
  subscribeReviewThreads,
  writeFileReviewStatusRecords,
  writeReviewNavigation,
  writeReviewThreads,
} from "../services/CollaborationService";
import {
  appendReply,
  buildReviewAnchor,
  computeReviewStats,
  createThread as createReviewThreadEntry,
  deleteComment,
  deleteThread,
  editComment,
  getFileReviewStatus,
  reopenThread,
  resolveReviewAnchor,
  resolveThread,
  setFileReviewStatus,
} from "../services/ReviewService";
import { getReviewPermissions } from "../types/review";
import type {
  FileReviewStatus,
  FileReviewStatusRecord,
  ReviewAuthorIdentity,
  ReviewNavigationState,
  ReviewThread,
} from "../types/review";
import type { MemberRole } from "../types/workspace";

const DEFAULT_NAVIGATION: ReviewNavigationState = { selectedThreadId: null, collapsedThreadIds: [] };

export function useReview(
  doc: Y.Doc | null | undefined,
  identity: ReviewAuthorIdentity,
  role: MemberRole,
  initialThreads: ReviewThread[] = [],
  initialFileStatusRecords: FileReviewStatusRecord[] = [],
) {
  const [threads, setThreads] = useState<ReviewThread[]>(initialThreads);
  const [fileStatusRecords, setFileStatusRecords] = useState<FileReviewStatusRecord[]>(initialFileStatusRecords);
  const [navigation, setNavigation] = useState<ReviewNavigationState>(DEFAULT_NAVIGATION);

  const permissions = getReviewPermissions(role);

  useEffect(() => {
    if (!doc) {
      return;
    }
    setThreads(readReviewThreads(doc));
    setFileStatusRecords(readFileReviewStatusRecords(doc));
    setNavigation(readReviewNavigation(doc));
    const unsubscribeThreads = subscribeReviewThreads(doc, setThreads);
    const unsubscribeFileStatus = subscribeFileReviewStatusRecords(doc, setFileStatusRecords);
    const unsubscribeNavigation = subscribeReviewNavigation(doc, setNavigation);
    return () => {
      unsubscribeThreads();
      unsubscribeFileStatus();
      unsubscribeNavigation();
    };
  }, [doc]);

  const commitThreads = useCallback(
    (next: ReviewThread[]) => {
      if (doc) {
        writeReviewThreads(doc, next);
      } else {
        setThreads(next);
      }
    },
    [doc],
  );

  const commitFileStatus = useCallback(
    (next: FileReviewStatusRecord[]) => {
      if (doc) {
        writeFileReviewStatusRecords(doc, next);
      } else {
        setFileStatusRecords(next);
      }
    },
    [doc],
  );

  const commitNavigation = useCallback(
    (next: ReviewNavigationState) => {
      if (doc) {
        writeReviewNavigation(doc, next);
      } else {
        setNavigation(next);
      }
    },
    [doc],
  );

  const createThread = useCallback(
    (params: {
      workspaceId: string;
      fileId: string;
      filePath: string;
      startLine: number;
      endLine: number;
      startColumn: number;
      endColumn: number;
      fileText: string;
      body: string;
    }) => {
      if (!permissions.canCreate || !params.body.trim()) {
        return;
      }
      const now = new Date().toISOString();
      const thread: ReviewThread = {
        id: `review-thread-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        fileId: params.fileId,
        anchor: buildReviewAnchor(params),
        status: "open",
        comments: [
          {
            id: `review-comment-${Date.now()}`,
            authorId: identity.id,
            authorIdentityType: identity.identityType,
            authorInitials: identity.initials,
            authorName: identity.name,
            body: params.body.trim(),
            tone: "default",
            createdAt: now,
            editedAt: null,
          },
        ],
        createdAt: now,
        resolvedAt: null,
        resolvedBy: null,
      };
      commitThreads(createReviewThreadEntry(threads, thread));
      commitNavigation({ ...navigation, selectedThreadId: thread.id });
    },
    [permissions.canCreate, identity, threads, commitThreads, navigation, commitNavigation],
  );

  const reply = useCallback(
    (threadId: string, body: string) => {
      if (!permissions.canReply || !body.trim()) {
        return;
      }
      commitThreads(
        appendReply(threads, threadId, {
          id: `review-comment-${Date.now()}`,
          authorId: identity.id,
          authorIdentityType: identity.identityType,
          authorInitials: identity.initials,
          authorName: identity.name,
          body: body.trim(),
          tone: "default",
          createdAt: new Date().toISOString(),
          editedAt: null,
        }),
      );
    },
    [permissions.canReply, threads, commitThreads, identity],
  );

  const edit = useCallback(
    (threadId: string, commentId: string, body: string) => {
      if (!permissions.canEditOwn || !body.trim()) {
        return;
      }
      commitThreads(editComment(threads, threadId, commentId, body.trim(), new Date().toISOString()));
    },
    [permissions.canEditOwn, threads, commitThreads],
  );

  const remove = useCallback(
    (threadId: string, commentId: string) => {
      if (!permissions.canDeleteOwn && !permissions.canDeleteAny) {
        return;
      }
      commitThreads(deleteComment(threads, threadId, commentId));
    },
    [permissions.canDeleteOwn, permissions.canDeleteAny, threads, commitThreads],
  );

  const removeThread = useCallback(
    (threadId: string) => {
      if (!permissions.canDeleteOwn && !permissions.canDeleteAny) {
        return;
      }
      commitThreads(deleteThread(threads, threadId));
    },
    [permissions.canDeleteOwn, permissions.canDeleteAny, threads, commitThreads],
  );

  const resolve = useCallback(
    (threadId: string) => {
      if (!permissions.canResolve) {
        return;
      }
      commitThreads(resolveThread(threads, threadId, identity.id, new Date().toISOString()));
    },
    [permissions.canResolve, threads, commitThreads, identity],
  );

  const reopen = useCallback(
    (threadId: string) => {
      if (!permissions.canReopen) {
        return;
      }
      commitThreads(reopenThread(threads, threadId));
    },
    [permissions.canReopen, threads, commitThreads],
  );

  const setFileStatus = useCallback(
    (fileId: string, status: FileReviewStatus) => {
      if (!permissions.canSetFileStatus) {
        return;
      }
      commitFileStatus(setFileReviewStatus(fileStatusRecords, fileId, status, identity.id, new Date().toISOString()));
    },
    [permissions.canSetFileStatus, fileStatusRecords, commitFileStatus, identity],
  );

  const getFileStatusFor = useCallback((fileId: string) => getFileReviewStatus(fileStatusRecords, fileId), [fileStatusRecords]);

  const selectThread = useCallback(
    (threadId: string | null) => commitNavigation({ ...navigation, selectedThreadId: threadId }),
    [navigation, commitNavigation],
  );

  const toggleCollapsed = useCallback(
    (threadId: string) => {
      const isCollapsed = navigation.collapsedThreadIds.includes(threadId);
      commitNavigation({
        ...navigation,
        collapsedThreadIds: isCollapsed
          ? navigation.collapsedThreadIds.filter((id) => id !== threadId)
          : [...navigation.collapsedThreadIds, threadId],
      });
    },
    [navigation, commitNavigation],
  );

  const threadsForFile = useCallback(
    (fileId: string) =>
      threads
        .filter((thread) => thread.fileId === fileId)
        .sort((a, b) => a.anchor.startLine - b.anchor.startLine),
    [threads],
  );

  const goToAdjacentThread = useCallback(
    (fileId: string, direction: "next" | "previous") => {
      const ordered = threadsForFile(fileId);
      if (ordered.length === 0) {
        return;
      }
      const currentIndex = ordered.findIndex((thread) => thread.id === navigation.selectedThreadId);
      let nextIndex: number;
      if (currentIndex === -1) {
        nextIndex = direction === "next" ? 0 : ordered.length - 1;
      } else {
        nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
      }
      const bounded = ((nextIndex % ordered.length) + ordered.length) % ordered.length;
      selectThread(ordered[bounded].id);
    },
    [threadsForFile, navigation.selectedThreadId, selectThread],
  );

  return {
    threads,
    fileStatusRecords,
    navigation,
    permissions,
    stats: computeReviewStats(threads),
    resolveAnchor: resolveReviewAnchor,
    threadsForFile,
    createThread,
    reply,
    edit,
    remove,
    removeThread,
    resolve,
    reopen,
    setFileStatus,
    getFileStatusFor,
    selectThread,
    toggleCollapsed,
    goToAdjacentThread,
  };
}
