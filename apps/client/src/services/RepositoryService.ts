import type * as Y from "yjs";
import {
  detectDominantLanguage,
  detectLanguageForPath,
  type RepositoryImportResult,
  type RepositorySummary,
  type WorkspaceFileSystemEntry,
} from "@difflane/shared-types";
import * as githubClient from "../lib/github/githubClient";
import { isFileSystemAccessSupported, pickLocalFolder, processFileList, type RawImportedFile } from "../lib/filesystem/localFolderImport";
import { parseZipArchive } from "../lib/zip/zipImport";
import { findDefaultActiveFileId, seedFromImport, type WorkspaceImportSeed } from "./WorkspaceFileSystemService";

export interface WorkspaceImportPayload {
  provider: "github" | "local" | "zip";
  sourceName: string;
  branch?: string;
  entries: WorkspaceFileSystemEntry[];
  files: Record<string, string>;
  fileCount: number;
  detectedLanguage: string;
}

export function parseRepositoryQuery(query: string): { owner: string; repo: string } | null {
  const trimmed = query.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  return { owner: segments[0], repo: segments[1] };
}

export async function searchRepository(query: string): Promise<RepositorySummary> {
  return githubClient.searchRepository(query);
}

export async function listBranches(owner: string, repo: string): Promise<string[]> {
  const { branches } = await githubClient.listBranches(owner, repo);
  return branches;
}

export async function importRepository(owner: string, repo: string, branch: string): Promise<RepositoryImportResult> {
  return githubClient.importRepository(owner, repo, branch);
}

function generateId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildEntriesFromRawFiles(rawFiles: RawImportedFile[]): {
  entries: WorkspaceFileSystemEntry[];
  files: Record<string, string>;
} {
  const idByFolderPath = new Map<string, string>();
  const entries: WorkspaceFileSystemEntry[] = [];
  const files: Record<string, string> = {};
  const orderByParent = new Map<string, number>();

  function nextOrder(parentKey: string): number {
    const order = orderByParent.get(parentKey) ?? 0;
    orderByParent.set(parentKey, order + 1);
    return order;
  }

  function ensureFolder(path: string): string | null {
    if (!path) {
      return null;
    }
    const existing = idByFolderPath.get(path);
    if (existing) {
      return existing;
    }
    const segments = path.split("/");
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join("/");
    const parentId = ensureFolder(parentPath);
    const id = generateId();
    idByFolderPath.set(path, id);
    entries.push({ id, parentId, name, type: "folder", order: nextOrder(parentId ?? "root") });
    return id;
  }

  const sortedFiles = [...rawFiles].sort((a, b) => a.path.localeCompare(b.path));
  for (const rawFile of sortedFiles) {
    const segments = rawFile.path.split("/").filter(Boolean);
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join("/");
    const parentId = ensureFolder(parentPath);
    const id = generateId();
    entries.push({
      id,
      parentId,
      name,
      type: "file",
      order: nextOrder(parentId ?? "root"),
      language: detectLanguageForPath(name),
    });
    files[id] = rawFile.content;
  }

  return { entries, files };
}

function toImportPayload(
  provider: "local" | "zip",
  sourceName: string,
  rawFiles: RawImportedFile[],
): WorkspaceImportPayload {
  const { entries, files } = buildEntriesFromRawFiles(rawFiles);
  return {
    provider,
    sourceName,
    entries,
    files,
    fileCount: entries.filter((entry) => entry.type === "file").length,
    detectedLanguage: detectDominantLanguage(rawFiles.map((file) => file.path)),
  };
}

export { isFileSystemAccessSupported };

export async function importLocalFolder(): Promise<WorkspaceImportPayload | null> {
  const picked = await pickLocalFolder();
  if (!picked) {
    return null;
  }
  return toImportPayload("local", picked.folderName, picked.files);
}

export async function importFileList(fileList: FileList): Promise<WorkspaceImportPayload> {
  const { folderName, files } = await processFileList(fileList);
  return toImportPayload("local", folderName, files);
}

export async function importZipFile(file: File): Promise<WorkspaceImportPayload> {
  const { archiveName, files } = await parseZipArchive(file);
  return toImportPayload("zip", archiveName, files);
}

function toWorkspaceImportSeed(payload: WorkspaceImportPayload): WorkspaceImportSeed {
  if (payload.provider === "github") {
    return {
      entries: payload.entries,
      files: payload.files,
      repositoryInfo: {
        provider: "github",
        owner: payload.sourceName.split("/")[0] ?? payload.sourceName,
        name: payload.sourceName.split("/")[1] ?? payload.sourceName,
        branch: payload.branch ?? "main",
        fileCount: payload.fileCount,
        lastSyncedAt: new Date().toISOString(),
      },
    };
  }
  return {
    entries: payload.entries,
    files: payload.files,
    repositoryInfo: {
      provider: payload.provider,
      owner: payload.provider === "zip" ? "ZIP Archive" : "Local Folder",
      name: payload.sourceName,
      branch: "—",
      fileCount: payload.fileCount,
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

export function applyWorkspaceImport(doc: Y.Doc, payload: WorkspaceImportPayload): string | null {
  seedFromImport(doc, toWorkspaceImportSeed(payload));
  return findDefaultActiveFileId(payload.entries);
}

export function applyImportResult(doc: Y.Doc, importResult: RepositoryImportResult): string | null {
  return applyWorkspaceImport(doc, {
    provider: "github",
    sourceName: importResult.repository.fullName,
    branch: importResult.branch,
    entries: importResult.entries,
    files: importResult.files,
    fileCount: importResult.fileCount,
    detectedLanguage: importResult.detectedLanguage,
  });
}
