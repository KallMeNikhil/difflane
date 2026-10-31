import * as Y from "yjs";

const UNDO_CAPTURE_TIMEOUT_MS = 400;

const undoManagers = new WeakMap<Y.Text, Y.UndoManager>();

export function getUndoManager(yText: Y.Text): Y.UndoManager {
  const existing = undoManagers.get(yText);
  if (existing) {
    return existing;
  }
  const manager = new Y.UndoManager(yText, { captureTimeout: UNDO_CAPTURE_TIMEOUT_MS, trackedOrigins: new Set() });
  undoManagers.set(yText, manager);
  return manager;
}
