import type { EditorPreferences } from "../types/settings";

const DISPLAY_NAME_KEY = "difflane:userSettings:displayName";
const EDITOR_PREFERENCES_KEY = "difflane:userSettings:editorPreferences";

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: false,
  minimap: false,
  autoSave: true,
};

function isBrowserStorageAvailable(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function readStoredDisplayName(): string | null {
  if (!isBrowserStorageAvailable()) {
    return null;
  }
  try {
    return window.localStorage.getItem(DISPLAY_NAME_KEY);
  } catch {
    return null;
  }
}

export function writeStoredDisplayName(displayName: string): void {
  if (!isBrowserStorageAvailable()) {
    return;
  }
  try {
    window.localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  } catch {
    // Storage unavailable; the in-memory value still applies for this session.
  }
}

export function readEditorPreferences(): EditorPreferences {
  if (!isBrowserStorageAvailable()) {
    return DEFAULT_EDITOR_PREFERENCES;
  }
  try {
    const raw = window.localStorage.getItem(EDITOR_PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_EDITOR_PREFERENCES;
    }
    const parsed = JSON.parse(raw) as Partial<EditorPreferences>;
    return { ...DEFAULT_EDITOR_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_EDITOR_PREFERENCES;
  }
}

export function writeEditorPreferences(preferences: EditorPreferences): void {
  if (!isBrowserStorageAvailable()) {
    return;
  }
  try {
    window.localStorage.setItem(EDITOR_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage unavailable; the in-memory value still applies for this session.
  }
}
