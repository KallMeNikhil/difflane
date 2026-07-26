import * as Y from "yjs";
import type {
  WorkspaceCollaborationPreferences,
  WorkspaceFileSystemEntry,
  WorkspaceMetadata,
  WorkspaceRepositoryInfo,
} from "@difflane/shared-types";
import type { DeletedFileRecord, EditorLanguage, FileNode } from "../types/workspace";
import {
  removeFileText,
  seedFileTextIfEmpty,
  getFileText,
  clearFileBaselines,
  clearDeletedFiles,
  readFileBaseline,
  removeFileBaseline,
  writeDeletedFile,
  writeFileBaselines,
} from "./CollaborationService";
import { buildBreadcrumbPath, flattenFileNodes } from "./FileTreeService";

export interface ExportableFile {
  path: string;
  content: string;
}

export function collectExportableFiles(doc: Y.Doc, tree: FileNode[]): ExportableFile[] {
  return flattenFileNodes(tree).map((node) => {
    const pathParts = buildBreadcrumbPath(tree, node.id) ?? [node.name];
    return {
      path: pathParts.join("/"),
      content: getFileText(doc, node.id).toString(),
    };
  });
}

const FILE_SYSTEM_KEY = "workspaceFileSystem";
const REPOSITORY_INFO_KEY = "repositoryInfo";
const WORKSPACE_METADATA_KEY = "workspaceMetadata";

export const DEFAULT_WORKSPACE_COLLABORATION_PREFERENCES: WorkspaceCollaborationPreferences = {
  cursorPresence: true,
  inlineDiscussions: true,
  sharedNavigation: false,
};

export const DEFAULT_WORKSPACE_METADATA: WorkspaceMetadata = {
  name: "Untitled Workspace",
  description: "",
  collaboration: DEFAULT_WORKSPACE_COLLABORATION_PREFERENCES,
};

function getFileSystemMap(doc: Y.Doc): Y.Map<WorkspaceFileSystemEntry> {
  return doc.getMap(FILE_SYSTEM_KEY);
}

function getRepositoryInfoMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(REPOSITORY_INFO_KEY);
}

function getWorkspaceMetadataMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(WORKSPACE_METADATA_KEY);
}

function generateEntryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readFileSystemEntries(doc: Y.Doc): WorkspaceFileSystemEntry[] {
  return Array.from(getFileSystemMap(doc).values());
}

export function subscribeFileSystemEntries(doc: Y.Doc, listener: (entries: WorkspaceFileSystemEntry[]) => void): () => void {
  const map = getFileSystemMap(doc);
  const handler = () => listener(readFileSystemEntries(doc));
  map.observe(handler);
  return () => map.unobserve(handler);
}

export function initializeFileSystemIfEmpty(doc: Y.Doc, seedEntries: WorkspaceFileSystemEntry[]): void {
  const map = getFileSystemMap(doc);
  if (map.size > 0) {
    return;
  }
  doc.transact(() => {
    for (const entry of seedEntries) {
      map.set(entry.id, entry);
    }
  });
}

function nextOrder(doc: Y.Doc, parentId: string | null): number {
  const siblings = readFileSystemEntries(doc).filter((entry) => entry.parentId === parentId);
  return siblings.length;
}

export function createFile(doc: Y.Doc, parentId: string | null, name: string): WorkspaceFileSystemEntry {
  const entry: WorkspaceFileSystemEntry = {
    id: generateEntryId(),
    parentId,
    name,
    type: "file",
    order: nextOrder(doc, parentId),
  };
  getFileSystemMap(doc).set(entry.id, entry);
  seedFileTextIfEmpty(doc, entry.id, "");
  return entry;
}

export function createFolder(doc: Y.Doc, parentId: string | null, name: string): WorkspaceFileSystemEntry {
  const entry: WorkspaceFileSystemEntry = {
    id: generateEntryId(),
    parentId,
    name,
    type: "folder",
    order: nextOrder(doc, parentId),
  };
  getFileSystemMap(doc).set(entry.id, entry);
  return entry;
}

export function renameEntry(doc: Y.Doc, id: string, name: string): void {
  const map = getFileSystemMap(doc);
  const existing = map.get(id);
  if (!existing || !name.trim()) {
    return;
  }
  map.set(id, { ...existing, name: name.trim() });
}

export function collectDescendantIds(entries: WorkspaceFileSystemEntry[], rootId: string): string[] {
  const childrenByParent = new Map<string | null, WorkspaceFileSystemEntry[]>();
  for (const entry of entries) {
    const list = childrenByParent.get(entry.parentId) ?? [];
    list.push(entry);
    childrenByParent.set(entry.parentId, list);
  }
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    result.push(currentId);
    for (const child of childrenByParent.get(currentId) ?? []) {
      stack.push(child.id);
    }
  }
  return result;
}

function buildFlatEntryPath(entries: WorkspaceFileSystemEntry[], entry: WorkspaceFileSystemEntry): string {
  const byId = new Map(entries.map((candidate) => [candidate.id, candidate]));
  const segments: string[] = [entry.name];
  let parentId = entry.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) {
      break;
    }
    segments.unshift(parent.name);
    parentId = parent.parentId;
  }
  return segments.join("/");
}

export function deleteEntry(doc: Y.Doc, id: string): string[] {
  const entries = readFileSystemEntries(doc);
  const idsToRemove = collectDescendantIds(entries, id);
  const map = getFileSystemMap(doc);
  doc.transact(() => {
    for (const removeId of idsToRemove) {
      const entry = map.get(removeId);
      map.delete(removeId);
      if (entry?.type === "file") {
        const baseline = readFileBaseline(doc, removeId);
        if (baseline !== undefined) {
          const record: DeletedFileRecord = {
            id: removeId,
            name: entry.name,
            path: buildFlatEntryPath(entries, entry),
            language: (entry.language?.toLowerCase() as EditorLanguage | undefined) ?? "plaintext",
            content: baseline,
            deletedAt: new Date().toISOString(),
          };
          writeDeletedFile(doc, record);
        }
        removeFileBaseline(doc, removeId);
        removeFileText(doc, removeId);
      }
    }
  });
  return idsToRemove;
}

export function duplicateEntry(doc: Y.Doc, id: string): WorkspaceFileSystemEntry | undefined {
  const map = getFileSystemMap(doc);
  const source = map.get(id);
  if (!source) {
    return undefined;
  }
  const duplicate: WorkspaceFileSystemEntry = {
    ...source,
    id: generateEntryId(),
    name: buildDuplicateName(source.name),
    order: nextOrder(doc, source.parentId),
  };
  map.set(duplicate.id, duplicate);
  if (source.type === "file") {
    const sourceContent = readFileTextContent(doc, source.id);
    seedFileTextIfEmpty(doc, duplicate.id, sourceContent);
  }
  return duplicate;
}

function readFileTextContent(doc: Y.Doc, fileId: string): string {
  const fileTexts = doc.getMap<Y.Text>("fileTexts");
  return fileTexts.get(fileId)?.toString() ?? "";
}

export function buildDuplicateName(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${name} copy`;
  }
  return `${name.slice(0, dotIndex)} copy${name.slice(dotIndex)}`;
}

export function readRepositoryInfo(doc: Y.Doc): WorkspaceRepositoryInfo | null {
  const map = getRepositoryInfoMap(doc);
  if (map.size === 0) {
    return null;
  }
  return {
    provider: map.get("provider") as WorkspaceRepositoryInfo["provider"],
    owner: map.get("owner") as string,
    name: map.get("name") as string,
    branch: map.get("branch") as string,
    fileCount: map.get("fileCount") as number,
    lastSyncedAt: map.get("lastSyncedAt") as string,
  };
}

export function writeRepositoryInfo(doc: Y.Doc, info: WorkspaceRepositoryInfo): void {
  const map = getRepositoryInfoMap(doc);
  doc.transact(() => {
    map.set("provider", info.provider);
    map.set("owner", info.owner);
    map.set("name", info.name);
    map.set("branch", info.branch);
    map.set("fileCount", info.fileCount);
    map.set("lastSyncedAt", info.lastSyncedAt);
  });
}

export function subscribeRepositoryInfo(doc: Y.Doc, listener: (info: WorkspaceRepositoryInfo | null) => void): () => void {
  const map = getRepositoryInfoMap(doc);
  const handler = () => listener(readRepositoryInfo(doc));
  map.observe(handler);
  return () => map.unobserve(handler);
}

export interface WorkspaceImportSeed {
  entries: WorkspaceFileSystemEntry[];
  files: Record<string, string>;
  repositoryInfo: WorkspaceRepositoryInfo;
}

export function seedFromImport(doc: Y.Doc, seed: WorkspaceImportSeed): void {
  const map = getFileSystemMap(doc);
  doc.transact(() => {
    for (const key of Array.from(map.keys())) {
      const entry = map.get(key);
      map.delete(key);
      if (entry?.type === "file") {
        removeFileText(doc, key);
      }
    }
    for (const entry of seed.entries) {
      map.set(entry.id, entry);
    }
    for (const [fileId, content] of Object.entries(seed.files)) {
      seedFileTextIfEmpty(doc, fileId, content);
    }
  });
  clearFileBaselines(doc);
  writeFileBaselines(doc, seed.files);
  clearDeletedFiles(doc);
  writeRepositoryInfo(doc, seed.repositoryInfo);
}

export function findDefaultActiveFileId(entries: WorkspaceFileSystemEntry[]): string | null {
  const files = entries.filter((entry) => entry.type === "file");
  if (files.length === 0) {
    return null;
  }
  const readme = files.find((entry) => entry.name.toLowerCase().startsWith("readme"));
  return (readme ?? files[0]).id;
}

export function resolveCreateParentId(entries: WorkspaceFileSystemEntry[], selectedId: string | null): string | null {
  if (!selectedId) {
    return null;
  }
  const selected = entries.find((entry) => entry.id === selectedId);
  if (!selected) {
    return null;
  }
  return selected.type === "folder" ? selected.id : selected.parentId;
}

export function readWorkspaceMetadata(doc: Y.Doc): WorkspaceMetadata {
  const map = getWorkspaceMetadataMap(doc);
  const collaboration = map.get("collaboration") as WorkspaceCollaborationPreferences | undefined;
  return {
    name: (map.get("name") as string | undefined) ?? DEFAULT_WORKSPACE_METADATA.name,
    description: (map.get("description") as string | undefined) ?? DEFAULT_WORKSPACE_METADATA.description,
    collaboration: collaboration ?? DEFAULT_WORKSPACE_COLLABORATION_PREFERENCES,
  };
}

export function writeWorkspaceName(doc: Y.Doc, name: string): void {
  getWorkspaceMetadataMap(doc).set("name", name);
}

export function writeWorkspaceDescription(doc: Y.Doc, description: string): void {
  getWorkspaceMetadataMap(doc).set("description", description);
}

export function writeWorkspaceCollaborationPreference(
  doc: Y.Doc,
  key: keyof WorkspaceCollaborationPreferences,
  value: boolean,
): void {
  const map = getWorkspaceMetadataMap(doc);
  const current = (map.get("collaboration") as WorkspaceCollaborationPreferences | undefined) ?? DEFAULT_WORKSPACE_COLLABORATION_PREFERENCES;
  map.set("collaboration", { ...current, [key]: value });
}

export function subscribeWorkspaceMetadata(doc: Y.Doc, listener: (metadata: WorkspaceMetadata) => void): () => void {
  const map = getWorkspaceMetadataMap(doc);
  const handler = () => listener(readWorkspaceMetadata(doc));
  map.observe(handler);
  return () => map.unobserve(handler);
}
