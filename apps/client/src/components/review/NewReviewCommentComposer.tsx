import { useState } from "react";
import { Icon } from "../common";

interface NewReviewCommentComposerProps {
  lineNumber: number;
  style?: { top: number };
  onSubmit: (body: string) => void;
  onClose: () => void;
}

export function NewReviewCommentComposer({ lineNumber, style, onSubmit, onClose }: NewReviewCommentComposerProps) {
  const [body, setBody] = useState("");

  function handleSubmit() {
    if (!body.trim()) {
      return;
    }
    onSubmit(body);
    setBody("");
  }

  return (
    <div
      style={style}
      className="absolute left-16 w-[380px] bg-surface-container rounded-xl border border-primary/50 shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-20 overflow-hidden"
    >
      <div className="px-md py-sm border-b border-outline-variant bg-surface flex justify-between items-center">
        <span className="font-body-sm text-[11px] text-on-surface-variant">New review comment • Line {lineNumber}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close comment composer"
          title="Close comment composer"
          className="text-on-surface-variant hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="p-md flex flex-col gap-sm">
        <textarea
          autoFocus
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Leave a review comment..."
          aria-label="Leave a review comment"
          rows={3}
          className="w-full bg-surface border border-outline-variant rounded px-sm py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1.5 rounded bg-primary text-on-primary text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
