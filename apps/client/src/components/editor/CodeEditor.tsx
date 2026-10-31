import { useEffect, useRef } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNamespace } from "monaco-editor";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { useMonacoYjsBinding } from "../../hooks/useMonacoYjsBinding";
import { useEditorPreferences } from "../../hooks/useEditorPreferences";
import type { EditorLanguage } from "../../types/workspace";
import { buildReviewDecorations, type ReviewGutterMarker } from "../../lib/monaco/reviewDecorations";

export type { ReviewGutterMarker };

interface CodeEditorProps {
  value: string;
  language: EditorLanguage;
  fileId: string;
  doc?: Y.Doc | null;
  awareness?: Awareness | null;
  reviewMarkers?: ReviewGutterMarker[];
  canAddReviewComment?: boolean;
  onReviewMarkerClick?: (threadId: string, top: number) => void;
  onReviewGutterClick?: (lineNumber: number, top: number) => void;
  onTypingActivity?: () => void;
  readOnly?: boolean;
  cursorPresenceEnabled?: boolean;
  onEditorMount?: (instance: MonacoEditorNamespace.IStandaloneCodeEditor) => void;
}

const THEME_NAME = "difflane-slate";
const handleBeforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#111318",
      "editor.foreground": "#F3F4F6",
      "editorLineNumber.foreground": "#7B8496",
      "editorLineNumber.activeForeground": "#F3F4F6",
      "editor.selectionBackground": "#4F6EF740",
      "editorCursor.foreground": "#4F6EF7",
      "editorGutter.background": "#111318",
    },
  });
};

export function CodeEditor({
  value,
  language,
  fileId,
  doc,
  awareness,
  reviewMarkers = [],
  canAddReviewComment = false,
  onReviewMarkerClick,
  onReviewGutterClick,
  onTypingActivity,
  readOnly = false,
  cursorPresenceEnabled = true,
  onEditorMount,
}: CodeEditorProps) {
  const { preferences } = useEditorPreferences();
  const { monacoLanguage, isCollaborative, handleMount } = useMonacoYjsBinding({
    fileId,
    language,
    doc,
    awareness,
    onLocalEdit: onTypingActivity,
    cursorPresenceEnabled,
  });

  const editorRef = useRef<MonacoEditorNamespace.IStandaloneCodeEditor | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const hoverDecorationIdsRef = useRef<string[]>([]);
  const reviewMarkersRef = useRef<ReviewGutterMarker[]>(reviewMarkers);
  const canAddReviewCommentRef = useRef(canAddReviewComment);
  const onReviewMarkerClickRef = useRef(onReviewMarkerClick);
  const onReviewGutterClickRef = useRef(onReviewGutterClick);
  reviewMarkersRef.current = reviewMarkers;
  canAddReviewCommentRef.current = canAddReviewComment;
  onReviewMarkerClickRef.current = onReviewMarkerClick;
  onReviewGutterClickRef.current = onReviewGutterClick;

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly, readOnlyMessage: readOnly ? { value: "You have view-only access to this workspace." } : undefined });
  }, [readOnly]);

  useEffect(() => {
    const editorInstance = editorRef.current;
    const model = editorInstance?.getModel();
    if (!editorInstance || !model) {
      return;
    }
    const decorations = buildReviewDecorations(reviewMarkers, model.getLineCount(), (line) => model.getLineMaxColumn(line));
    decorationIdsRef.current = editorInstance.deltaDecorations(decorationIdsRef.current, decorations);
  }, [reviewMarkers, fileId, value]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    handleMount(editorInstance, monaco);
    editorRef.current = editorInstance;
    decorationIdsRef.current = [];
    hoverDecorationIdsRef.current = [];
    onEditorMount?.(editorInstance);

    const topOfLine = (line: number) => editorInstance.getScrolledVisiblePosition({ lineNumber: line, column: 1 })?.top ?? 0;
    const markerOnLine = (line: number) => {
      const onLine = reviewMarkersRef.current.filter((candidate) => candidate.line === line);
      return onLine.find((candidate) => !candidate.resolved && !candidate.orphaned) ?? onLine[0];
    };

    editorInstance.onMouseDown((event) => {
      const line = event.target.position?.lineNumber;
      if (!line) {
        return;
      }
      const isGlyph = event.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN;
      const isBadge =
        event.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT && Boolean(event.target.element?.classList.contains("review-inline-badge"));
      if (!isGlyph && !isBadge) {
        return;
      }
      const marker = markerOnLine(line);
      if (marker) {
        onReviewMarkerClickRef.current?.(marker.threadId, topOfLine(line));
      } else if (isGlyph && canAddReviewCommentRef.current) {
        onReviewGutterClickRef.current?.(line, topOfLine(line));
      }
    });

    editorInstance.onMouseMove((event) => {
      const line = event.target.position?.lineNumber;
      const showAdd = Boolean(line && canAddReviewCommentRef.current && !markerOnLine(line));
      hoverDecorationIdsRef.current = editorInstance.deltaDecorations(
        hoverDecorationIdsRef.current,
        showAdd && line
          ? [{ range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 }, options: { glyphMarginClassName: "review-glyph-add", glyphMarginHoverMessage: { value: "Add a review comment on this line" } } }]
          : [],
      );
    });
    editorInstance.onMouseLeave(() => {
      hoverDecorationIdsRef.current = editorInstance.deltaDecorations(hoverDecorationIdsRef.current, []);
    });

    editorInstance.addAction({
      id: "difflane.addReviewComment",
      label: "Add Review Comment",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyM],
      contextMenuGroupId: "navigation",
      contextMenuOrder: 0,
      run: (instance) => {
        const line = instance.getPosition()?.lineNumber;
        if (!line) return;
        const marker = markerOnLine(line);
        if (marker) {
          onReviewMarkerClickRef.current?.(marker.threadId, topOfLine(line));
        } else if (canAddReviewCommentRef.current) {
          onReviewGutterClickRef.current?.(line, topOfLine(line));
        }
      },
    });
  };

  return (
    <Editor
      path={fileId}
      keepCurrentModel
      value={isCollaborative ? undefined : value}
      defaultValue={isCollaborative ? value : undefined}
      language={monacoLanguage}
      theme={THEME_NAME}
      beforeMount={handleBeforeMount}
      onMount={handleEditorMount}
      height="100%"
      options={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: preferences.fontSize,
        lineHeight: Math.round(preferences.fontSize * 1.55),
        tabSize: preferences.tabSize,
        wordWrap: preferences.wordWrap ? "on" : "off",
        minimap: { enabled: preferences.minimap },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        glyphMargin: true,
        padding: { top: 16 },
        readOnly,
        readOnlyMessage: readOnly ? { value: "You have view-only access to this workspace." } : undefined,
      }}
    />
  );
}
