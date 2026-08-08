export const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  css: "css",
  html: "html",
  md: "markdown",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  c: "c",
  h: "c",
  cs: "csharp",
  yml: "yaml",
  yaml: "yaml",
};

export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
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

export function getLanguageDisplayName(languageId: string): string {
  return LANGUAGE_DISPLAY_NAMES[languageId] ?? languageId;
}

export const BINARY_FILE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "pdf", "zip", "gz", "tar",
  "woff", "woff2", "ttf", "eot", "mp4", "mp3", "wav", "mov", "avi", "exe", "dll",
]);

export const IMPORT_LIMITS = {
  maxFiles: 300,
  maxFileSizeBytes: 200_000,
} as const;

export function extensionOf(path: string): string {
  const segments = path.split(".");
  return segments.length > 1 ? segments[segments.length - 1].toLowerCase() : "";
}

export function detectLanguageForPath(path: string): string | undefined {
  return LANGUAGE_BY_EXTENSION[extensionOf(path)];
}

export function isBinaryPath(path: string): boolean {
  return BINARY_FILE_EXTENSIONS.has(extensionOf(path));
}

export function detectDominantLanguage(paths: string[]): string {
  const tally = new Map<string, number>();
  for (const path of paths) {
    const language = detectLanguageForPath(path);
    if (language) {
      tally.set(language, (tally.get(language) ?? 0) + 1);
    }
  }
  const [top] = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  return top?.[0] ?? "plaintext";
}
