import Editor, { type BeforeMount } from "@monaco-editor/react";
import { toMonacoLanguage } from "../../services/FileTreeService";
import type { EditorLanguage } from "../../types/workspace";

interface CodeEditorProps {
  value: string;
  language: EditorLanguage;
  fileId: string;
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

export function CodeEditor({ value, language, fileId }: CodeEditorProps) {
  return (
    <Editor
      key={fileId}
      value={value}
      language={toMonacoLanguage(language)}
      theme={THEME_NAME}
      beforeMount={handleBeforeMount}
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
