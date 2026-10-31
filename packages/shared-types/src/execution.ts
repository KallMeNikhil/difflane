export type ExecutionLanguageId = "c" | "cpp" | "java" | "python" | "javascript" | "typescript" | "html" | "css";

export type ExecutionKind = "compiled" | "interpreted" | "preview";

export interface ExecutionLanguageDescriptor {
  id: ExecutionLanguageId;
  displayName: string;
  kind: ExecutionKind;
  monacoLanguageIds: string[];
  defaultEntryFileNames: string[];
}

export const EXECUTION_LANGUAGES: ExecutionLanguageDescriptor[] = [
  { id: "c", displayName: "C", kind: "compiled", monacoLanguageIds: ["c"], defaultEntryFileNames: ["main.c"] },
  { id: "cpp", displayName: "C++", kind: "compiled", monacoLanguageIds: ["cpp"], defaultEntryFileNames: ["main.cpp"] },
  { id: "java", displayName: "Java", kind: "compiled", monacoLanguageIds: ["java"], defaultEntryFileNames: ["Main.java"] },
  { id: "python", displayName: "Python", kind: "interpreted", monacoLanguageIds: ["python"], defaultEntryFileNames: ["main.py"] },
  { id: "javascript", displayName: "JavaScript", kind: "interpreted", monacoLanguageIds: ["javascript"], defaultEntryFileNames: ["main.js"] },
  { id: "typescript", displayName: "TypeScript", kind: "interpreted", monacoLanguageIds: ["typescript"], defaultEntryFileNames: ["main.ts"] },
  { id: "html", displayName: "HTML Preview", kind: "preview", monacoLanguageIds: ["html"], defaultEntryFileNames: ["index.html"] },
  { id: "css", displayName: "CSS Preview", kind: "preview", monacoLanguageIds: ["css"], defaultEntryFileNames: ["index.html", "style.css"] },
];

export function findExecutionLanguageForMonacoId(monacoLanguageId: string): ExecutionLanguageDescriptor | undefined {
  return EXECUTION_LANGUAGES.find((entry) => entry.monacoLanguageIds.includes(monacoLanguageId));
}

export type ExecutionStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "stopped"
  | "timeout"
  | "resource_limit"
  | "compilation_failed"
  | "runtime_error"
  | "unsupported"
  | "awaiting_input";

export interface ExecutionFileSnapshotEntry {
  path: string;
  content: string;
}

export interface CreateExecutionRequest {
  entryPath: string;
  languageId: ExecutionLanguageId;
  stdin?: string;
  interactive?: boolean;
  continuationOf?: string;
}

export interface ExecutionRecordSummary {
  executionId: string;
  workspaceCode: string;
  snapshotId: string;
  languageId: ExecutionLanguageId;
  entryPath: string;
  status: ExecutionStatus;
  exitCode: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  requestedBy: { identityType: "user" | "guest"; displayName: string } | null;
}

export interface ExecutionResultPayload extends ExecutionRecordSummary {
  stdout: string;
  stderr: string;
  compileOutput: string | null;
  message: string | null;
  truncated: boolean;
  cpuTimeSeconds: number | null;
  memoryKb: number | null;
}

export const EXECUTION_LIMITS = {
  cpuTimeSeconds: 5,
  wallTimeSeconds: 10,
  memoryKb: 256_000,
  maxOutputBytes: 64_000,
  maxStdinBytes: 8_000,
  maxInteractiveSteps: 100,
} as const;
