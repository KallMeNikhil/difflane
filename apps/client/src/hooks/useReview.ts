import { useCallback, useEffect, useState } from "react";
import type * as Y from "yjs";
import {
  appendReviewReply,
  createReviewThread as createReviewThreadDoc,
  deleteReviewComment,
  deleteReviewThread,
  editReviewComment,
  readFileReviewStatusRecords,
  readReviewThreads,
  reopenReviewThread,
  resolveReviewThread,
  subscribeFileReviewStatusRecords,
  subscribeReviewThreads,
  writeFileReviewStatusRecord,
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
    const unsubscribeThreads = subscribeReviewThreads(doc, setThreads);
    const unsubscribeFileStatus = subscribeFileReviewStatusRecords(doc, setFileStatusRecords);
    return () => {
      unsubscribeThreads();
      unsubscribeFileStatus();
    };
  }, [doc]);

  const commitFileStatus = useCallback(
    (next: FileReviewStatusRecord) => {
      if (doc) {
        writeFileReviewStatusRecord(doc, next);
      } else {
        setFileStatusRecords((prev) => setFileReviewStatus(prev, next.fileId, next.status, next.updatedBy ?? "system", next.updatedAt));
      }
    },
    [doc],
  );

  const commitNavigation = useCallback((next: ReviewNavigationState) => setNavigation(next), []);

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
      if (doc) {
        createReviewThreadDoc(doc, thread);
      } else {
        setThreads((prev) => createReviewThreadEntry(prev, thread));
      }
      commitNavigation({ ...navigation, selectedThreadId: thread.id });
    },
    [permissions.canCreate, identity, doc, navigation, commitNavigation],
  );

  const reply = useCallback(
    (threadId: string, body: string) => {
      const trimmed = body.trim();
      if (!permissions.canReply || !trimmed) {
        return;
      }
      const comment = {
        id: `review-comment-${Date.now()}`,
        authorId: identity.id,
        authorIdentityType: identity.identityType,
        authorInitials: identity.initials,
        authorName: identity.name,
        body: trimmed,
        tone: "default" as const,
        createdAt: new Date().toISOString(),
        editedAt: null,
      };
      if (doc) {
        appendReviewReply(doc, threadId, comment);
      } else {
        setThreads((prev) => appendReply(prev, threadId, comment));
      }
    },
    [permissions.canReply, doc, identity],
  );

  const edit = useCallback(
    (threadId: string, commentId: string, body: string) => {
      const trimmed = body.trim();
      if (!permissions.canEditOwn || !trimmed) {
        return;
      }
      if (doc) {
        editReviewComment(doc, threadId, commentId, trimmed, new Date().toISOString());
      } else {
        setThreads((prev) => editComment(prev, threadId, commentId, trimmed, new Date().toISOString()));
      }
    },
    [permissions.canEditOwn, doc],
  );

  const remove = useCallback(
    (threadId: string, commentId: string) => {
      if (!permissions.canDeleteOwn && !permissions.canDeleteAny) {
        return;
      }
      if (doc) {
        deleteReviewComment(doc, threadId, commentId);
      } else {
        setThreads((prev) => deleteComment(prev, threadId, commentId));
      }
    },
    [permissions.canDeleteOwn, permissions.canDeleteAny, doc],
  );

  const removeThread = useCallback(
    (threadId: string) => {
      if (!permissions.canDeleteOwn && !permissions.canDeleteAny) {
        return;
      }
      if (doc) {
        deleteReviewThread(doc, threadId);
      } else {
        setThreads((prev) => deleteThread(prev, threadId));
      }
    },
    [permissions.canDeleteOwn, permissions.canDeleteAny, doc],
  );

  const resolve = useCallback(
    (threadId: string) => {
      if (!permissions.canResolve) {
        return;
      }
      if (doc) {
        resolveReviewThread(doc, threadId, identity.id, new Date().toISOString());
      } else {
        setThreads((prev) => resolveThread(prev, threadId, identity.id, new Date().toISOString()));
      }
    },
    [permissions.canResolve, doc, identity],
  );

  const reopen = useCallback(
    (threadId: string) => {
      if (!permissions.canReopen) {
        return;
      }
      if (doc) {
        reopenReviewThread(doc, threadId);
      } else {
        setThreads((prev) => reopenThread(prev, threadId));
      }
    },
    [permissions.canReopen, doc],
  );

  const setFileStatus = useCallback(
    (fileId: string, status: FileReviewStatus) => {
      if (!permissions.canSetFileStatus) {
        return;
      }
      commitFileStatus({ fileId, status, updatedAt: new Date().toISOString(), updatedBy: identity.id });
    },
    [permissions.canSetFileStatus, commitFileStatus, identity],
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
