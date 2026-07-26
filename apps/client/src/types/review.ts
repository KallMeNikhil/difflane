import type {
  FileReviewStatus,
  FileReviewStatusRecord,
  ResolvedReviewAnchor,
  ReviewAnchor,
  ReviewAnchorConfidence,
  ReviewComment,
  ReviewCommentTone,
  ReviewNavigationState,
  ReviewPermissions,
  ReviewThread,
  ReviewThreadStatus,
} from "@difflane/shared-types";

export { getReviewPermissions } from "@difflane/shared-types";

export type {
  FileReviewStatus,
  FileReviewStatusRecord,
  ResolvedReviewAnchor,
  ReviewAnchor,
  ReviewAnchorConfidence,
  ReviewComment,
  ReviewCommentTone,
  ReviewNavigationState,
  ReviewPermissions,
  ReviewThread,
  ReviewThreadStatus,
};

export interface ReviewAuthorIdentity {
  id: string;
  identityType: "user" | "guest";
  initials: string;
  name: string;
}
