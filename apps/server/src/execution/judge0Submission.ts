import type { ExecutionFileSnapshotEntry } from "@difflane/shared-types";
import { buildInteractiveHook } from "./interactiveRuntime.js";
import { JUDGE0_LANGUAGE_BINDINGS, type Judge0ExecutableLanguageId } from "./languagePolicy.js";
import { createZipArchive, type ZipEntryInput } from "./zipArchive.js";

const MAX_ADDITIONAL_FILES = 60;
const MAX_ADDITIONAL_BYTES = 2_000_000;

export interface PreparedSubmission {
  sourceCode: string;
  additionalFilesBase64: string | undefined;
  compilerOptions: string | undefined;
  rewriteDiagnostics: (text: string) => string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createDiagnosticsRewriter(
  judge0SourceFileName: string,
  entryFileName: string | null,
  renames: Record<string, string> = {},
): (text: string) => string {
  const sourcePattern = new RegExp(`(^|[\\s"'(/])${escapeRegExp(judge0SourceFileName)}(?=[:"'),\\s]|$)`, "gm");
  const renamePatterns = Object.entries(renames).map(
    ([sandboxName, workspaceName]) => [new RegExp(`\\b${escapeRegExp(sandboxName)}\\b`, "g"), workspaceName] as const,
  );
  return (text) => {
    let result = text.replace(/\/box\//g, "");
    if (entryFileName && entryFileName !== judge0SourceFileName) {
      result = result.replace(sourcePattern, (_match, prefix: string) => `${prefix}${entryFileName}`);
    }
    for (const [pattern, workspaceName] of renamePatterns) {
      result = result.replace(pattern, workspaceName);
    }
    return result;
  };
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
}

const JAVA_IDENTIFIER = /^[A-Za-z_$][A-Za-z\d_$]*$/;
const JAVA_PACKAGE = /^\s*package\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*;/m;

function prepareJavaEntry(entryPath: string, content: string): { sourceCode: string; extraFile: ZipEntryInput } | null {
  const className = stripExtension(basename(entryPath));
  if (className === "Main" || !JAVA_IDENTIFIER.test(className)) {
    return null;
  }
  const packageName = JAVA_PACKAGE.exec(content)?.[1];
  const qualifiedName = packageName ? `${packageName}.${className}` : className;
  const filePath = packageName ? `${packageName.replace(/\./g, "/")}/${className}.java` : `${className}.java`;
  return {
    sourceCode: `public class Main {\n  public static void main(String[] args) throws Exception {\n    ${qualifiedName}.main(args);\n  }\n}\n`,
    extraFile: { path: filePath, content },
  };
}

export function prepareJudge0Submission(
  languageId: Judge0ExecutableLanguageId,
  entryPath: string,
  files: ExecutionFileSnapshotEntry[],
  options: { interactive?: boolean } = {},
): PreparedSubmission {
  const entryFile = files.find((file) => file.path === entryPath);
  if (!entryFile) {
    throw new Error(`Entry file "${entryPath}" was not found.`);
  }

  const binding = JUDGE0_LANGUAGE_BINDINGS[languageId];
  const entryDir = dirname(entryPath);
  const prefix = entryDir ? `${entryDir}/` : "";
  const additional: ZipEntryInput[] = [];
  const takenPaths = new Set<string>([binding.judge0SourceFileName]);
  let totalBytes = 0;

  let sourceCode = entryFile.content;
  let compilerOptions: string | undefined;
  let renames: Record<string, string> = {};
  let diagnosticsEntryName: string | null = basename(entryPath);
  if (options.interactive) {
    const hook = buildInteractiveHook(languageId, basename(entryPath), entryFile.content, binding.judge0SourceFileName);
    sourceCode = hook.sourceCode;
    compilerOptions = hook.compilerOptions;
    renames = hook.renames;
    diagnosticsEntryName = null;
    for (const extra of hook.extraFiles) {
      additional.push(extra);
      takenPaths.add(extra.path);
      totalBytes += extra.content.length;
    }
  } else if (languageId === "java") {
    const java = prepareJavaEntry(entryPath, entryFile.content);
    if (java) {
      diagnosticsEntryName = null;
      sourceCode = java.sourceCode;
      additional.push(java.extraFile);
      takenPaths.add(java.extraFile.path);
      totalBytes += java.extraFile.content.length;
    }
  }

  for (const file of files) {
    if (file.path === entryPath || !file.path.startsWith(prefix)) {
      continue;
    }
    const relativePath = file.path.slice(prefix.length);
    if (!relativePath || takenPaths.has(relativePath)) {
      continue;
    }
    if (additional.length >= MAX_ADDITIONAL_FILES || totalBytes + file.content.length > MAX_ADDITIONAL_BYTES) {
      break;
    }
    additional.push({ path: relativePath, content: file.content });
    takenPaths.add(relativePath);
    totalBytes += file.content.length;
  }

  return {
    sourceCode,
    additionalFilesBase64: additional.length > 0 ? createZipArchive(additional).toString("base64") : undefined,
    compilerOptions,
    rewriteDiagnostics: createDiagnosticsRewriter(binding.judge0SourceFileName, diagnosticsEntryName, renames),
  };
}
