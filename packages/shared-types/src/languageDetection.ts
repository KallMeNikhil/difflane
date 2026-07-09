export const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  md: "Markdown",
  py: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
};

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
  return top?.[0] ?? "Plain Text";
}
