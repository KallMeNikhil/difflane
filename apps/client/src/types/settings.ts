export type EditorFontSize = 12 | 14 | 16 | 18;

export type EditorTabSize = 2 | 4 | 8;

export interface EditorPreferences {
  fontSize: EditorFontSize;
  tabSize: EditorTabSize;
  wordWrap: boolean;
  minimap: boolean;
  autoSave: boolean;
}
