import { useCallback, useEffect, useState } from "react";
import type * as Y from "yjs";
import { readWorkspaceState, subscribeWorkspaceState, writeActiveFileId, writeOpenFileIds } from "../services/CollaborationService";
import { deriveTabsFromIds } from "../services/FileTreeService";
import type { FileNode, OpenEditorTab } from "../types/workspace";

export function useEditorTabs(
  initialTabs: OpenEditorTab[],
  initialActiveFileId: string,
  doc?: Y.Doc | null,
  tree?: FileNode[],
) {
  const [openTabs, setOpenTabs] = useState<OpenEditorTab[]>(initialTabs);
  const [activeTabId, setActiveTabIdState] = useState<string>(initialActiveFileId);

  useEffect(() => {
    if (!doc || !tree) {
      return;
    }
    const shared = readWorkspaceState(doc);
    if (shared.openFileIds.length > 0) {
      setOpenTabs(deriveTabsFromIds(tree, shared.openFileIds));
    } else {
      writeOpenFileIds(doc, initialTabs.map((tab) => tab.fileId));
    }
    if (shared.activeFileId) {
      setActiveTabIdState(shared.activeFileId);
    }
    return subscribeWorkspaceState(doc, (state) => {
      setOpenTabs(deriveTabsFromIds(tree, state.openFileIds));
      if (state.activeFileId) {
        setActiveTabIdState(state.activeFileId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, tree]);

  const openTab = useCallback(
    (tab: OpenEditorTab) => {
      if (doc) {
        const current = readWorkspaceState(doc).openFileIds;
        if (!current.includes(tab.fileId)) {
          writeOpenFileIds(doc, [...current, tab.fileId]);
        }
        writeActiveFileId(doc, tab.fileId);
      } else {
        setOpenTabs((prev) => (prev.some((existing) => existing.fileId === tab.fileId) ? prev : [...prev, tab]));
        setActiveTabIdState(tab.fileId);
      }
    },
    [doc],
  );

  const closeTab = useCallback(
    (fileId: string) => {
      if (doc) {
        const current = readWorkspaceState(doc).openFileIds;
        const next = current.filter((id) => id !== fileId);
        writeOpenFileIds(doc, next);
        if (activeTabId === fileId && next.length > 0) {
          writeActiveFileId(doc, next[next.length - 1]);
        }
        return;
      }
      setOpenTabs((prev) => {
        const next = prev.filter((tab) => tab.fileId !== fileId);
        if (activeTabId === fileId && next.length > 0) {
          setActiveTabIdState(next[next.length - 1].fileId);
        }
        return next;
      });
    },
    [activeTabId, doc],
  );

  const setActiveTabId = useCallback(
    (fileId: string) => {
      if (doc) {
        writeActiveFileId(doc, fileId);
      } else {
        setActiveTabIdState(fileId);
      }
    },
    [doc],
  );

  return { openTabs, activeTabId, setActiveTabId, openTab, closeTab };
}
