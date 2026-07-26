import { Icon } from "../common";

interface ReviewNavigationControlsProps {
  count: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function ReviewNavigationControls({ count, onPrevious, onNext }: ReviewNavigationControlsProps) {
  if (count === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-on-surface-variant">
      <span className="font-body-sm text-[11px] mr-1">
        {count} {count === 1 ? "comment" : "comments"}
      </span>
      <button
        type="button"
        title="Previous comment"
        aria-label="Previous comment"
        onClick={onPrevious}
        className="p-1 rounded hover:bg-surface hover:text-on-surface transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Icon name="expand_less" size={16} />
      </button>
      <button
        type="button"
        title="Next comment"
        aria-label="Next comment"
        onClick={onNext}
        className="p-1 rounded hover:bg-surface hover:text-on-surface transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Icon name="expand_more" size={16} />
      </button>
    </div>
  );
}
