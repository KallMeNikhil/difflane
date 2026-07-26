import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { DeletedFileRecord, DiscussionFeedItem } from "../types/workspace";
import type { FileReviewStatusRecord, ReviewNavigationState, ReviewThread } from "../types/review";

const FILE_TEXTS_KEY = "fileTexts";
const WORKSPACE_STATE_KEY = "workspaceState";
const DISCUSSION_FEED_KEY = "discussionFeed";
const REVIEW_THREADS_KEY = "reviewThreads";
const REVIEW_STATE_KEY = "reviewState";
const REVIEW_NAVIGATION_KEY = "reviewNavigation";
const FILE_BASELINES_KEY = "fileBaselines";
const DELETED_FILES_KEY = "deletedFiles";

export interface SharedWorkspaceState {
  activeFileId: string | null;
  openFileIds: string[];
}

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

function getWorkspaceStateMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(WORKSPACE_STATE_KEY);
}

export function readWorkspaceState(doc: Y.Doc): SharedWorkspaceState {
  const map = getWorkspaceStateMap(doc);
  const activeFileId = map.get("activeFileId");
  const openFileIds = map.get("openFileIds");
  return {
    activeFileId: typeof activeFileId === "string" ? activeFileId : null,
    openFileIds: Array.isArray(openFileIds) ? (openFileIds as string[]) : [],
  };
}

export function writeActiveFileId(doc: Y.Doc, fileId: string): void {
  getWorkspaceStateMap(doc).set("activeFileId", fileId);
}

export function writeOpenFileIds(doc: Y.Doc, fileIds: string[]): void {
  getWorkspaceStateMap(doc).set("openFileIds", fileIds);
}

export function subscribeWorkspaceState(doc: Y.Doc, listener: (state: SharedWorkspaceState) => void): () => void {
  const map = getWorkspaceStateMap(doc);
  const handler = () => listener(readWorkspaceState(doc));
  map.observe(handler);
  return () => map.unobserve(handler);
}

function getDiscussionArray(doc: Y.Doc): Y.Array<DiscussionFeedItem> {
  return doc.getArray(DISCUSSION_FEED_KEY);
}

export function readDiscussionFeed(doc: Y.Doc): DiscussionFeedItem[] {
  return getDiscussionArray(doc).toArray();
}

export function writeDiscussionFeed(doc: Y.Doc, feed: DiscussionFeedItem[]): void {
  const sharedArray = getDiscussionArray(doc);
  doc.transact(() => {
    sharedArray.delete(0, sharedArray.length);
    sharedArray.insert(0, feed);
  });
}

export function subscribeDiscussionFeed(doc: Y.Doc, listener: (feed: DiscussionFeedItem[]) => void): () => void {
  const sharedArray = getDiscussionArray(doc);
  const handler = () => listener(sharedArray.toArray());
  sharedArray.observe(handler);
  return () => sharedArray.unobserve(handler);
}

function getReviewThreadsArray(doc: Y.Doc): Y.Array<ReviewThread> {
  return doc.getArray(REVIEW_THREADS_KEY);
}

export function readReviewThreads(doc: Y.Doc): ReviewThread[] {
  return getReviewThreadsArray(doc).toArray();
}

export function writeReviewThreads(doc: Y.Doc, threads: ReviewThread[]): void {
  const sharedArray = getReviewThreadsArray(doc);
  doc.transact(() => {
    sharedArray.delete(0, sharedArray.length);
    sharedArray.insert(0, threads);
  });
}

export function subscribeReviewThreads(doc: Y.Doc, listener: (threads: ReviewThread[]) => void): () => void {
  const sharedArray = getReviewThreadsArray(doc);
  const handler = () => listener(sharedArray.toArray());
  sharedArray.observe(handler);
  return () => sharedArray.unobserve(handler);
}

function getReviewStateMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(REVIEW_STATE_KEY);
}

export function readFileReviewStatusRecords(doc: Y.Doc): FileReviewStatusRecord[] {
  const records = getReviewStateMap(doc).get("fileReviewStatus");
  return Array.isArray(records) ? (records as FileReviewStatusRecord[]) : [];
}

export function writeFileReviewStatusRecords(doc: Y.Doc, records: FileReviewStatusRecord[]): void {
  getReviewStateMap(doc).set("fileReviewStatus", records);
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

function getReviewNavigationMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(REVIEW_NAVIGATION_KEY);
}

export function readReviewNavigation(doc: Y.Doc): ReviewNavigationState {
  const map = getReviewNavigationMap(doc);
  const selectedThreadId = map.get("selectedThreadId");
  const collapsedThreadIds = map.get("collapsedThreadIds");
  return {
    selectedThreadId: typeof selectedThreadId === "string" ? selectedThreadId : null,
    collapsedThreadIds: Array.isArray(collapsedThreadIds) ? (collapsedThreadIds as string[]) : [],
  };
}

export function writeReviewNavigation(doc: Y.Doc, navigation: ReviewNavigationState): void {
  const map = getReviewNavigationMap(doc);
  doc.transact(() => {
    map.set("selectedThreadId", navigation.selectedThreadId);
    map.set("collapsedThreadIds", navigation.collapsedThreadIds);
  });
}

export function subscribeReviewNavigation(doc: Y.Doc, listener: (navigation: ReviewNavigationState) => void): () => void {
  const map = getReviewNavigationMap(doc);
  const handler = () => listener(readReviewNavigation(doc));
  map.observe(handler);
  return () => map.unobserve(handler);
}
