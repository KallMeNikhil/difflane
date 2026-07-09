import { useCallback, useEffect, useMemo, useState } from "react";
import type * as Y from "yjs";
import { buildFileTree } from "../services/FileTreeService";
import { readWorkspaceState, subscribeWorkspaceState, writeActiveFileId } from "../services/CollaborationService";
import {
  buildDuplicateName,
  collectDescendantIds,
  createFile as createFileEntry,
  createFolder as createFolderEntry,
  deleteEntry as deleteFileSystemEntry,
  duplicateEntry as duplicateFileSystemEntry,
  initializeFileSystemIfEmpty,
  readFileSystemEntries,
  renameEntry as renameFileSystemEntry,
  resolveCreateParentId as resolveCreateParentIdEntry,
  subscribeFileSystemEntries,
} from "../services/WorkspaceFileSystemService";
import type { FileStatus, WorkspaceFileSystemEntry } from "../types/workspace";

interface UseFileExplorerSeed {
  entries: WorkspaceFileSystemEntry[];
  statusByFileId: Record<string, FileStatus>;
}

export function useFileExplorer(seed: UseFileExplorerSeed, initialActiveFileId: string, doc?: Y.Doc | null) {
  const [entries, setEntries] = useState<WorkspaceFileSystemEntry[]>(seed.entries);
  const [activeFileId, setActiveFileIdState] = useState<string>(initialActiveFileId);
  const [selectedId, setSelectedId] = useState<string | null>(initialActiveFileId || null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(seed.entries.filter((entry) => entry.type === "folder").map((entry) => entry.id)),
  );

  useEffect(() => {
    if (!doc) {
      return;
    }
    initializeFileSystemIfEmpty(doc, seed.entries);
    setEntries(readFileSystemEntries(doc));

    const shared = readWorkspaceState(doc).activeFileId;
    if (shared) {
      setActiveFileIdState(shared);
    } else {
      writeActiveFileId(doc, initialActiveFileId);
    }

    const unsubscribeEntries = subscribeFileSystemEntries(doc, setEntries);
    const unsubscribeState = subscribeWorkspaceState(doc, (state) => {
      if (state.activeFileId) {
        setActiveFileIdState(state.activeFileId);
      }
    });
    return () => {
      unsubscribeEntries();
      unsubscribeState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const setActiveFileId = useCallback(
    (fileId: string) => {
      setSelectedId(fileId);
      if (doc) {
        writeActiveFileId(doc, fileId);
      } else {
        setActiveFileIdState(fileId);
      }
    },
    [doc],
  );

  const selectEntry = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const toggleFolder = useCallback((folderId: string) => {
    setSelectedId(folderId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const createFile = useCallback(
    (parentId: string | null, name: string) => {
      if (!doc) {
        return undefined;
      }
      const entry = createFileEntry(doc, parentId, name);
      if (parentId) {
        setExpandedIds((prev) => new Set(prev).add(parentId));
      }
      return entry;
    },
    [doc],
  );

  const createFolder = useCallback(
    (parentId: string | null, name: string) => {
      if (!doc) {
        return undefined;
      }
      const entry = createFolderEntry(doc, parentId, name);
      if (parentId) {
        setExpandedIds((prev) => new Set(prev).add(parentId));
      }
      return entry;
    },
    [doc],
  );

  const renameEntry = useCallback(
    (id: string, name: string) => {
      if (!doc) {
        const trimmed = name.trim();
        if (!trimmed) {
          return;
        }
        setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry)));
        return;
      }
      renameFileSystemEntry(doc, id, name);
    },
    [doc],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      if (!doc) {
        const idsToRemove = collectDescendantIds(entries, id);
        setEntries((prev) => prev.filter((entry) => !idsToRemove.includes(entry.id)));
        return idsToRemove;
      }
      return deleteFileSystemEntry(doc, id);
    },
    [doc, entries],
  );

  const duplicateEntry = useCallback(
    (id: string) => {
      if (!doc) {
        const source = entries.find((entry) => entry.id === id);
        if (!source) {
          return undefined;
        }
        const duplicate: WorkspaceFileSystemEntry = {
          ...source,
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: buildDuplicateName(source.name),
          order: entries.filter((entry) => entry.parentId === source.parentId).length,
        };
        setEntries((prev) => [...prev, duplicate]);
        return duplicate;
      }
      return duplicateFileSystemEntry(doc, id);
    },
    [doc, entries],
  );

  const resolveCreateParentId = useCallback(
    () => resolveCreateParentIdEntry(entries, selectedId),
    [entries, selectedId],
  );

  const tree = useMemo(
    () => buildFileTree(entries, expandedIds, seed.statusByFileId),
    [entries, expandedIds, seed.statusByFileId],
  );

  return {
    tree,
    entries,
    activeFileId,
    setActiveFileId,
    selectedId,
    selectEntry,
    resolveCreateParentId,
    toggleFolder,
    collapseAll,
    createFile,
    createFolder,
    renameEntry,
    deleteEntry,
    duplicateEntry,
  };
}
