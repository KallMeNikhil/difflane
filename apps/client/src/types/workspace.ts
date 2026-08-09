
import type {
  ActivityState,
  MemberRole,
  WorkspaceCollaborationPreferences,
  WorkspaceFileSystemEntry,
  WorkspaceMetadata,
  WorkspaceRepositoryInfo,
} from "@difflane/shared-types";
export type {
  ActivityState,
  MemberRole,
  WorkspaceFileSystemEntry,
  WorkspaceRepositoryInfo,
  WorkspaceCollaborationPreferences,
  WorkspaceMetadata,
};

export type FileNodeType = "file" | "folder";

export interface WorkspaceCreationSeed {
  name: string;
  description: string;
  defaultLanguage: string;
  maxParticipants: number | null;
  collaboration: WorkspaceCollaborationPreferences;
}

export type FileStatus = "unmodified" | "modified" | "added" | "deleted";

export type EditorLanguage =
  | "typescript"
  | "javascript"
  | "json"
  | "css"
  | "html"
  | "markdown"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "cpp"
  | "c"
  | "csharp"
  | "yaml"
  | "plaintext";

export interface FileNode {
  id: string;
  name: string;
  type: FileNodeType;
  isExpanded?: boolean;
  language?: EditorLanguage;
  languageManuallySet?: boolean;
  status?: FileStatus;
  children?: FileNode[];
}

export interface DeletedFileRecord {
  id: string;
  name: string;
  path: string;
  language: EditorLanguage;
  content: string;
  deletedAt: string;
}

export interface OpenEditorTab {
  fileId: string;
  name: string;
  path: string;
  language: EditorLanguage;
  status: FileStatus;
}

export type DiffLineKind = "context" | "added" | "removed" | "meta";

export interface DiffLine {
  id: string;
  kind: DiffLineKind;
  oldLineNumber?: number;
  newLineNumber?: number;
  tokens: CodeToken[];
  typingIndicator?: string;
}

export type CodeTokenKind =
  | "plain"
  | "keyword"
  | "identifier"
  | "parameter"
  | "string"
  | "comment"
  | "highlight";

export interface CodeToken {
  text: string;
  kind: CodeTokenKind;
}

export interface DiffHunk {
  id: string;
  lines: DiffLine[];
}

export interface FileDiff {
  fileId: string;
  path: string;
  language: EditorLanguage;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export type DiffViewMode = "unified" | "split";

export type PresenceStatus = "online" | "idle" | "offline";

export interface Collaborator {
  id: string;
  initials: string;
  name: string;
  role: string;
  presence: PresenceStatus;
  connectionClientId?: number;
  roleValue?: MemberRole;
  activeFileId?: string | null;
  activityState?: ActivityState;
  lastActiveAt?: string;
  color?: string;
}

export type CommentTone = "default" | "blocking";
export type ThreadStatus = "resolved" | "pending";

export interface DiscussionComment {
  id: string;
  authorInitials: string;
  authorName: string;
  timestampLabel: string;
  body: string;
  tone: CommentTone;
}

export interface DiscussionThread {
  id: string;
  status: ThreadStatus;
  anchor?: {
    fileName: string;
    lineNumber: number;
    snippet: string;
  };
  comments: DiscussionComment[];
}

export interface ActivityEvent {
  id: string;
  actorName: string;
  description: string;
  timestampLabel: string;
}

export type DiscussionFeedItem =
  | { kind: "thread"; thread: DiscussionThread }
  | { kind: "event"; event: ActivityEvent };

export type WorkspaceTopTab = "files" | "changes" | "discussion" | "review";

export interface WorkspaceMember {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: MemberRole;
  presence: PresenceStatus;
}
