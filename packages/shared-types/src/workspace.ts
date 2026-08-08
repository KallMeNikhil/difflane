export type WorkspaceFileSystemNodeType = "file" | "folder";

export interface WorkspaceFileSystemEntry {
  id: string;
  parentId: string | null;
  name: string;
  type: WorkspaceFileSystemNodeType;
  language?: string;
  languageManuallySet?: boolean;
  order: number;
}

export type RepositoryProvider = "github" | "local" | "zip";

export interface WorkspaceRepositoryInfo {
  provider: RepositoryProvider;
  owner: string;
  name: string;
  branch: string;
  fileCount: number;
  lastSyncedAt: string;
}

export interface WorkspaceCollaborationPreferences {
  cursorPresence: boolean;
  inlineDiscussions: boolean;
  sharedNavigation: boolean;
}

export interface WorkspaceMetadata {
  name: string;
  description: string;
  collaboration: WorkspaceCollaborationPreferences;
  defaultLanguage: string;
  maxParticipants: number | null;
}
