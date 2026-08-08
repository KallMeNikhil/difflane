import { useEffect, useRef } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNamespace } from "monaco-editor";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { useMonacoYjsBinding } from "../../hooks/useMonacoYjsBinding";
import { useEditorPreferences } from "../../hooks/useEditorPreferences";
import type { EditorLanguage } from "../../types/workspace";

export interface ReviewGutterMarker {
  threadId: string;
  line: number;
  resolved: boolean;
  orphaned: boolean;
}

interface CodeEditorProps {
  value: string;
  language: EditorLanguage;
  fileId: string;
  doc?: Y.Doc | null;
  awareness?: Awareness | null;
  reviewMarkers?: ReviewGutterMarker[];
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
    value,
    language,
    doc,
    awareness,
    onLocalEdit: onTypingActivity,
    cursorPresenceEnabled,
  });

  const editorRef = useRef<MonacoEditorNamespace.IStandaloneCodeEditor | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const reviewMarkersRef = useRef<ReviewGutterMarker[]>(reviewMarkers);
  const onReviewMarkerClickRef = useRef(onReviewMarkerClick);
  const onReviewGutterClickRef = useRef(onReviewGutterClick);

  useEffect(() => {
    reviewMarkersRef.current = reviewMarkers;
  }, [reviewMarkers]);
  useEffect(() => {
    onReviewMarkerClickRef.current = onReviewMarkerClick;
  }, [onReviewMarkerClick]);
  useEffect(() => {
    onReviewGutterClickRef.current = onReviewGutterClick;
  }, [onReviewGutterClick]);

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly, readOnlyMessage: readOnly ? { value: "You have view-only access to this workspace." } : undefined });
  }, [readOnly]);

  useEffect(() => {
    const editorInstance = editorRef.current;
    if (!editorInstance) {
      return;
    }
    const decorations: MonacoEditorNamespace.IModelDeltaDecoration[] = reviewMarkers.map((marker) => ({
      range: { startLineNumber: marker.line, startColumn: 1, endLineNumber: marker.line, endColumn: 1 },
      options: {
        glyphMarginClassName: marker.orphaned ? "review-glyph-orphaned" : marker.resolved ? "review-glyph-resolved" : "review-glyph-open",
        glyphMarginHoverMessage: { value: "Review comment — click to view" },
      },
    }));
    decorationIdsRef.current = editorInstance.deltaDecorations(decorationIdsRef.current, decorations);
  }, [reviewMarkers, fileId]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    handleMount(editorInstance, monaco);
    editorRef.current = editorInstance;
    decorationIdsRef.current = [];
    onEditorMount?.(editorInstance);
    editorInstance.onMouseDown((event) => {
      if (event.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN || !event.target.position) {
        return;
      }
      const line = event.target.position.lineNumber;
      const visiblePosition = editorInstance.getScrolledVisiblePosition({ lineNumber: line, column: 1 });
      const top = visiblePosition?.top ?? 0;
      const marker = reviewMarkersRef.current.find((candidate) => candidate.line === line);
      if (marker) {
        onReviewMarkerClickRef.current?.(marker.threadId, top);
      } else {
        onReviewGutterClickRef.current?.(line, top);
      }
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
