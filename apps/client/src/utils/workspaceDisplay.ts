import type { EditorLanguage, FileStatus, MemberRole } from "../types/workspace";

const LANGUAGE_LABELS: Record<EditorLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  yaml: "YAML",
  plaintext: "Plain Text",
};

export const EDITOR_LANGUAGE_OPTIONS: EditorLanguage[] = [
  "typescript",
  "javascript",
  "python",
  "java",
  "go",
  "rust",
  "cpp",
  "c",
  "csharp",
  "yaml",
  "json",
  "css",
  "html",
  "markdown",
  "plaintext",
];

export function getLanguageLabel(language: EditorLanguage): string {
  return LANGUAGE_LABELS[language];
}

export function getFileIcon(fileName: string): string {
  if (fileName.endsWith(".tsx") || fileName.endsWith(".ts") || fileName.endsWith(".jsx") || fileName.endsWith(".js")) {
    return "data_object";
  }
  if (fileName.endsWith(".svg") || fileName.endsWith(".png") || fileName.endsWith(".jpg")) {
    return "image";
  }
  if (fileName.endsWith(".json")) {
    return "data_object";
  }
  if (fileName.endsWith(".md")) {
    return "description";
  }
  return "insert_drive_file";
}

export function getImportSourceLabel(provider: "github" | "local" | "zip"): string {
  if (provider === "github") {
    return "Imported from GitHub";
  }
  if (provider === "zip") {
    return "Imported from a ZIP archive";
  }
  return "Imported from a local folder";
}

export function getRelativeTimeLabel(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

const STATUS_LABELS: Record<Exclude<FileStatus, "unmodified">, string> = {
  modified: "MODIFIED",
  added: "ADDED",
  deleted: "DELETED",
};

export function getStatusBadgeLabel(status: FileStatus | undefined): string | undefined {
  if (!status || status === "unmodified") {
    return undefined;
  }
  return STATUS_LABELS[status];
}

const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export function getMemberRoleLabel(role: MemberRole): string {
  return MEMBER_ROLE_LABELS[role];
}
