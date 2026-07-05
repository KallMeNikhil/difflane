import type { EditorLanguage, FileNode } from "../types/workspace";

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
