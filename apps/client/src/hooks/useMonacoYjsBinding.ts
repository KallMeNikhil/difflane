import { useCallback, useEffect, useRef } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { Awareness } from "y-protocols/awareness";
import type { editor as MonacoEditorNamespace } from "monaco-editor";
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
  onLocalEdit?: () => void;
  cursorPresenceEnabled?: boolean;
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
  onLocalEdit,
  cursorPresenceEnabled = true,
}: UseMonacoYjsBindingArgs): UseMonacoYjsBindingResult {
  const editorRef = useRef<MonacoEditorNamespace.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoYjsBinding | null>(null);
  const onLocalEditRef = useRef(onLocalEdit);
  onLocalEditRef.current = onLocalEdit;
  const valueRef = useRef(value);
  valueRef.current = value;

  const rebind = useCallback(() => {
    bindingRef.current?.destroy();
    bindingRef.current = null;

    const editorInstance = editorRef.current;
    if (!editorInstance || !doc || !awareness) {
      return;
    }
    const model = editorInstance.getModel();
    if (!model) {
      return;
    }
    seedFileTextIfEmpty(doc, fileId, valueRef.current);
    const yText = getFileText(doc, fileId);
    bindingRef.current = bindMonacoToYText(
      yText,
      model,
      editorInstance,
      awareness,
      () => onLocalEditRef.current?.(),
      cursorPresenceEnabled,
    );
  }, [fileId, doc, awareness, cursorPresenceEnabled]);

  useEffect(() => {
    rebind();
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [rebind]);

  const handleMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
    rebind();
  };

  return {
    monacoLanguage: toMonacoLanguage(language),
    isCollaborative: Boolean(doc && awareness),
    handleMount,
  };
}
