import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import type { Awareness } from "y-protocols/awareness";
import type { editor, Uri } from "monaco-editor";
import type { AwarenessState } from "@difflane/shared-types";

export interface MonacoYjsBinding {
  destroy: () => void;
}

interface MonacoNamespaceLike {
  editor: {
    getModel: (uri: Uri) => editor.ITextModel | null;
  };
  Uri: {
    parse: (value: string) => Uri;
  };
}

/**
 * Disposes the cached Monaco model for a given file, if one exists.
 *
 * CodeEditor keeps per-file Monaco models alive across tab/file switches
 * (via the `path` + `keepCurrentModel` props) so that Monaco's native
 * undo/redo stack, cursor position and scroll state survive switching
 * away from and back to a file. Because those models are intentionally
 * NOT disposed on remount, callers must explicitly dispose a file's model
 * here once it is genuinely gone (tab closed, file deleted) to avoid
 * leaking models for the lifetime of the page.
 */
export function disposeMonacoModelForFile(monacoInstance: MonacoNamespaceLike | null | undefined, fileId: string): void {
  if (!monacoInstance) {
    return;
  }
  const model = monacoInstance.editor.getModel(monacoInstance.Uri.parse(fileId));
  model?.dispose();
}

const STYLE_ELEMENT_ID = "difflane-yjs-remote-selection-styles";

function getOrCreateStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing instanceof HTMLStyleElement) {
    return existing;
  }
  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  document.head.appendChild(style);
  return style;
}

function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
}

function sanitizeCssColor(value: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "#8d90a0";
}

function renderAwarenessStyles(awareness: Awareness, localClientId: number): void {
  const style = getOrCreateStyleElement();
  const rules: string[] = [];
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === localClientId) {
      return;
    }
    const awarenessState = state as Partial<AwarenessState>;
    const color = sanitizeCssColor(awarenessState.color ?? "#8d90a0");
    const name = escapeCssString(awarenessState.displayName ?? "Guest");
    rules.push(`.yRemoteSelection-${clientId} { background-color: ${color}33; pointer-events: none; }`);
    rules.push(
      `.yRemoteSelectionHead-${clientId} { position: relative; border-left: 2px solid ${color}; pointer-events: none; }`,
      `.yRemoteSelectionHead-${clientId}::after { content: "${name}"; position: absolute; top: -1.1em; left: -2px; font-size: 10px; padding: 0 4px; border-radius: 2px; white-space: nowrap; background-color: ${color}; color: #0b1326; pointer-events: none; }`,
    );
  });
  style.textContent = rules.join("\n");
}

export function bindMonacoToYText(
  yText: Y.Text,
  model: editor.ITextModel,
  editorInstance: editor.IStandaloneCodeEditor,
  awareness: Awareness,
  onLocalEdit?: () => void,
  cursorPresenceEnabled = true,
): MonacoYjsBinding {
  const binding = new MonacoBinding(yText, model, new Set([editorInstance]), awareness);
  const handleAwarenessChange = () => {
    if (!cursorPresenceEnabled) {
      getOrCreateStyleElement().textContent = "";
      return;
    }
    renderAwarenessStyles(awareness, awareness.doc.clientID);
  };
  awareness.on("change", handleAwarenessChange);
  handleAwarenessChange();

  const handleTextChange = (_event: Y.YTextEvent, transaction: Y.Transaction) => {
    if (transaction.local) {
      onLocalEdit?.();
    }
  };
  if (onLocalEdit) {
    yText.observe(handleTextChange);
  }

  return {
    destroy: () => {
      awareness.off("change", handleAwarenessChange);
      if (onLocalEdit) {
        yText.unobserve(handleTextChange);
      }
      binding.destroy();
    },
  };
}
