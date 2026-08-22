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
  | "unsupported";

export interface ExecutionFileSnapshotEntry {
  path: string;
  content: string;
}

export interface CreateExecutionRequest {
  entryPath: string;
  languageId: ExecutionLanguageId;
  stdin?: string;
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
  truncated: boolean;
}

export const EXECUTION_LIMITS = {
  cpuTimeSeconds: 5,
  wallTimeSeconds: 10,
  memoryKb: 256_000,
  maxProcesses: 32,
  maxOutputBytes: 64_000,
  maxConcurrentPerUser: 2,
  maxConcurrentPerWorkspace: 4,
} as const;

export type TerminalSessionStatus = "connecting" | "ready" | "closed" | "error";

export interface TerminalCreatePayload {
  workspaceCode: string;
  accessToken?: string;
  guestId?: string;
  cols: number;
  rows: number;
}

export interface TerminalReadyPayload {
  sessionId: string;
}

export interface TerminalDataPayload {
  sessionId: string;
  data: string;
}

export interface TerminalResizePayload {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface TerminalExitPayload {
  sessionId: string;
  exitCode: number | null;
  reason: "exit" | "timeout" | "idle" | "closed" | "error";
}

export interface TerminalErrorPayload {
  sessionId: string | null;
  message: string;
}

export const TERMINAL_SOCKET_EVENTS = {
  CREATE: "terminal:create",
  READY: "terminal:ready",
  INPUT: "terminal:input",
  DATA: "terminal:data",
  RESIZE: "terminal:resize",
  CLOSE: "terminal:close",
  EXIT: "terminal:exit",
  ERROR: "terminal:error",
} as const;

export type TerminalSocketEventName = (typeof TERMINAL_SOCKET_EVENTS)[keyof typeof TERMINAL_SOCKET_EVENTS];

export const TERMINAL_LIMITS = {
  idleTimeoutMs: 5 * 60 * 1000,
  maxSessionLifetimeMs: 30 * 60 * 1000,
  maxSessionsPerConnection: 3,
} as const;
