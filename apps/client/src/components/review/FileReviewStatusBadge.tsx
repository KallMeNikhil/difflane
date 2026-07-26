import type { FileReviewStatus } from "../../types/review";

interface FileReviewStatusBadgeProps {
  status: FileReviewStatus;
  interactive?: boolean;
  onCycle?: () => void;
  className?: string;
}

const STATUS_LABELS: Record<FileReviewStatus, string> = {
  not_reviewed: "Not Reviewed",
  in_review: "In Review",
  reviewed: "Reviewed",
};

const STATUS_DOT_CLASSES: Record<FileReviewStatus, string> = {
  not_reviewed: "bg-outline",
  in_review: "bg-tertiary",
  reviewed: "bg-success-mint",
};

export function FileReviewStatusBadge({ status, interactive = false, onCycle, className = "" }: FileReviewStatusBadgeProps) {
  const content = (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface border border-outline-variant text-[10px] text-on-surface-variant whitespace-nowrap ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLASSES[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );

  if (!interactive || !onCycle) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onCycle}
      title="Change review status"
      aria-label={`Review status: ${STATUS_LABELS[status]}. Activate to change.`}
      className="hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-full"
    >
      {content}
    </button>
  );
}
