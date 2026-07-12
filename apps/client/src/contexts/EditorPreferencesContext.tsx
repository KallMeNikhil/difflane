import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { EditorPreferences } from "../types/settings";
import { readEditorPreferences, writeEditorPreferences } from "../services/UserPreferencesService";
import { EditorPreferencesContext, type EditorPreferencesContextValue } from "../hooks/useEditorPreferences";

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
