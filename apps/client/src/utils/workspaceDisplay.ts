import type { EditorLanguage, FileStatus } from "../types/workspace";

const LANGUAGE_LABELS: Record<EditorLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  plaintext: "Plain Text",
};

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
