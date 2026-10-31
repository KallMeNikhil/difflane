import { DiffHunkCard } from "./DiffHunkCard";
import { buildSplitColumns } from "../../services/DiffService";
import type { DiffViewMode, FileDiff } from "../../types/workspace";

interface DiffViewerProps {
  diff: FileDiff;
  viewMode: DiffViewMode;
}

export function DiffViewer({ diff, viewMode }: DiffViewerProps) {
  if (viewMode === "split") {
    const { left, right } = buildSplitColumns(diff.hunks);
    return (
      <div className="flex-1 overflow-auto relative p-lg">
        <div className="max-w-6xl mx-auto grid grid-cols-2 gap-md font-code text-code">
          <DiffHunkCard lines={left} lineNumberSide="old" />
          <DiffHunkCard lines={right} lineNumberSide="new" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative p-lg">
      <div className="max-w-5xl mx-auto flex flex-col gap-4 font-code text-code">
        {diff.hunks.map((hunk) => (
          <DiffHunkCard key={hunk.id} lines={hunk.lines} lineNumberSide="auto" />
        ))}
      </div>
    </div>
  );
}
