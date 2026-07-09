import type { WorkspaceFileSystemEntry } from "./workspace.js";

export interface RepositorySummary {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  updatedAt: string;
  fileCount: number;
  isPrivate: boolean;
}

export interface RepositoryBranch {
  name: string;
}

export interface RepositoryImportRequest {
  owner: string;
  repo: string;
  branch: string;
}

export interface RepositoryImportResult {
  repository: RepositorySummary;
  branch: string;
  entries: WorkspaceFileSystemEntry[];
  files: Record<string, string>;
  fileCount: number;
  detectedLanguage: string;
}

export interface RepositoryApiErrorPayload {
  message: string;
}
