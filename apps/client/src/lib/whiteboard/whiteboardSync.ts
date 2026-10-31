import * as Y from "yjs";

const ELEMENTS_KEY = "whiteboardElements";
const FILES_KEY = "whiteboardFiles";
const AUTHORS_KEY = "whiteboardAuthors";
const AUTHORSHIP_REFRESH_MS = 60_000;

export interface WhiteboardAuthor {
  userId: string;
  name: string;
  color: string;
}

export interface ElementAuthorship {
  createdBy: WhiteboardAuthor;
  createdAt: number;
  updatedBy: WhiteboardAuthor;
  updatedAt: number;
}

export const MAX_WHITEBOARD_FILE_BYTES = 1_500_000;

export const LOCAL_WHITEBOARD_ORIGIN = Symbol("whiteboard-local");

export interface SyncedElement {
  id: string;
  version: number;
  versionNonce: number;
  isDeleted?: boolean;
  [key: string]: unknown;
}

export interface SyncedFile {
  id: string;
  mimeType: string;
  dataURL: string;
  created: number;
  [key: string]: unknown;
}

export function getWhiteboardElementsMap(doc: Y.Doc): Y.Map<SyncedElement> {
  return doc.getMap<SyncedElement>(ELEMENTS_KEY);
}

export function getWhiteboardFilesMap(doc: Y.Doc): Y.Map<SyncedFile> {
  return doc.getMap<SyncedFile>(FILES_KEY);
}

export function readWhiteboardElements(doc: Y.Doc): SyncedElement[] {
  return Array.from(getWhiteboardElementsMap(doc).values());
}

export function readWhiteboardFiles(doc: Y.Doc): SyncedFile[] {
  return Array.from(getWhiteboardFilesMap(doc).values());
}

export function isNewerElement(candidate: SyncedElement, stored: SyncedElement | undefined): boolean {
  if (!stored) {
    return true;
  }
  if (candidate.version !== stored.version) {
    return candidate.version > stored.version;
  }
  return candidate.versionNonce !== stored.versionNonce && candidate.versionNonce < stored.versionNonce;
}

export function getWhiteboardAuthorsMap(doc: Y.Doc): Y.Map<ElementAuthorship> {
  return doc.getMap<ElementAuthorship>(AUTHORS_KEY);
}

export function readElementAuthorship(doc: Y.Doc, elementId: string): ElementAuthorship | undefined {
  return getWhiteboardAuthorsMap(doc).get(elementId);
}

function recordAuthorship(authors: Y.Map<ElementAuthorship>, element: SyncedElement, author: WhiteboardAuthor, now: number): void {
  const existing = authors.get(element.id);
  if (!existing) {
    authors.set(element.id, { createdBy: author, createdAt: now, updatedBy: author, updatedAt: now });
    return;
  }
  if (element.isDeleted) {
    return;
  }
  if (existing.updatedBy.userId !== author.userId || now - existing.updatedAt > AUTHORSHIP_REFRESH_MS) {
    authors.set(element.id, { ...existing, updatedBy: author, updatedAt: now });
  }
}

export function writeLocalElements(doc: Y.Doc, elements: readonly SyncedElement[], author?: WhiteboardAuthor, now = Date.now()): number {
  const map = getWhiteboardElementsMap(doc);
  const changed = elements.filter((element) => isNewerElement(element, map.get(element.id)));
  if (changed.length === 0) {
    return 0;
  }
  const authors = getWhiteboardAuthorsMap(doc);
  doc.transact(() => {
    for (const element of changed) {
      map.set(element.id, JSON.parse(JSON.stringify(element)) as SyncedElement);
      if (author) {
        recordAuthorship(authors, element, author, now);
      }
    }
  }, LOCAL_WHITEBOARD_ORIGIN);
  return changed.length;
}

export function writeLocalFiles(doc: Y.Doc, files: readonly SyncedFile[]): void {
  const map = getWhiteboardFilesMap(doc);
  const fresh = files.filter((file) => !map.has(file.id) && file.dataURL.length <= MAX_WHITEBOARD_FILE_BYTES);
  if (fresh.length === 0) {
    return;
  }
  doc.transact(() => {
    for (const file of fresh) {
      map.set(file.id, { id: file.id, mimeType: file.mimeType, dataURL: file.dataURL, created: file.created });
    }
  }, LOCAL_WHITEBOARD_ORIGIN);
}
