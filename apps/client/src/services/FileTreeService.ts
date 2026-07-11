import type { EditorLanguage, FileNode, FileStatus, OpenEditorTab, WorkspaceFileSystemEntry } from "../types/workspace";

export function buildFileTree(
  entries: WorkspaceFileSystemEntry[],
  expandedIds: Set<string>,
  statusByFileId: Record<string, FileStatus> = {},
): FileNode[] {
  const byParent = new Map<string | null, WorkspaceFileSystemEntry[]>();
  for (const entry of entries) {
    const list = byParent.get(entry.parentId) ?? [];
    list.push(entry);
    byParent.set(entry.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order);
  }

  function toNode(entry: WorkspaceFileSystemEntry): FileNode {
    if (entry.type === "folder") {
      const children = (byParent.get(entry.id) ?? []).map(toNode);
      return {
        id: entry.id,
        name: entry.name,
        type: "folder",
        isExpanded: expandedIds.has(entry.id),
        children,
      };
    }
    return {
      id: entry.id,
      name: entry.name,
      type: "file",
      language: (entry.language?.toLowerCase() as EditorLanguage | undefined) ?? "plaintext",
      status: statusByFileId[entry.id] ?? "unmodified",
    };
  }

  return (byParent.get(null) ?? []).map(toNode);
}

export function flattenToSeedEntries(tree: FileNode[]): {
  entries: WorkspaceFileSystemEntry[];
  statusByFileId: Record<string, FileStatus>;
} {
  const entries: WorkspaceFileSystemEntry[] = [];
  const statusByFileId: Record<string, FileStatus> = {};

  function visit(nodes: FileNode[], parentId: string | null) {
    nodes.forEach((node, index) => {
      if (node.type === "folder") {
        entries.push({ id: node.id, parentId, name: node.name, type: "folder", order: index });
        if (node.children) {
          visit(node.children, node.id);
        }
        return;
      }
      entries.push({ id: node.id, parentId, name: node.name, type: "file", language: node.language, order: index });
      if (node.status && node.status !== "unmodified") {
        statusByFileId[node.id] = node.status;
      }
    });
  }

  visit(tree, null);
  return { entries, statusByFileId };
}

export function toggleFolderExpanded(tree: FileNode[], folderId: string): FileNode[] {
  return tree.map((node) => {
    if (node.type !== "folder") {
      return node;
    }
    if (node.id === folderId) {
      return { ...node, isExpanded: !node.isExpanded };
    }
    if (node.children) {
      return { ...node, children: toggleFolderExpanded(node.children, folderId) };
    }
    return node;
  });
}

export function findNodeById(tree: FileNode[], nodeId: string): FileNode | undefined {
  for (const node of tree) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children) {
      const match = findNodeById(node.children, nodeId);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
}

export function flattenFileNodes(tree: FileNode[]): FileNode[] {
  return tree.flatMap((node) => {
    if (node.type === "file") {
      return [node];
    }
    return node.children ? flattenFileNodes(node.children) : [];
  });
}

export function countTreeStats(tree: FileNode[]): { folderCount: number; fileCount: number } {
  let folderCount = 0;
  let fileCount = 0;

  function visit(nodes: FileNode[]) {
    for (const node of nodes) {
      if (node.type === "folder") {
        folderCount += 1;
        if (node.children) {
          visit(node.children);
        }
      } else {
        fileCount += 1;
      }
    }
  }

  visit(tree);
  return { folderCount, fileCount };
}

export function getChangedFiles(tree: FileNode[]): FileNode[] {
  return flattenFileNodes(tree).filter((node) => node.status && node.status !== "unmodified");
}

export function buildBreadcrumbPath(tree: FileNode[], fileId: string, trail: string[] = []): string[] | undefined {
  for (const node of tree) {
    const nextTrail = [...trail, node.name];
    if (node.id === fileId) {
      return nextTrail;
    }
    if (node.children) {
      const match = buildBreadcrumbPath(node.children, fileId, nextTrail);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
}

export function toMonacoLanguage(language: EditorLanguage): string {
  return language;
}

export function toOpenTab(tree: FileNode[], node: FileNode): OpenEditorTab {
  const path = buildBreadcrumbPath(tree, node.id) ?? [node.name];
  return {
    fileId: node.id,
    name: node.name,
    path: path.join("/"),
    language: node.language ?? "plaintext",
    status: node.status ?? "unmodified",
  };
}

export function deriveTabsFromIds(tree: FileNode[], fileIds: string[]): OpenEditorTab[] {
  return fileIds
    .map((fileId) => findNodeById(tree, fileId))
    .filter((node): node is FileNode => Boolean(node))
    .map((node) => toOpenTab(tree, node));
}
