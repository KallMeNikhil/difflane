import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import type { Awareness } from "y-protocols/awareness";
import type { editor } from "monaco-editor";
import type { AwarenessState } from "@difflane/shared-types";

export interface MonacoYjsBinding {
  destroy: () => void;
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

function renderAwarenessStyles(awareness: Awareness, localClientId: number): void {
  const style = getOrCreateStyleElement();
  const rules: string[] = [];
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === localClientId) {
      return;
    }
    const awarenessState = state as Partial<AwarenessState>;
    const color = awarenessState.color ?? "#8d90a0";
    const name = awarenessState.displayName ?? "Guest";
    rules.push(`.yRemoteSelection-${clientId} { background-color: ${color}33; }`);
    rules.push(
      `.yRemoteSelectionHead-${clientId} { position: relative; border-left: 2px solid ${color}; }`,
      `.yRemoteSelectionHead-${clientId}::after { content: "${name}"; position: absolute; top: -1.1em; left: -2px; font-size: 10px; padding: 0 4px; border-radius: 2px; white-space: nowrap; background-color: ${color}; color: #0b1326; }`,
    );
  });
  style.textContent = rules.join("\n");
}

export function bindMonacoToYText(
  yText: Y.Text,
  model: editor.ITextModel,
  editorInstance: editor.IStandaloneCodeEditor,
  awareness: Awareness,
): MonacoYjsBinding {
  const binding = new MonacoBinding(yText, model, new Set([editorInstance]), awareness);
  const handleAwarenessChange = () => renderAwarenessStyles(awareness, awareness.doc.clientID);
  awareness.on("change", handleAwarenessChange);
  handleAwarenessChange();

  return {
    destroy: () => {
      awareness.off("change", handleAwarenessChange);
      binding.destroy();
    },
  };
}
