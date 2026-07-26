import type {
  FileReviewStatus,
  FileReviewStatusRecord,
  ResolvedReviewAnchor,
  ReviewAnchor,
  ReviewComment,
  ReviewThread,
} from "../types/review";

export interface ReviewStats {
  commentCount: number;
  openCount: number;
  resolvedCount: number;
  orphanedCount: number;
}

const NEARBY_WINDOW = 5;

export function computeReviewStats(threads: ReviewThread[], currentFileTextByFileId: Record<string, string> = {}): ReviewStats {
  const commentCount = threads.reduce((total, thread) => total + thread.comments.length, 0);
  const openCount = threads.filter((thread) => thread.status === "open").length;
  const resolvedCount = threads.filter((thread) => thread.status === "resolved").length;
  const orphanedCount = threads.filter((thread) => {
    const fileText = currentFileTextByFileId[thread.fileId];
    if (fileText === undefined) {
      return false;
    }
    return resolveReviewAnchor(thread.anchor, fileText).confidence === "orphaned";
  }).length;
  return { commentCount, openCount, resolvedCount, orphanedCount };
}

export function createThread(threads: ReviewThread[], thread: ReviewThread): ReviewThread[] {
  return [...threads, thread];
}

export function appendReply(threads: ReviewThread[], threadId: string, comment: ReviewComment): ReviewThread[] {
  return threads.map((thread) =>
    thread.id === threadId ? { ...thread, comments: [...thread.comments, comment] } : thread,
  );
}

export function editComment(
  threads: ReviewThread[],
  threadId: string,
  commentId: string,
  body: string,
  editedAt: string,
): ReviewThread[] {
  return threads.map((thread) => {
    if (thread.id !== threadId) {
      return thread;
    }
    return {
      ...thread,
      comments: thread.comments.map((comment) =>
        comment.id === commentId ? { ...comment, body, editedAt } : comment,
      ),
    };
  });
}

export function deleteComment(threads: ReviewThread[], threadId: string, commentId: string): ReviewThread[] {
  return threads
    .map((thread) => {
      if (thread.id !== threadId) {
        return thread;
      }
      return { ...thread, comments: thread.comments.filter((comment) => comment.id !== commentId) };
    })
    .filter((thread) => thread.comments.length > 0);
}

export function deleteThread(threads: ReviewThread[], threadId: string): ReviewThread[] {
  return threads.filter((thread) => thread.id !== threadId);
}

export function resolveThread(threads: ReviewThread[], threadId: string, resolvedBy: string, resolvedAt: string): ReviewThread[] {
  return threads.map((thread) =>
    thread.id === threadId ? { ...thread, status: "resolved", resolvedBy, resolvedAt } : thread,
  );
}

export function reopenThread(threads: ReviewThread[], threadId: string): ReviewThread[] {
  return threads.map((thread) =>
    thread.id === threadId ? { ...thread, status: "open", resolvedBy: null, resolvedAt: null } : thread,
  );
}

export function buildReviewAnchor(params: {
  workspaceId: string;
  fileId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  fileText: string;
}): ReviewAnchor {
  const lines = params.fileText.split("\n");
  const snapshot = lines.slice(params.startLine - 1, params.endLine).join("\n");
  return {
    workspaceId: params.workspaceId,
    fileId: params.fileId,
    filePath: params.filePath,
    startLine: params.startLine,
    endLine: params.endLine,
    startColumn: params.startColumn,
    endColumn: params.endColumn,
    snapshot,
    revision: params.fileText.length,
  };
}

export function resolveReviewAnchor(anchor: ReviewAnchor, currentFileText: string): ResolvedReviewAnchor {
  const lines = currentFileText.split("\n");
  const lineSpan = anchor.endLine - anchor.startLine;

  if (currentFileText.length === anchor.revision) {
    return { line: anchor.startLine, endLine: anchor.endLine, confidence: "exact" };
  }

  const trimmedSnapshot = anchor.snapshot.trim();
  if (trimmedSnapshot.length > 0) {
    const searchStart = Math.max(0, anchor.startLine - 1 - NEARBY_WINDOW);
    const searchEnd = Math.min(lines.length, anchor.startLine - 1 + NEARBY_WINDOW);
    for (let index = searchStart; index < searchEnd; index += 1) {
      const candidate = lines.slice(index, index + lineSpan + 1).join("\n").trim();
      if (candidate.length > 0 && candidate === trimmedSnapshot) {
        return { line: index + 1, endLine: index + 1 + lineSpan, confidence: "nearby" };
      }
    }

    for (let index = 0; index < lines.length; index += 1) {
      const candidate = lines.slice(index, index + lineSpan + 1).join("\n").trim();
      if (candidate.length > 0 && candidate === trimmedSnapshot) {
        return { line: index + 1, endLine: index + 1 + lineSpan, confidence: "snapshot" };
      }
    }
  }

  return { line: anchor.startLine, endLine: anchor.endLine, confidence: "orphaned" };
}

export function setFileReviewStatus(
  records: FileReviewStatusRecord[],
  fileId: string,
  status: FileReviewStatus,
  updatedBy: string,
  updatedAt: string,
): FileReviewStatusRecord[] {
  const existingIndex = records.findIndex((record) => record.fileId === fileId);
  const nextRecord: FileReviewStatusRecord = { fileId, status, updatedAt, updatedBy };
  if (existingIndex === -1) {
    return [...records, nextRecord];
  }
  return records.map((record, index) => (index === existingIndex ? nextRecord : record));
}

const FILE_STATUS_CYCLE_ORDER: FileReviewStatus[] = ["not_reviewed", "in_review", "reviewed"];

export function getNextFileReviewStatus(status: FileReviewStatus): FileReviewStatus {
  const currentIndex = FILE_STATUS_CYCLE_ORDER.indexOf(status);
  return FILE_STATUS_CYCLE_ORDER[(currentIndex + 1) % FILE_STATUS_CYCLE_ORDER.length];
}

export function getFileReviewStatus(records: FileReviewStatusRecord[], fileId: string): FileReviewStatus {
  return records.find((record) => record.fileId === fileId)?.status ?? "not_reviewed";
}

export function countReviewedFiles(records: FileReviewStatusRecord[]): number {
  return records.filter((record) => record.status === "reviewed").length;
}
