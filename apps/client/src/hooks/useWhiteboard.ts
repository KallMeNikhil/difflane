import { useCallback, useEffect, useMemo, useRef } from "react";
import type * as Y from "yjs";
import {
  getWhiteboardElementsMap,
  getWhiteboardFilesMap,
  LOCAL_WHITEBOARD_ORIGIN,
  readWhiteboardElements,
  readWhiteboardFiles,
  writeLocalElements,
  writeLocalFiles,
  type SyncedElement,
  type SyncedFile,
  type WhiteboardAuthor,
} from "../lib/whiteboard/whiteboardSync";

const LOCAL_FLUSH_DELAY_MS = 80;

export interface WhiteboardSceneApi {
  getSceneElementsIncludingDeleted(): readonly SyncedElement[];
  getFiles(): Record<string, SyncedFile>;
  addFiles(files: SyncedFile[]): void;
  applyRemoteElements(remote: SyncedElement[]): void;
}

export interface UseWhiteboardResult {
  initialElements: SyncedElement[];
  initialFiles: SyncedFile[];
  handleLocalChange: (elements: readonly SyncedElement[], files: Record<string, SyncedFile>) => void;
}

export function useWhiteboard(
  doc: Y.Doc | null,
  api: WhiteboardSceneApi | null,
  readOnly: boolean,
  getAuthor: () => WhiteboardAuthor | undefined,
): UseWhiteboardResult {
  const pendingRef = useRef<{ elements: readonly SyncedElement[]; files: Record<string, SyncedFile> } | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initial = useMemo(
    () => ({ elements: doc ? readWhiteboardElements(doc) : [], files: doc ? readWhiteboardFiles(doc) : [] }),
    [doc],
  );

  useEffect(() => {
    if (!doc || !api) {
      return;
    }
    const elementsMap = getWhiteboardElementsMap(doc);
    const filesMap = getWhiteboardFilesMap(doc);

    const handleElements = (event: Y.YMapEvent<SyncedElement>) => {
      if (event.transaction.origin === LOCAL_WHITEBOARD_ORIGIN) {
        return;
      }
      const remote: SyncedElement[] = [];
      for (const key of event.keysChanged) {
        const element = elementsMap.get(key);
        if (element) {
          remote.push(element);
        }
      }
      if (remote.length > 0) {
        api.applyRemoteElements(remote);
      }
    };

    const handleFiles = (event: Y.YMapEvent<SyncedFile>) => {
      if (event.transaction.origin === LOCAL_WHITEBOARD_ORIGIN) {
        return;
      }
      const known = api.getFiles();
      const added: SyncedFile[] = [];
      for (const key of event.keysChanged) {
        const file = filesMap.get(key);
        if (file && !known[key]) {
          added.push(file);
        }
      }
      if (added.length > 0) {
        api.addFiles(added);
      }
    };

    elementsMap.observe(handleElements);
    filesMap.observe(handleFiles);

    api.applyRemoteElements(readWhiteboardElements(doc));
    const missingFiles = readWhiteboardFiles(doc).filter((file) => !api.getFiles()[file.id]);
    if (missingFiles.length > 0) {
      api.addFiles(missingFiles);
    }

    return () => {
      elementsMap.unobserve(handleElements);
      filesMap.unobserve(handleFiles);
    };
  }, [doc, api]);

  const docRef = useRef(doc);
  docRef.current = doc;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const getAuthorRef = useRef(getAuthor);
  getAuthorRef.current = getAuthor;

  useEffect(
    () => () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending && docRef.current && !readOnlyRef.current) {
        writeLocalElements(docRef.current, pending.elements, getAuthorRef.current());
        writeLocalFiles(docRef.current, Object.values(pending.files));
      }
    },
    [],
  );

  const handleLocalChange = useCallback(
    (elements: readonly SyncedElement[], files: Record<string, SyncedFile>) => {
      if (readOnlyRef.current || !docRef.current) {
        return;
      }
      pendingRef.current = { elements, files };
      if (flushTimerRef.current) {
        return;
      }
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        const pending = pendingRef.current;
        pendingRef.current = null;
        const currentDoc = docRef.current;
        if (!pending || !currentDoc) {
          return;
        }
        writeLocalElements(currentDoc, pending.elements, getAuthorRef.current());
        writeLocalFiles(currentDoc, Object.values(pending.files));
      }, LOCAL_FLUSH_DELAY_MS);
    },
    [],
  );

  return { initialElements: initial.elements, initialFiles: initial.files, handleLocalChange };
}
