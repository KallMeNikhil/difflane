import { useCallback, useEffect, useState } from "react";
import { deriveTabsFromIds } from "../services/FileTreeService";
import type { FileNode, OpenEditorTab } from "../types/workspace";

export function useEditorTabs(initialTabs: OpenEditorTab[], initialActiveFileId: string, tree?: FileNode[]) {
  const [openTabs, setOpenTabs] = useState<OpenEditorTab[]>(initialTabs);
  const [activeTabId, setActiveTabIdState] = useState<string>(initialActiveFileId);

  useEffect(() => {
    if (!tree) {
      return;
    }
    setOpenTabs((prev) => deriveTabsFromIds(tree, prev.map((tab) => tab.fileId)));
  }, [tree]);

  const openTab = useCallback((tab: OpenEditorTab) => {
    setOpenTabs((prev) => (prev.some((existing) => existing.fileId === tab.fileId) ? prev : [...prev, tab]));
    setActiveTabIdState(tab.fileId);
  }, []);

  const closeTab = useCallback(
    (fileId: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((tab) => tab.fileId !== fileId);
        if (activeTabId === fileId && next.length > 0) {
          setActiveTabIdState(next[next.length - 1].fileId);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const setActiveTabId = useCallback((fileId: string) => {
    setActiveTabIdState(fileId);
  }, []);

  return { openTabs, activeTabId, setActiveTabId, openTab, closeTab };
}
