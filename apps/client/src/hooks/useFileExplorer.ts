import { useCallback, useState } from "react";
import { toggleFolderExpanded } from "../services/FileTreeService";
import type { FileNode } from "../types/workspace";

export function useFileExplorer(initialTree: FileNode[], initialActiveFileId: string) {
  const [tree, setTree] = useState<FileNode[]>(initialTree);
  const [activeFileId, setActiveFileId] = useState<string>(initialActiveFileId);

  const toggleFolder = useCallback((folderId: string) => {
    setTree((prev) => toggleFolderExpanded(prev, folderId));
  }, []);

  return { tree, activeFileId, setActiveFileId, toggleFolder };
}
