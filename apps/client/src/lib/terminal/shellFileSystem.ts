export interface ShellEntry {
  id: string;
  parentId: string | null;
  name: string;
  type: "file" | "folder";
  language?: string;
}

export interface ShellFileSystem {
  entries(): ShellEntry[];
  readFile(id: string): string;
  writeFile(id: string, content: string): void;
  createFile(parentId: string | null, name: string): ShellEntry;
  createFolder(parentId: string | null, name: string): ShellEntry;
  move(id: string, parentId: string | null, name: string): void;
  remove(id: string): void;
}

export const ROOT_ID = null;

export type ResolvedPath =
  | { kind: "root"; segments: string[] }
  | { kind: "entry"; entry: ShellEntry; segments: string[] }
  | { kind: "missing"; parentId: string | null | undefined; name: string; segments: string[] };

export class ShellPathIndex {
  private readonly byId = new Map<string, ShellEntry>();
  private readonly childrenByParent = new Map<string | null, ShellEntry[]>();

  constructor(entries: ShellEntry[]) {
    for (const entry of entries) {
      this.byId.set(entry.id, entry);
      const siblings = this.childrenByParent.get(entry.parentId) ?? [];
      siblings.push(entry);
      this.childrenByParent.set(entry.parentId, siblings);
    }
    for (const siblings of this.childrenByParent.values()) {
      siblings.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  get(id: string): ShellEntry | undefined {
    return this.byId.get(id);
  }

  children(parentId: string | null): ShellEntry[] {
    return this.childrenByParent.get(parentId) ?? [];
  }

  child(parentId: string | null, name: string): ShellEntry | undefined {
    return this.children(parentId).find((entry) => entry.name === name);
  }

  segmentsOf(id: string | null): string[] {
    const segments: string[] = [];
    let cursor = id ? this.byId.get(id) : undefined;
    let guard = 0;
    while (cursor && guard < 256) {
      segments.unshift(cursor.name);
      cursor = cursor.parentId ? this.byId.get(cursor.parentId) : undefined;
      guard += 1;
    }
    return segments;
  }

  resolveSegments(segments: string[]): ResolvedPath {
    let parentId: string | null = ROOT_ID;
    for (let index = 0; index < segments.length; index += 1) {
      const name = segments[index];
      const entry = this.child(parentId, name);
      const isLast = index === segments.length - 1;
      if (!entry) {
        return { kind: "missing", parentId: isLast ? parentId : undefined, name, segments };
      }
      if (isLast) {
        return { kind: "entry", entry, segments };
      }
      if (entry.type !== "folder") {
        return { kind: "missing", parentId: undefined, name, segments };
      }
      parentId = entry.id;
    }
    return { kind: "root", segments: [] };
  }

  descendants(id: string): ShellEntry[] {
    const result: ShellEntry[] = [];
    const visit = (parentId: string, depth: number) => {
      if (depth > 256) return;
      for (const child of this.children(parentId)) {
        result.push(child);
        visit(child.id, depth + 1);
      }
    };
    visit(id, 0);
    return result;
  }
}

export function normalizePath(cwdSegments: string[], path: string): string[] {
  const absolute = path.startsWith("/") || path === "~" || path.startsWith("~/");
  const trimmed = path.startsWith("~") ? path.slice(1) : path;
  const segments = absolute ? [] : [...cwdSegments];
  for (const part of trimmed.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return segments;
}
