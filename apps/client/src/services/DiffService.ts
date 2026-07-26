import type { CodeToken, DiffHunk, DiffLine, EditorLanguage, FileDiff } from "../types/workspace";

const MAX_DIFF_LINES = 2000;

function splitLines(text: string): string[] {
  return text.length === 0 ? [] : text.split("\n");
}

function makeLine(id: string, kind: DiffLine["kind"], text: string, oldLineNumber?: number, newLineNumber?: number): DiffLine {
  const tokens: CodeToken[] = [{ text, kind: "plain" }];
  return { id, kind, oldLineNumber, newLineNumber, tokens };
}

function buildReplacementLines(oldLines: string[], newLines: string[]): DiffLine[] {
  const lines: DiffLine[] = [];
  oldLines.forEach((line, index) => lines.push(makeLine(`del-${index}`, "removed", line, index + 1, undefined)));
  newLines.forEach((line, index) => lines.push(makeLine(`add-${index}`, "added", line, undefined, index + 1)));
  return lines;
}

export function computeDiffLines(oldText: string, newText: string): DiffLine[] {
  if (oldText === newText) {
    return splitLines(oldText).map((line, index) => makeLine(`ctx-${index}`, "context", line, index + 1, index + 1));
  }

  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);

  if (oldLines.length > MAX_DIFF_LINES || newLines.length > MAX_DIFF_LINES) {
    return buildReplacementLines(oldLines, newLines);
  }

  const n = oldLines.length;
  const m = newLines.length;
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = oldLines[i] === newLines[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldLineNumber = 1;
  let newLineNumber = 1;
  let seq = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      lines.push(makeLine(`ctx-${seq++}`, "context", oldLines[i], oldLineNumber++, newLineNumber++));
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      lines.push(makeLine(`del-${seq++}`, "removed", oldLines[i], oldLineNumber++, undefined));
      i++;
    } else {
      lines.push(makeLine(`add-${seq++}`, "added", newLines[j], undefined, newLineNumber++));
      j++;
    }
  }
  while (i < n) {
    lines.push(makeLine(`del-${seq++}`, "removed", oldLines[i], oldLineNumber++, undefined));
    i++;
  }
  while (j < m) {
    lines.push(makeLine(`add-${seq++}`, "added", newLines[j], undefined, newLineNumber++));
    j++;
  }
  return lines;
}

export function buildFileDiff(
  fileId: string,
  path: string,
  language: EditorLanguage,
  oldText: string,
  newText: string,
): FileDiff {
  const lines = computeDiffLines(oldText, newText);
  const hunk: DiffHunk = { id: `${fileId}-hunk`, lines };
  const { additions, deletions } = countLineStats([hunk]);
  return { fileId, path, language, additions, deletions, hunks: [hunk] };
}

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
