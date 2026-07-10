import { useEffect, useRef } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { toMonacoLanguage } from "../services/FileTreeService";
import { getFileText, seedFileTextIfEmpty } from "../services/CollaborationService";
import { bindMonacoToYText, type MonacoYjsBinding } from "../lib/monaco/monacoBinding";
import type { EditorLanguage } from "../types/workspace";

interface UseMonacoYjsBindingArgs {
  fileId: string;
  value: string;
  language: EditorLanguage;
  doc?: Y.Doc | null;
  awareness?: Awareness | null;
}

interface UseMonacoYjsBindingResult {
  monacoLanguage: string;
  isCollaborative: boolean;
  handleMount: OnMount;
}

export function useMonacoYjsBinding({
  fileId,
  value,
  language,
  doc,
  awareness,
}: UseMonacoYjsBindingArgs): UseMonacoYjsBindingResult {
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

  return {
    monacoLanguage: toMonacoLanguage(language),
    isCollaborative: Boolean(doc && awareness),
    handleMount,
  };
}
