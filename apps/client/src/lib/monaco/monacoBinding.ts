import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import type { Awareness } from "y-protocols/awareness";
import type { editor, Uri } from "monaco-editor";
import type { AwarenessState } from "@difflane/shared-types";
import { getUndoManager } from "./collaborativeUndo";

export interface MonacoYjsBinding {
  destroy: () => void;
}

export interface MonacoNamespaceLike {
  editor: {
    getModel: (uri: Uri) => editor.ITextModel | null;
  };
  Uri: {
    parse: (value: string) => Uri;
  };
  KeyMod: { CtrlCmd: number; Shift: number };
  KeyCode: { KeyZ: number; KeyY: number };
}

export function disposeMonacoModelForFile(monacoInstance: Pick<MonacoNamespaceLike, "editor" | "Uri"> | null | undefined, fileId: string): void {
  if (!monacoInstance) {
    return;
  }
  const model = monacoInstance.editor.getModel(monacoInstance.Uri.parse(fileId));
  model?.dispose();
}

const STYLE_ELEMENT_ID = "difflane-yjs-remote-selection-styles";
const LABEL_VISIBLE_MS = 2500;
const OVERVIEW_RULER_CENTER_LANE = 2;
const MINIMAP_INLINE_POSITION = 1;

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

export function sanitizeCssColor(value: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "#8d90a0";
}

interface RemoteSelectionState {
  selection?: { anchor: unknown; head: unknown } | null;
}

export function buildRemoteSelectionCss(
  states: Map<number, unknown>,
  localClientId: number,
  activeClientIds: ReadonlySet<number>,
): string {
  const rules: string[] = [];
  states.forEach((state, clientId) => {
    if (clientId === localClientId) {
      return;
    }
    const awarenessState = state as Partial<AwarenessState>;
    const color = sanitizeCssColor(awarenessState.color ?? "#8d90a0");
    const name = escapeCssString(awarenessState.displayName ?? "Guest");
    const labelOpacity = activeClientIds.has(clientId) ? 1 : 0;
    rules.push(
      `.yRemoteSelection-${clientId} { background-color: ${color}33; pointer-events: none; }`,
      `.yRemoteSelectionHead-${clientId} { position: relative; border-left: 2px solid ${color}; margin-left: -1px; pointer-events: none; }`,
      `.yRemoteSelectionHead-${clientId}::before { content: ""; position: absolute; top: -3px; left: -4px; width: 6px; height: 6px; border-radius: 9999px; background-color: ${color}; }`,
      `.yRemoteSelectionHead-${clientId}::after { content: "${name}"; position: absolute; top: -1.35em; left: -2px; z-index: 10; font: 600 10px/1.4 "Hanken Grotesk", sans-serif; padding: 0 5px; border-radius: 3px 3px 3px 0; white-space: nowrap; background-color: ${color}; color: #0b1326; pointer-events: none; opacity: ${labelOpacity}; transition: opacity 0.35s ease; }`,
    );
  });
  return rules.join("\n");
}

function readSelectionKey(state: unknown): string {
  const selection = (state as RemoteSelectionState | null)?.selection;
  return selection ? JSON.stringify(selection) : "";
}

export function bindMonacoToYText(
  yText: Y.Text,
  model: editor.ITextModel,
  editorInstance: editor.IStandaloneCodeEditor,
  awareness: Awareness,
  monaco: MonacoNamespaceLike | null,
  onLocalEdit?: () => void,
  cursorPresenceEnabled = true,
): MonacoYjsBinding {
  const binding = new MonacoBinding(yText, model, new Set([editorInstance]), awareness);

  const undoManager = getUndoManager(yText);
  undoManager.addTrackedOrigin(binding);
  const restoreCursor = (event: { stackItem: { meta: Map<string, unknown> } }) => {
    const relative = event.stackItem.meta.get("cursor") as Y.RelativePosition | undefined;
    const absolute = relative ? Y.createAbsolutePositionFromRelativePosition(relative, yText.doc!) : null;
    if (absolute && absolute.type === yText) {
      const position = model.getPositionAt(absolute.index);
      editorInstance.setSelection({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column });
      editorInstance.revealPositionInCenterIfOutsideViewport(position);
    }
  };
  const rememberCursor = (event: { stackItem: { meta: Map<string, unknown> }; origin: unknown }) => {
    if (event.origin !== binding) {
      return;
    }
    const selection = editorInstance.getSelection();
    if (selection && !event.stackItem.meta.has("cursor")) {
      event.stackItem.meta.set("cursor", Y.createRelativePositionFromTypeIndex(yText, model.getOffsetAt(selection.getStartPosition())));
    }
  };
  undoManager.on("stack-item-added", rememberCursor);
  undoManager.on("stack-item-popped", restoreCursor);
  if (monaco) {
    const undo = () => {
      undoManager.undo();
    };
    const redo = () => {
      undoManager.redo();
    };
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, undo);
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, redo);
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, redo);
  }

  const activeClientIds = new Set<number>();
  const lastSelectionByClient = new Map<number, string>();
  const labelTimers = new Map<number, ReturnType<typeof setTimeout>>();
  let rulerDecorationIds: string[] = [];

  const renderPresence = () => {
    if (!cursorPresenceEnabled) {
      getOrCreateStyleElement().textContent = "";
      rulerDecorationIds = editorInstance.deltaDecorations(rulerDecorationIds, []);
      return;
    }
    const states = awareness.getStates();
    getOrCreateStyleElement().textContent = buildRemoteSelectionCss(states, awareness.clientID, activeClientIds);

    const decorations: editor.IModelDeltaDecoration[] = [];
    states.forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const head = (state as RemoteSelectionState | null)?.selection?.head;
      if (!head) return;
      const absolute = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(head), yText.doc!);
      if (!absolute || absolute.type !== yText) return;
      const position = model.getPositionAt(absolute.index);
      const color = sanitizeCssColor((state as Partial<AwarenessState>).color ?? "#8d90a0");
      decorations.push({
        range: { startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: 1 },
        options: {
          overviewRuler: { color, position: OVERVIEW_RULER_CENTER_LANE },
          minimap: { color, position: MINIMAP_INLINE_POSITION },
        },
      });
    });
    rulerDecorationIds = editorInstance.deltaDecorations(rulerDecorationIds, decorations);
  };

  const handleAwarenessChange = () => {
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const key = readSelectionKey(state);
      if (key && lastSelectionByClient.get(clientId) !== key) {
        lastSelectionByClient.set(clientId, key);
        activeClientIds.add(clientId);
        clearTimeout(labelTimers.get(clientId));
        labelTimers.set(
          clientId,
          setTimeout(() => {
            activeClientIds.delete(clientId);
            renderPresence();
          }, LABEL_VISIBLE_MS),
        );
      }
    });
    renderPresence();
  };
  awareness.on("change", handleAwarenessChange);
  handleAwarenessChange();

  const handleTextChange = (_event: Y.YTextEvent, transaction: Y.Transaction) => {
    if (transaction.local) {
      onLocalEdit?.();
    } else {
      renderPresence();
    }
  };
  yText.observe(handleTextChange);

  return {
    destroy: () => {
      awareness.off("change", handleAwarenessChange);
      yText.unobserve(handleTextChange);
      undoManager.off("stack-item-added", rememberCursor);
      undoManager.off("stack-item-popped", restoreCursor);
      undoManager.removeTrackedOrigin(binding);
      labelTimers.forEach((timer) => clearTimeout(timer));
      try {
        editorInstance.deltaDecorations(rulerDecorationIds, []);
      } catch {}
      binding.destroy();
    },
  };
}
