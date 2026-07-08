import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { DiscussionFeedItem } from "../types/workspace";

const FILE_TEXTS_KEY = "fileTexts";
const WORKSPACE_STATE_KEY = "workspaceState";
const DISCUSSION_FEED_KEY = "discussionFeed";

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
