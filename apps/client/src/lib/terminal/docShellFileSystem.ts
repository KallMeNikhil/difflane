import type * as Y from "yjs";
import { peekFileText } from "../../services/CollaborationService";
import {
  createFile,
  createFolder,
  deleteEntry,
  moveEntry,
  readFileSystemEntries,
  replaceFileContent,
} from "../../services/WorkspaceFileSystemService";
import type { ShellEntry, ShellFileSystem } from "./shellFileSystem";

export function createDocShellFileSystem(doc: Y.Doc): ShellFileSystem {
  const toShellEntry = (entry: { id: string; parentId: string | null; name: string; type: "file" | "folder"; language?: string }): ShellEntry => ({
    id: entry.id,
    parentId: entry.parentId,
    name: entry.name,
    type: entry.type,
    language: entry.language,
  });

  return {
    entries: () => readFileSystemEntries(doc).map(toShellEntry),
    readFile: (id) => peekFileText(doc, id),
    writeFile: (id, content) => replaceFileContent(doc, id, content),
    createFile: (parentId, name) => toShellEntry(createFile(doc, parentId, name)),
    createFolder: (parentId, name) => toShellEntry(createFolder(doc, parentId, name)),
    move: (id, parentId, name) => moveEntry(doc, id, parentId, name),
    remove: (id) => {
      deleteEntry(doc, id);
    },
  };
}
