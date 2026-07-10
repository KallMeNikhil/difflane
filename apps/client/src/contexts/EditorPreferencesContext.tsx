import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { EditorPreferences } from "../types/settings";
import { readEditorPreferences, writeEditorPreferences } from "../services/UserPreferencesService";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  setFontSize: (fontSize: EditorPreferences["fontSize"]) => void;
  setTabSize: (tabSize: EditorPreferences["tabSize"]) => void;
  setWordWrap: (wordWrap: boolean) => void;
  setMinimap: (minimap: boolean) => void;
  setAutoSave: (autoSave: boolean) => void;
}

const EditorPreferencesContext = createContext<EditorPreferencesContextValue | undefined>(undefined);

export function EditorPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<EditorPreferences>(readEditorPreferences);

  const updatePreferences = useCallback((update: Partial<EditorPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...update };
      writeEditorPreferences(next);
      return next;
    });
  }, []);

  const value = useMemo<EditorPreferencesContextValue>(
    () => ({
      preferences,
      setFontSize: (fontSize) => updatePreferences({ fontSize }),
      setTabSize: (tabSize) => updatePreferences({ tabSize }),
      setWordWrap: (wordWrap) => updatePreferences({ wordWrap }),
      setMinimap: (minimap) => updatePreferences({ minimap }),
      setAutoSave: (autoSave) => updatePreferences({ autoSave }),
    }),
    [preferences, updatePreferences],
  );

  return <EditorPreferencesContext.Provider value={value}>{children}</EditorPreferencesContext.Provider>;
}

export function useEditorPreferences(): EditorPreferencesContextValue {
  const context = useContext(EditorPreferencesContext);
  if (!context) {
    throw new Error("useEditorPreferences must be used within an EditorPreferencesProvider");
  }
  return context;
}
