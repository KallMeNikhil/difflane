import type { DiffHunk, DiffLine } from "../types/workspace";

export function flattenHunkLines(hunks: DiffHunk[]): DiffLine[] {
  return hunks.flatMap((hunk) => hunk.lines);
}

export function buildSplitColumns(hunks: DiffHunk[]): { left: DiffLine[]; right: DiffLine[] } {
  const allLines = flattenHunkLines(hunks);
  return {
    left: allLines.filter((line) => line.kind === "context" || line.kind === "removed"),
    right: allLines.filter((line) => line.kind === "context" || line.kind === "added"),
  };
}

export function countLineStats(hunks: DiffHunk[]): { additions: number; deletions: number } {
  const allLines = flattenHunkLines(hunks);
  return {
    additions: allLines.filter((line) => line.kind === "added").length,
    deletions: allLines.filter((line) => line.kind === "removed").length,
  };
}
