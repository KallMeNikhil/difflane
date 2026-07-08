import { useCallback, useEffect, useState } from "react";
import type * as Y from "yjs";
import { toggleFolderExpanded } from "../services/FileTreeService";
import { readWorkspaceState, subscribeWorkspaceState, writeActiveFileId } from "../services/CollaborationService";
import type { FileNode } from "../types/workspace";

export function useFileExplorer(initialTree: FileNode[], initialActiveFileId: string, doc?: Y.Doc | null) {
  const [tree, setTree] = useState<FileNode[]>(initialTree);
  const [activeFileId, setActiveFileIdState] = useState<string>(initialActiveFileId);

  useEffect(() => {
    if (!doc) {
      return;
    }
    const shared = readWorkspaceState(doc).activeFileId;
    if (shared) {
      setActiveFileIdState(shared);
    } else {
      writeActiveFileId(doc, initialActiveFileId);
    }
    return subscribeWorkspaceState(doc, (state) => {
      if (state.activeFileId) {
        setActiveFileIdState(state.activeFileId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const setActiveFileId = useCallback(
    (fileId: string) => {
      if (doc) {
        writeActiveFileId(doc, fileId);
      } else {
        setActiveFileIdState(fileId);
      }
    },
    [doc],
  );

  const toggleFolder = useCallback((folderId: string) => {
    setTree((prev) => toggleFolderExpanded(prev, folderId));
  }, []);

  return { tree, activeFileId, setActiveFileId, toggleFolder };
}
