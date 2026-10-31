import type { editor as MonacoEditorNamespace } from "monaco-editor";

export interface ReviewGutterMarker {
  threadId: string;
  line: number;
  resolved: boolean;
  orphaned: boolean;
  commentCount: number;
  authorName: string;
  preview: string;
}

const OVERVIEW_RULER_RIGHT_LANE = 4;
const MINIMAP_GUTTER_POSITION = 2;
const INJECTED_TEXT_NO_CURSOR_STOPS = 0;
const PREVIEW_LENGTH = 48;

interface LineMarkerGroup {
  line: number;
  markers: ReviewGutterMarker[];
}

function groupMarkersByLine(markers: ReviewGutterMarker[]): LineMarkerGroup[] {
  const byLine = new Map<number, ReviewGutterMarker[]>();
  for (const marker of markers) {
    const group = byLine.get(marker.line) ?? [];
    group.push(marker);
    byLine.set(marker.line, group);
  }
  return Array.from(byLine, ([line, group]) => ({ line, markers: group }));
}

function truncate(text: string, length: number): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > length ? `${singleLine.slice(0, length - 1)}…` : singleLine;
}

export function buildReviewDecorations(markers: ReviewGutterMarker[], lineCount: number, lineMaxColumn: (line: number) => number): MonacoEditorNamespace.IModelDeltaDecoration[] {
  return groupMarkersByLine(markers)
    .filter((group) => group.line >= 1 && group.line <= lineCount)
    .map(({ line, markers: group }) => {
      const open = group.filter((marker) => !marker.resolved && !marker.orphaned);
      const allOrphaned = group.every((marker) => marker.orphaned);
      const primary = open[0] ?? group[0];
      const commentCount = group.reduce((total, marker) => total + marker.commentCount, 0);
      const tone = allOrphaned ? "orphaned" : open.length > 0 ? "open" : "resolved";
      const badge =
        tone === "open"
          ? `  💬 ${commentCount}  ${primary.authorName}: ${truncate(primary.preview, PREVIEW_LENGTH)}`
          : tone === "resolved"
            ? `  ✓ ${commentCount} resolved`
            : `  ⚠ comment's code changed`;
      return {
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: lineMaxColumn(line) },
        options: {
          isWholeLine: true,
          className: tone === "open" ? "review-line-open" : undefined,
          glyphMarginClassName: `review-glyph-${tone}`,
          glyphMarginHoverMessage: { value: `**${commentCount} review comment${commentCount === 1 ? "" : "s"}** — click to open` },
          overviewRuler: { color: tone === "open" ? "#4F6EF7" : tone === "resolved" ? "#22C55E99" : "#7B8496", position: OVERVIEW_RULER_RIGHT_LANE },
          minimap: tone === "open" ? { color: "#4F6EF7", position: MINIMAP_GUTTER_POSITION } : undefined,
          after: { content: badge, inlineClassName: `review-inline-badge review-inline-badge-${tone}`, cursorStops: INJECTED_TEXT_NO_CURSOR_STOPS },
        },
      };
    });
}
