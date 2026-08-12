import type { ExecutionFileSnapshotEntry } from "@difflane/shared-types";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";

interface FileSystemEntryLike {
  id: string;
  parentId: string | null;
  name: string;
  type: "file" | "folder";
  order: number;
  language?: string;
}

const MAX_SNAPSHOT_FILES = 200;
const MAX_FILE_BYTES = 500_000;

function buildPath(entry: FileSystemEntryLike, byId: Map<string, FileSystemEntryLike>): string {
  const segments: string[] = [entry.name];
  let cursor = entry.parentId ? byId.get(entry.parentId) : undefined;
  let guard = 0;
  while (cursor && guard < 64) {
    segments.unshift(cursor.name);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    guard += 1;
  }
  return segments.join("/");
}

export interface ExecutionSnapshot {
  entryPath: string;
  files: ExecutionFileSnapshotEntry[];
}

export class ExecutionSnapshotUnavailableError extends Error {
  constructor() {
    super("The workspace is not currently active and has no live state to execute.");
  }
}

export class ExecutionEntryFileNotFoundError extends Error {
  constructor(entryPath: string) {
    super(`Entry file "${entryPath}" was not found in the workspace.`);
  }
}

export function captureExecutionSnapshot(
  lifecycleManager: WorkspaceLifecycleManager,
  workspaceId: string,
  entryPath: string,
): ExecutionSnapshot {
  const live = lifecycleManager.captureLiveFileSnapshot(workspaceId);
  if (!live) {
    throw new ExecutionSnapshotUnavailableError();
  }

  const byId = new Map(live.entries.map((entry) => [entry.id, entry as FileSystemEntryLike]));
  const fileEntries = live.entries.filter((entry) => entry.type === "file");

  const files: ExecutionFileSnapshotEntry[] = [];
  for (const entry of fileEntries.slice(0, MAX_SNAPSHOT_FILES)) {
    const path = buildPath(entry as FileSystemEntryLike, byId);
    const content = live.fileContents[entry.id] ?? "";
    files.push({ path, content: content.slice(0, MAX_FILE_BYTES) });
  }

  const matchedEntry = files.find((file) => file.path === entryPath);
  if (!matchedEntry) {
    throw new ExecutionEntryFileNotFoundError(entryPath);
  }

  return { entryPath, files };
}
