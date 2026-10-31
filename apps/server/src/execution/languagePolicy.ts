import type { ExecutionLanguageId } from "@difflane/shared-types";

export type Judge0ExecutableLanguageId = Exclude<ExecutionLanguageId, "html" | "css">;

export interface Judge0LanguageBinding {
  fallbackJudge0LanguageId: number;
  namePattern: RegExp;
  judge0SourceFileName: string;
}

export const JUDGE0_LANGUAGE_BINDINGS: Record<Judge0ExecutableLanguageId, Judge0LanguageBinding> = {
  c: { fallbackJudge0LanguageId: 50, namePattern: /^C \(GCC ([\d.]+)\)$/, judge0SourceFileName: "main.c" },
  cpp: { fallbackJudge0LanguageId: 54, namePattern: /^C\+\+ \(GCC ([\d.]+)\)$/, judge0SourceFileName: "main.cpp" },
  java: { fallbackJudge0LanguageId: 62, namePattern: /^Java \((?:Open)?JDK ([\d.]+)\)$/, judge0SourceFileName: "Main.java" },
  python: { fallbackJudge0LanguageId: 71, namePattern: /^Python \((3[\d.]*)\)$/, judge0SourceFileName: "script.py" },
  javascript: { fallbackJudge0LanguageId: 63, namePattern: /^JavaScript \(Node\.js ([\d.]+)\)$/, judge0SourceFileName: "script.js" },
  typescript: { fallbackJudge0LanguageId: 74, namePattern: /^TypeScript \(([\d.]+)\)$/, judge0SourceFileName: "script.ts" },
};

export function isJudge0ExecutableLanguage(languageId: ExecutionLanguageId): languageId is Judge0ExecutableLanguageId {
  return languageId !== "html" && languageId !== "css";
}

export function isPreviewLanguage(languageId: ExecutionLanguageId): boolean {
  return languageId === "html" || languageId === "css";
}

function compareVersions(a: string, b: string): number {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

export function resolveJudge0LanguageIds(
  available: { id: number; name: string }[],
): Record<Judge0ExecutableLanguageId, number> {
  const resolved = {} as Record<Judge0ExecutableLanguageId, number>;
  for (const [languageId, binding] of Object.entries(JUDGE0_LANGUAGE_BINDINGS) as [Judge0ExecutableLanguageId, Judge0LanguageBinding][]) {
    let best: { id: number; version: string } | null = null;
    for (const candidate of available) {
      const match = binding.namePattern.exec(candidate.name.trim());
      if (!match) {
        continue;
      }
      if (!best || compareVersions(match[1], best.version) > 0) {
        best = { id: candidate.id, version: match[1] };
      }
    }
    resolved[languageId] = best?.id ?? binding.fallbackJudge0LanguageId;
  }
  return resolved;
}
