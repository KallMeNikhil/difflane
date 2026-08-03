import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { ActivityEvent, DeletedFileRecord, DiscussionComment, DiscussionFeedItem, DiscussionThread } from "../types/workspace";
import type { FileReviewStatusRecord, ReviewComment, ReviewThread } from "../types/review";

const FILE_TEXTS_KEY = "fileTexts";
const DISCUSSION_FEED_KEY = "discussionFeed";
const REVIEW_THREADS_KEY = "reviewThreads";
const REVIEW_STATE_KEY = "reviewState";
const FILE_BASELINES_KEY = "fileBaselines";
const DELETED_FILES_KEY = "deletedFiles";

export function createRoomDoc(): { doc: Y.Doc; awareness: Awareness } {
  const doc = new Y.Doc();
  return { doc, awareness: new Awareness(doc) };
}

export function getFileText(doc: Y.Doc, fileId: string): Y.Text {
  const fileTexts = doc.getMap<Y.Text>(FILE_TEXTS_KEY);
  const existing = fileTexts.get(fileId);
  if (existing) {
    return existing;
  }
  const text = new Y.Text();
  fileTexts.set(fileId, text);
  return text;
}

export function seedFileTextIfEmpty(doc: Y.Doc, fileId: string, seedContent: string): void {
  const text = getFileText(doc, fileId);
  if (text.length === 0 && seedContent.length > 0) {
    text.insert(0, seedContent);
  }
}

export function peekFileText(doc: Y.Doc, fileId: string): string {
  const fileTexts = doc.getMap<Y.Text>(FILE_TEXTS_KEY);
  return fileTexts.get(fileId)?.toString() ?? "";
}

export function removeFileText(doc: Y.Doc, fileId: string): void {
  const fileTexts = doc.getMap<Y.Text>(FILE_TEXTS_KEY);
  fileTexts.delete(fileId);
}

export function subscribeFileTextsChanged(doc: Y.Doc, listener: () => void): () => void {
  const fileTexts = doc.getMap<Y.Text>(FILE_TEXTS_KEY);
  const handler = () => listener();
  fileTexts.observeDeep(handler);
  return () => fileTexts.unobserveDeep(handler);
}

function getFileBaselinesMap(doc: Y.Doc): Y.Map<string> {
  return doc.getMap<string>(FILE_BASELINES_KEY);
}

export function readFileBaseline(doc: Y.Doc, fileId: string): string | undefined {
  return getFileBaselinesMap(doc).get(fileId);
}

export function readFileBaselines(doc: Y.Doc): Record<string, string> {
  return Object.fromEntries(getFileBaselinesMap(doc).entries());
}

export function writeFileBaseline(doc: Y.Doc, fileId: string, content: string): void {
  getFileBaselinesMap(doc).set(fileId, content);
}

export function writeFileBaselines(doc: Y.Doc, baselines: Record<string, string>): void {
  const map = getFileBaselinesMap(doc);
  doc.transact(() => {
    for (const [fileId, content] of Object.entries(baselines)) {
      map.set(fileId, content);
    }
  });
}

export function removeFileBaseline(doc: Y.Doc, fileId: string): void {
  getFileBaselinesMap(doc).delete(fileId);
}

export function clearFileBaselines(doc: Y.Doc): void {
  const map = getFileBaselinesMap(doc);
  doc.transact(() => {
    for (const key of Array.from(map.keys())) {
      map.delete(key);
    }
  });
}

export function subscribeFileBaselines(doc: Y.Doc, listener: (baselines: Record<string, string>) => void): () => void {
  const map = getFileBaselinesMap(doc);
  const handler = () => listener(readFileBaselines(doc));
  map.observe(handler);
  return () => map.unobserve(handler);
}

function getDeletedFilesMap(doc: Y.Doc): Y.Map<DeletedFileRecord> {
  return doc.getMap<DeletedFileRecord>(DELETED_FILES_KEY);
}

export function readDeletedFiles(doc: Y.Doc): DeletedFileRecord[] {
  return Array.from(getDeletedFilesMap(doc).values());
}

export function writeDeletedFile(doc: Y.Doc, record: DeletedFileRecord): void {
  getDeletedFilesMap(doc).set(record.id, record);
}

export function removeDeletedFile(doc: Y.Doc, fileId: string): void {
  getDeletedFilesMap(doc).delete(fileId);
}

export function clearDeletedFiles(doc: Y.Doc): void {
  const map = getDeletedFilesMap(doc);
  doc.transact(() => {
    for (const key of Array.from(map.keys())) {
      map.delete(key);
    }
  });
}

export function subscribeDeletedFiles(doc: Y.Doc, listener: (records: DeletedFileRecord[]) => void): () => void {
  const map = getDeletedFilesMap(doc);
  const handler = () => listener(readDeletedFiles(doc));
  map.observe(handler);
  return () => map.unobserve(handler);
}

function getDiscussionArray(doc: Y.Doc): Y.Array<Y.Map<unknown> | DiscussionFeedItem> {
  return doc.getArray(DISCUSSION_FEED_KEY);
}

function isThreadMap(item: Y.Map<unknown> | DiscussionFeedItem): item is Y.Map<unknown> {
  return item instanceof Y.Map;
}

function readDiscussionThreadMap(threadMap: Y.Map<unknown>): DiscussionThread {
  const comments = threadMap.get("comments");
  return {
    id: threadMap.get("id") as string,
    status: threadMap.get("status") as DiscussionThread["status"],
    anchor: threadMap.get("anchor") as DiscussionThread["anchor"],
    comments: comments instanceof Y.Array ? (comments.toArray() as DiscussionComment[]) : [],
  };
}

function findDiscussionThreadIndex(array: Y.Array<Y.Map<unknown> | DiscussionFeedItem>, threadId: string): number {
  const items = array.toArray();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (isThreadMap(item) && item.get("id") === threadId) {
      return index;
    }
  }
  return -1;
}

function findDiscussionThreadMap(array: Y.Array<Y.Map<unknown> | DiscussionFeedItem>, threadId: string): Y.Map<unknown> | undefined {
  const index = findDiscussionThreadIndex(array, threadId);
  if (index === -1) {
    return undefined;
  }
  const item = array.get(index);
  return isThreadMap(item) ? item : undefined;
}

export function readDiscussionFeed(doc: Y.Doc): DiscussionFeedItem[] {
  return getDiscussionArray(doc)
    .toArray()
    .map((item) => (isThreadMap(item) ? { kind: "thread", thread: readDiscussionThreadMap(item) } : (item as DiscussionFeedItem)));
}

export function subscribeDiscussionFeed(doc: Y.Doc, listener: (feed: DiscussionFeedItem[]) => void): () => void {
  const sharedArray = getDiscussionArray(doc);
  const handler = () => listener(readDiscussionFeed(doc));
  sharedArray.observeDeep(handler);
  return () => sharedArray.unobserveDeep(handler);
}

export function createDiscussionThread(doc: Y.Doc, thread: DiscussionThread): void {
  const array = getDiscussionArray(doc);
  doc.transact(() => {
    const threadMap = new Y.Map<unknown>();
    threadMap.set("id", thread.id);
    threadMap.set("status", thread.status);
    threadMap.set("anchor", thread.anchor ?? null);
    const comments = new Y.Array<DiscussionComment>();
    comments.push(thread.comments);
    threadMap.set("comments", comments);
    array.push([threadMap]);
  });
}

export function appendDiscussionActivityEvent(doc: Y.Doc, event: ActivityEvent): void {
  getDiscussionArray(doc).push([{ kind: "event", event }]);
}

export function appendDiscussionReply(doc: Y.Doc, threadId: string, comment: DiscussionComment): void {
  const threadMap = findDiscussionThreadMap(getDiscussionArray(doc), threadId);
  const comments = threadMap?.get("comments");
  if (comments instanceof Y.Array) {
    comments.push([comment]);
  }
}

export function setDiscussionThreadStatus(doc: Y.Doc, threadId: string, status: DiscussionThread["status"]): void {
  findDiscussionThreadMap(getDiscussionArray(doc), threadId)?.set("status", status);
}

export function editDiscussionComment(doc: Y.Doc, threadId: string, commentId: string, body: string): void {
  const threadMap = findDiscussionThreadMap(getDiscussionArray(doc), threadId);
  const comments = threadMap?.get("comments");
  if (!(comments instanceof Y.Array)) {
    return;
  }
  doc.transact(() => {
    const items = comments.toArray() as DiscussionComment[];
    const index = items.findIndex((comment) => comment.id === commentId);
    if (index === -1) {
      return;
    }
    comments.delete(index, 1);
    comments.insert(index, [{ ...items[index], body }]);
  });
}

export function deleteDiscussionComment(doc: Y.Doc, threadId: string, commentId: string): void {
  const array = getDiscussionArray(doc);
  const threadMap = findDiscussionThreadMap(array, threadId);
  const comments = threadMap?.get("comments");
  if (!threadMap || !(comments instanceof Y.Array)) {
    return;
  }
  doc.transact(() => {
    const items = comments.toArray() as DiscussionComment[];
    const index = items.findIndex((comment) => comment.id === commentId);
    if (index === -1) {
      return;
    }
    comments.delete(index, 1);
    if (comments.length === 0) {
      const threadIndex = findDiscussionThreadIndex(array, threadId);
      if (threadIndex !== -1) {
        array.delete(threadIndex, 1);
      }
    }
  });
}

export function deleteDiscussionThread(doc: Y.Doc, threadId: string): void {
  const array = getDiscussionArray(doc);
  const index = findDiscussionThreadIndex(array, threadId);
  if (index !== -1) {
    array.delete(index, 1);
  }
}

function getReviewThreadsArray(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray(REVIEW_THREADS_KEY);
}

function readReviewThreadMap(threadMap: Y.Map<unknown>): ReviewThread {
  const comments = threadMap.get("comments");
  return {
    id: threadMap.get("id") as string,
    fileId: threadMap.get("fileId") as string,
    anchor: threadMap.get("anchor") as ReviewThread["anchor"],
    status: threadMap.get("status") as ReviewThread["status"],
    comments: comments instanceof Y.Array ? (comments.toArray() as ReviewComment[]) : [],
    createdAt: threadMap.get("createdAt") as string,
    resolvedAt: (threadMap.get("resolvedAt") as string | null) ?? null,
    resolvedBy: (threadMap.get("resolvedBy") as string | null) ?? null,
  };
}

function findReviewThreadIndex(array: Y.Array<Y.Map<unknown>>, threadId: string): number {
  const items = array.toArray();
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].get("id") === threadId) {
      return index;
    }
  }
  return -1;
}

function findReviewThreadMap(array: Y.Array<Y.Map<unknown>>, threadId: string): Y.Map<unknown> | undefined {
  const index = findReviewThreadIndex(array, threadId);
  return index === -1 ? undefined : array.get(index);
}

export function readReviewThreads(doc: Y.Doc): ReviewThread[] {
  return getReviewThreadsArray(doc)
    .toArray()
    .map((threadMap) => readReviewThreadMap(threadMap));
}

export function subscribeReviewThreads(doc: Y.Doc, listener: (threads: ReviewThread[]) => void): () => void {
  const sharedArray = getReviewThreadsArray(doc);
  const handler = () => listener(readReviewThreads(doc));
  sharedArray.observeDeep(handler);
  return () => sharedArray.unobserveDeep(handler);
}

export function createReviewThread(doc: Y.Doc, thread: ReviewThread): void {
  const array = getReviewThreadsArray(doc);
  doc.transact(() => {
    const threadMap = new Y.Map<unknown>();
    threadMap.set("id", thread.id);
    threadMap.set("fileId", thread.fileId);
    threadMap.set("anchor", thread.anchor);
    threadMap.set("status", thread.status);
    threadMap.set("createdAt", thread.createdAt);
    threadMap.set("resolvedAt", thread.resolvedAt);
    threadMap.set("resolvedBy", thread.resolvedBy);
    const comments = new Y.Array<ReviewComment>();
    comments.push(thread.comments);
    threadMap.set("comments", comments);
    array.push([threadMap]);
  });
}

export function appendReviewReply(doc: Y.Doc, threadId: string, comment: ReviewComment): void {
  const threadMap = findReviewThreadMap(getReviewThreadsArray(doc), threadId);
  const comments = threadMap?.get("comments");
  if (comments instanceof Y.Array) {
    comments.push([comment]);
  }
}

export function editReviewComment(doc: Y.Doc, threadId: string, commentId: string, body: string, editedAt: string): void {
  const threadMap = findReviewThreadMap(getReviewThreadsArray(doc), threadId);
  const comments = threadMap?.get("comments");
  if (!(comments instanceof Y.Array)) {
    return;
  }
  doc.transact(() => {
    const items = comments.toArray() as ReviewComment[];
    const index = items.findIndex((comment) => comment.id === commentId);
    if (index === -1) {
      return;
    }
    comments.delete(index, 1);
    comments.insert(index, [{ ...items[index], body, editedAt }]);
  });
}

export function deleteReviewComment(doc: Y.Doc, threadId: string, commentId: string): void {
  const array = getReviewThreadsArray(doc);
  const threadMap = findReviewThreadMap(array, threadId);
  const comments = threadMap?.get("comments");
  if (!threadMap || !(comments instanceof Y.Array)) {
    return;
  }
  doc.transact(() => {
    const items = comments.toArray() as ReviewComment[];
    const index = items.findIndex((comment) => comment.id === commentId);
    if (index === -1) {
      return;
    }
    comments.delete(index, 1);
    if (comments.length === 0) {
      const threadIndex = findReviewThreadIndex(array, threadId);
      if (threadIndex !== -1) {
        array.delete(threadIndex, 1);
      }
    }
  });
}

export function deleteReviewThread(doc: Y.Doc, threadId: string): void {
  const array = getReviewThreadsArray(doc);
  const index = findReviewThreadIndex(array, threadId);
  if (index !== -1) {
    array.delete(index, 1);
  }
}

export function resolveReviewThread(doc: Y.Doc, threadId: string, resolvedBy: string, resolvedAt: string): void {
  const threadMap = findReviewThreadMap(getReviewThreadsArray(doc), threadId);
  if (!threadMap) {
    return;
  }
  doc.transact(() => {
    threadMap.set("status", "resolved");
    threadMap.set("resolvedBy", resolvedBy);
    threadMap.set("resolvedAt", resolvedAt);
  });
}

export function reopenReviewThread(doc: Y.Doc, threadId: string): void {
  const threadMap = findReviewThreadMap(getReviewThreadsArray(doc), threadId);
  if (!threadMap) {
    return;
  }
  doc.transact(() => {
    threadMap.set("status", "open");
    threadMap.set("resolvedBy", null);
    threadMap.set("resolvedAt", null);
  });
}

function getReviewStateMap(doc: Y.Doc): Y.Map<FileReviewStatusRecord> {
  return doc.getMap(REVIEW_STATE_KEY);
}

export function readFileReviewStatusRecords(doc: Y.Doc): FileReviewStatusRecord[] {
  return Array.from(getReviewStateMap(doc).values());
}

export function writeFileReviewStatusRecord(doc: Y.Doc, record: FileReviewStatusRecord): void {
  getReviewStateMap(doc).set(record.fileId, record);
}

export function subscribeFileReviewStatusRecords(
  doc: Y.Doc,
  listener: (records: FileReviewStatusRecord[]) => void,
): () => void {
  const map = getReviewStateMap(doc);
  const handler = () => listener(readFileReviewStatusRecords(doc));
  map.observe(handler);
  return () => map.unobserve(handler);
}
