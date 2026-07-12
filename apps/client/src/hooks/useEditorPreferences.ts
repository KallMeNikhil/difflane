import { createContext, useContext } from "react";
import type { EditorPreferences } from "../types/settings";

export interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  setFontSize: (fontSize: EditorPreferences["fontSize"]) => void;
  setTabSize: (tabSize: EditorPreferences["tabSize"]) => void;
  setWordWrap: (wordWrap: boolean) => void;
  setMinimap: (minimap: boolean) => void;
  setAutoSave: (autoSave: boolean) => void;
}

export const EditorPreferencesContext = createContext<EditorPreferencesContextValue | undefined>(undefined);

export function useEditorPreferences(): EditorPreferencesContextValue {
  const context = useContext(EditorPreferencesContext);
  if (!context) {
    throw new Error("useEditorPreferences must be used within an EditorPreferencesProvider");
  }
  return context;
}
