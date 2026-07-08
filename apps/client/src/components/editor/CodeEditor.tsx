import { useEffect, useRef } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { toMonacoLanguage } from "../../services/FileTreeService";
import { getFileText, seedFileTextIfEmpty } from "../../services/CollaborationService";
import { bindMonacoToYText, type MonacoYjsBinding } from "../../lib/monaco/monacoBinding";
import type { EditorLanguage } from "../../types/workspace";

interface CodeEditorProps {
  value: string;
  language: EditorLanguage;
  fileId: string;
  doc?: Y.Doc | null;
  awareness?: Awareness | null;
}

const THEME_NAME = "difflane-slate";

const handleBeforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0b1326",
      "editor.foreground": "#dbe2fd",
      "editorLineNumber.foreground": "#8d90a0",
      "editorLineNumber.activeForeground": "#dbe2fd",
      "editor.selectionBackground": "#2563eb40",
      "editorCursor.foreground": "#b4c5ff",
      "editorGutter.background": "#0b1326",
    },
  });
};

export function CodeEditor({ value, language, fileId, doc, awareness }: CodeEditorProps) {
  const bindingRef = useRef<MonacoYjsBinding | null>(null);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [fileId]);

  const handleMount: OnMount = (editorInstance) => {
    if (!doc || !awareness) {
      return;
    }
    const model = editorInstance.getModel();
    if (!model) {
      return;
    }
    seedFileTextIfEmpty(doc, fileId, value);
    const yText = getFileText(doc, fileId);
    bindingRef.current = bindMonacoToYText(yText, model, editorInstance, awareness);
  };

  const isCollaborative = Boolean(doc && awareness);

  return (
    <Editor
      key={`${fileId}:${isCollaborative ? "collab" : "local"}`}
      value={isCollaborative ? undefined : value}
      defaultValue={isCollaborative ? value : undefined}
      language={toMonacoLanguage(language)}
      theme={THEME_NAME}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      height="100%"
      options={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        lineHeight: 22,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16 },
      }}
    />
  );
}
