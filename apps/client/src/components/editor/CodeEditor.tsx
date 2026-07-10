import Editor, { type BeforeMount } from "@monaco-editor/react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { useMonacoYjsBinding } from "../../hooks/useMonacoYjsBinding";
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

export function CodeEditor({ value, language, fileId, doc, awareness }: CodeEditorProps) {
  const { monacoLanguage, isCollaborative, handleMount } = useMonacoYjsBinding({
    fileId,
    value,
    language,
    doc,
    awareness,
  });

  return (
    <Editor
      key={`${fileId}:${isCollaborative ? "collab" : "local"}`}
      value={isCollaborative ? undefined : value}
      defaultValue={isCollaborative ? value : undefined}
      language={monacoLanguage}
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
