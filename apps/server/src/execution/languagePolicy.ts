import type { ExecutionLanguageId } from "@difflane/shared-types";

export interface Judge0LanguageBinding {
  judge0LanguageId: number;
  compileCommand: string | null;
}

export const JUDGE0_LANGUAGE_BINDINGS: Record<Exclude<ExecutionLanguageId, "html" | "css">, Judge0LanguageBinding> = {
  c: { judge0LanguageId: 50, compileCommand: null },
  cpp: { judge0LanguageId: 54, compileCommand: null },
  java: { judge0LanguageId: 62, compileCommand: null },
  python: { judge0LanguageId: 71, compileCommand: null },
  javascript: { judge0LanguageId: 63, compileCommand: null },
  typescript: { judge0LanguageId: 74, compileCommand: null },
};

export function isJudge0ExecutableLanguage(
  languageId: ExecutionLanguageId,
): languageId is Exclude<ExecutionLanguageId, "html" | "css"> {
  return languageId !== "html" && languageId !== "css";
}

export function isPreviewLanguage(languageId: ExecutionLanguageId): boolean {
  return languageId === "html" || languageId === "css";
}
