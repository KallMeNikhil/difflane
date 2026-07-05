import type { CodeToken, CodeTokenKind, FileDiff } from "../types/workspace";

function t(text: string, kind: CodeTokenKind = "plain"): CodeToken {
  return { text, kind };
}

export const MOCK_FILE_DIFFS: Record<string, FileDiff> = {
  "file-main-editor": {
    fileId: "file-main-editor",
    path: "src/components/MainEditor.tsx",
    language: "typescript",
    additions: 5,
    deletions: 4,
    hunks: [
      {
        id: "hunk-1-removed",
        lines: [
          {
            id: "l42",
            kind: "context",
            oldLineNumber: 42,
            newLineNumber: 42,
            tokens: [
              t("const ", "keyword"),
              t("MainEditor", "identifier"),
              t(" = ({ "),
              t("files", "parameter"),
              t(", "),
              t("activeFileId", "parameter"),
              t(" }) => {"),
            ],
          },
          {
            id: "l43",
            kind: "context",
            oldLineNumber: 43,
            newLineNumber: 43,
            tokens: [
              t("const ", "keyword"),
              t("[content, setContent] = "),
              t("useState", "identifier"),
              t("("),
              t("''", "string"),
              t(");"),
            ],
          },
          { id: "l44", kind: "context", oldLineNumber: 44, newLineNumber: 44, tokens: [] },
          {
            id: "l45",
            kind: "removed",
            oldLineNumber: 45,
            tokens: [t("// old implementation", "comment")],
          },
          {
            id: "l46",
            kind: "removed",
            oldLineNumber: 46,
            tokens: [t("useEffect", "keyword"), t("(() => {")],
            typingIndicator: "Team Member typing",
          },
          {
            id: "l47",
            kind: "removed",
            oldLineNumber: 47,
            tokens: [t("  "), t("loadLegacyFile", "identifier"), t("(activeFileId)."), t("then", "identifier"), t("(setContent);")],
          },
          {
            id: "l48",
            kind: "removed",
            oldLineNumber: 48,
            tokens: [t("}, [activeFileId]);")],
          },
        ],
      },
      {
        id: "hunk-2-added",
        lines: [
          {
            id: "l49",
            kind: "added",
            newLineNumber: 49,
            tokens: [t("useEffect", "keyword"), t("(() => {")],
          },
          {
            id: "l50",
            kind: "added",
            newLineNumber: 50,
            tokens: [t("  const ", "keyword"), t("fetchFile = "), t("async", "keyword"), t(" () => {")],
          },
          {
            id: "l51",
            kind: "added",
            newLineNumber: 51,
            tokens: [
              t("  const ", "keyword"),
              t("data = "),
              t("await", "keyword"),
              t(" "),
              t("api", "identifier"),
              t("."),
              t("getFile", "highlight"),
              t("(activeFileId);"),
            ],
          },
          {
            id: "l52",
            kind: "added",
            newLineNumber: 52,
            tokens: [t("  "), t("setContent", "identifier"), t("(data.content);")],
          },
          { id: "l53", kind: "added", newLineNumber: 53, tokens: [t("  };")] },
        ],
      },
    ],
  },
  "file-sidebar": {
    fileId: "file-sidebar",
    path: "src/components/Sidebar.tsx",
    language: "typescript",
    additions: 9,
    deletions: 0,
    hunks: [
      {
        id: "hunk-sidebar-added",
        lines: [
          { id: "s1", kind: "added", newLineNumber: 1, tokens: [t("import "), t("{ NavLink }", "identifier"), t(" from "), t("\"react-router-dom\"", "string"), t(";")] },
          { id: "s2", kind: "added", newLineNumber: 2, tokens: [] },
          {
            id: "s3",
            kind: "added",
            newLineNumber: 3,
            tokens: [t("export ", "keyword"), t("function ", "keyword"), t("Sidebar", "identifier"), t("({ "), t("items", "parameter"), t(" }) {")],
          },
          { id: "s4", kind: "added", newLineNumber: 4, tokens: [t("  return (")] },
          { id: "s5", kind: "added", newLineNumber: 5, tokens: [t('    <aside className="w-64 border-r border-outline-variant">')] },
          { id: "s6", kind: "added", newLineNumber: 6, tokens: [t("      {items.map((item) => (")] },
          { id: "s7", kind: "added", newLineNumber: 7, tokens: [t("        <NavLink key={item.path} to={item.path}>{item.label}</NavLink>")] },
          { id: "s8", kind: "added", newLineNumber: 8, tokens: [t("      ))}")] },
          { id: "s9", kind: "added", newLineNumber: 9, tokens: [t("    </aside>")] },
        ],
      },
    ],
  },
  "file-legacy-api": {
    fileId: "file-legacy-api",
    path: "src/services/api.ts",
    language: "typescript",
    additions: 0,
    deletions: 4,
    hunks: [
      {
        id: "hunk-api-removed",
        lines: [
          { id: "a1", kind: "removed", oldLineNumber: 1, tokens: [t("export ", "keyword"), t("async ", "keyword"), t("function ", "keyword"), t("getFile", "identifier"), t("(id: string) {")] },
          { id: "a2", kind: "removed", oldLineNumber: 2, tokens: [t("  return fetch(`/legacy/files/${id}`).then((res) => res.json());")] },
          { id: "a3", kind: "removed", oldLineNumber: 3, tokens: [t("}")] },
          { id: "a4", kind: "removed", oldLineNumber: 4, tokens: [t("// deprecated in favor of api.getFile", "comment")] },
        ],
      },
    ],
  },
};
