import type { MemberRole, ParticipantIdentityType } from "./room.js";

export type ReviewAnchorConfidence = "exact" | "nearby" | "snapshot" | "orphaned";

export interface ReviewAnchor {
  workspaceId: string;
  fileId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  snapshot: string;
  revision: number;
}

export interface ResolvedReviewAnchor {
  line: number;
  endLine: number;
  confidence: ReviewAnchorConfidence;
}

export type ReviewCommentTone = "default" | "blocking";

export interface ReviewComment {
  id: string;
  authorId: string;
  authorIdentityType: ParticipantIdentityType;
  authorInitials: string;
  authorName: string;
  body: string;
  tone: ReviewCommentTone;
  createdAt: string;
  editedAt: string | null;
}

export type ReviewThreadStatus = "open" | "resolved";

export interface ReviewThread {
  id: string;
  fileId: string;
  anchor: ReviewAnchor;
  status: ReviewThreadStatus;
  comments: ReviewComment[];
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export type FileReviewStatus = "not_reviewed" | "in_review" | "reviewed";

export interface FileReviewStatusRecord {
  fileId: string;
  status: FileReviewStatus;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ReviewNavigationState {
  selectedThreadId: string | null;
  collapsedThreadIds: string[];
}

export interface ReviewPermissions {
  canCreate: boolean;
  canReply: boolean;
  canEditOwn: boolean;
  canDeleteOwn: boolean;
  canDeleteAny: boolean;
  canResolve: boolean;
  canReopen: boolean;
  canSetFileStatus: boolean;
}

export function getReviewPermissions(role: MemberRole): ReviewPermissions {
  if (role === "viewer") {
    return {
      canCreate: false,
      canReply: false,
      canEditOwn: false,
      canDeleteOwn: false,
      canDeleteAny: false,
      canResolve: false,
      canReopen: false,
      canSetFileStatus: false,
    };
  }
  return {
    canCreate: true,
    canReply: true,
    canEditOwn: true,
    canDeleteOwn: true,
    canDeleteAny: role === "owner",
    canResolve: true,
    canReopen: true,
    canSetFileStatus: true,
  };
}
