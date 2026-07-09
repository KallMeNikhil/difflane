
import type { MemberRole, WorkspaceFileSystemEntry, WorkspaceRepositoryInfo } from "@difflane/shared-types";
export type { MemberRole, WorkspaceFileSystemEntry, WorkspaceRepositoryInfo };

export type FileNodeType = "file" | "folder";

export type FileStatus = "unmodified" | "modified" | "added" | "deleted";

export type EditorLanguage =
  | "typescript"
  | "javascript"
  | "json"
  | "css"
  | "html"
  | "markdown"
  | "plaintext";

export interface FileNode {
  id: string;
  name: string;
  type: FileNodeType;
  isExpanded?: boolean;
  language?: EditorLanguage;
  status?: FileStatus;
  children?: FileNode[];
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

export type WorkspaceTopTab = "files" | "changes" | "discussion";

export interface WorkspaceMember {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: MemberRole;
  presence: PresenceStatus;
}

export interface ShareWorkspaceInfo {
  projectName: string;
  isLive: boolean;
  roomCode: string;
  inviteLink: string;
  collaboratorCount: number;
}
