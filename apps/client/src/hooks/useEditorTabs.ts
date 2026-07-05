import { useCallback, useState } from "react";
import type { OpenEditorTab } from "../types/workspace";

export function useEditorTabs(initialTabs: OpenEditorTab[], initialActiveFileId: string) {
  const [openTabs, setOpenTabs] = useState<OpenEditorTab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialActiveFileId);

  const openTab = useCallback((tab: OpenEditorTab) => {
    setOpenTabs((prev) => (prev.some((existing) => existing.fileId === tab.fileId) ? prev : [...prev, tab]));
    setActiveTabId(tab.fileId);
  }, []);

  const closeTab = useCallback(
    (fileId: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((tab) => tab.fileId !== fileId);
        if (activeTabId === fileId && next.length > 0) {
          setActiveTabId(next[next.length - 1].fileId);
        }
        return next;
      });
    },
    [activeTabId],
  );

  return { openTabs, activeTabId, setActiveTabId, openTab, closeTab };
}
