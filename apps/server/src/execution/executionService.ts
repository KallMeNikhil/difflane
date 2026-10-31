import { EXECUTION_LANGUAGES, EXECUTION_LIMITS, type ExecutionLanguageId, type ExecutionRecordSummary, type ExecutionResultPayload } from "@difflane/shared-types";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";
import type { Identity } from "../workspaces/workspaceService.js";
import { AuthError } from "../auth/AuthError.js";
import { env } from "../config/env.js";
import {
  captureExecutionSnapshot,
  ExecutionEntryFileNotFoundError,
  ExecutionSnapshotUnavailableError,
  type ExecutionSnapshot,
} from "./executionSnapshot.js";
import { isJudge0ExecutableLanguage, isPreviewLanguage } from "./languagePolicy.js";
import { getJudge0LanguageId, Judge0Error, pollExecution, submitExecution, type Judge0Result } from "./judge0Client.js";
import { hasAwaitingInputMarker, stripAwaitingInputMarker } from "./interactiveRuntime.js";
import { prepareJudge0Submission } from "./judge0Submission.js";
import { executionStore, toResultPayload, type ExecutionRecordInternal } from "./executionStore.js";

const JUDGE0_STATUS_TIME_LIMIT = 5;
const JUDGE0_STATUS_INTERNAL_ERROR = 13;
const JUDGE0_STATUS_EXEC_FORMAT_ERROR = 14;
export const SANDBOX_UNAVAILABLE_MESSAGE =
  "The execution sandbox is unavailable right now. This is an infrastructure issue, not a problem with your code. Please try again shortly.";

export interface RequesterInfo {
  identity: Identity;
  displayName: string;
}

function isSupportedLanguage(languageId: string): languageId is ExecutionLanguageId {
  return EXECUTION_LANGUAGES.some((entry) => entry.id === languageId);
}

class DailyExecutionQuota {
  private readonly usage = new Map<string, { day: string; count: number }>();

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  remaining(identityId: string, limit: number): number {
    const entry = this.usage.get(identityId);
    if (!entry || entry.day !== this.today()) {
      return limit;
    }
    return Math.max(0, limit - entry.count);
  }

  consume(identityId: string): void {
    const day = this.today();
    const entry = this.usage.get(identityId);
    if (!entry || entry.day !== day) {
      this.usage.set(identityId, { day, count: 1 });
      return;
    }
    entry.count += 1;
  }
}

export const dailyExecutionQuota = new DailyExecutionQuota();

function takeSnapshot(lifecycleManager: WorkspaceLifecycleManager, workspaceId: string, entryPath: string): ExecutionSnapshot {
  try {
    return captureExecutionSnapshot(lifecycleManager, workspaceId, entryPath);
  } catch (error) {
    if (error instanceof ExecutionSnapshotUnavailableError) {
      throw new AuthError("unknown_error", "This workspace isn't live on the server yet. Reload the workspace and try again.", 409);
    }
    if (error instanceof ExecutionEntryFileNotFoundError) {
      throw new AuthError("unknown_error", `"${entryPath}" no longer exists in this workspace.`, 404);
    }
    throw error;
  }
}

export async function createExecution(
  lifecycleManager: WorkspaceLifecycleManager,
  workspaceId: string,
  workspaceCode: string,
  languageId: string,
  entryPath: string,
  requester: RequesterInfo,
  stdin?: string,
  options: { interactive?: boolean; continuationOf?: string } = {},
): Promise<ExecutionRecordSummary> {
  if (!isSupportedLanguage(languageId)) {
    throw new AuthError("unknown_error", "Execution is not supported for this language.", 400);
  }
  if (isPreviewLanguage(languageId)) {
    throw new AuthError("unknown_error", "HTML/CSS use the preview surface, not code execution.", 400);
  }
  if (executionStore.countActiveForUser(requester.identity.id) >= env.execution.maxConcurrentPerUser) {
    throw new AuthError("rate_limited", "You already have programs running. Wait for them to finish.", 429);
  }
  if (executionStore.countActiveForWorkspace(workspaceId) >= env.execution.maxConcurrentPerWorkspace) {
    throw new AuthError("rate_limited", "This workspace has reached its concurrent execution limit.", 429);
  }
  const previous = options.continuationOf ? executionStore.get(options.continuationOf) : undefined;
  if (options.continuationOf) {
    if (
      !previous ||
      previous.requestedById !== requester.identity.id ||
      previous.workspaceId !== workspaceId ||
      previous.snapshotEntryPath !== entryPath ||
      previous.status !== "awaiting_input"
    ) {
      throw new AuthError("unknown_error", "This run has already finished. Press Run to start it again.", 409);
    }
    if (previous.interactiveStep + 1 > EXECUTION_LIMITS.maxInteractiveSteps) {
      throw new AuthError("rate_limited", `A run can take at most ${EXECUTION_LIMITS.maxInteractiveSteps} answers. Press Run to start again.`, 429);
    }
  } else if (dailyExecutionQuota.remaining(requester.identity.id, env.execution.dailyLimitPerUser) <= 0) {
    throw new AuthError("rate_limited", `You've used all ${env.execution.dailyLimitPerUser} code runs for today. The limit resets at midnight UTC.`, 429);
  }

  const snapshot = takeSnapshot(lifecycleManager, workspaceId, entryPath);
  if (!previous) {
    dailyExecutionQuota.consume(requester.identity.id);
  } else {
    executionStore.update(previous.executionId, { status: "stopped", message: null });
  }

  const record = executionStore.create({
    workspaceId,
    workspaceCode,
    snapshotEntryPath: entryPath,
    languageId,
    createdAt: new Date(),
    requestedByType: requester.identity.type,
    requestedById: requester.identity.id,
    requestedByDisplayName: requester.displayName,
    interactiveStep: previous ? previous.interactiveStep + 1 : 0,
  });

  void runExecution(record, snapshot, stdin, options.interactive === true);

  return toResultPayload(record);
}

function truncate(value: string): { text: string; truncated: boolean } {
  if (value.length <= EXECUTION_LIMITS.maxOutputBytes) {
    return { text: value, truncated: false };
  }
  return { text: value.slice(0, EXECUTION_LIMITS.maxOutputBytes), truncated: true };
}

export function describeJudge0Outcome(result: Judge0Result): string | null {
  if (result.statusId === JUDGE0_STATUS_INTERNAL_ERROR) {
    return SANDBOX_UNAVAILABLE_MESSAGE;
  }
  if (result.statusId === JUDGE0_STATUS_EXEC_FORMAT_ERROR) {
    return "The program could not be started (exec format error).";
  }
  if (result.statusId === JUDGE0_STATUS_TIME_LIMIT) {
    return `Time limit exceeded — programs may use up to ${EXECUTION_LIMITS.cpuTimeSeconds}s of CPU and ${EXECUTION_LIMITS.wallTimeSeconds}s in total.`;
  }
  if (result.statusId >= 7 && result.statusId <= 12) {
    const detail = result.message.trim();
    return detail ? `${result.statusDescription}: ${detail}` : result.statusDescription;
  }
  return null;
}

async function runExecution(
  record: ExecutionRecordInternal,
  snapshot: ExecutionSnapshot,
  stdin: string | undefined,
  interactive: boolean,
): Promise<void> {
  executionStore.update(record.executionId, { status: "running", startedAt: new Date() });

  if (!isJudge0ExecutableLanguage(record.languageId)) {
    executionStore.update(record.executionId, { status: "unsupported", completedAt: new Date() });
    return;
  }

  try {
    const prepared = prepareJudge0Submission(record.languageId, snapshot.entryPath, snapshot.files, { interactive });
    const judge0LanguageId = await getJudge0LanguageId(record.languageId);
    const token = await submitExecution({
      languageId: judge0LanguageId,
      sourceCode: prepared.sourceCode,
      stdin,
      additionalFilesBase64: prepared.additionalFilesBase64,
      compilerOptions: prepared.compilerOptions,
    });
    const result = await pollExecution(token, record.abortController.signal);
    if (record.abortController.signal.aborted) {
      return;
    }

    const awaitingInput = interactive && hasAwaitingInputMarker(result.stderr);
    const rawStderr = interactive ? stripAwaitingInputMarker(result.stderr) : result.stderr;
    const stdout = truncate(result.stdout);
    const stderr = truncate(prepared.rewriteDiagnostics(rawStderr));
    const compileOutput = truncate(prepared.rewriteDiagnostics(result.compileOutput));
    executionStore.update(record.executionId, {
      status: awaitingInput ? "awaiting_input" : mapJudge0Status(result.statusId),
      exitCode: awaitingInput ? null : result.exitCode,
      stdout: stdout.text,
      stderr: stderr.text,
      compileOutput: compileOutput.text || null,
      message: awaitingInput ? null : describeJudge0Outcome(result),
      truncated: stdout.truncated || stderr.truncated || compileOutput.truncated,
      cpuTimeSeconds: result.time,
      memoryKb: result.memory,
      completedAt: new Date(),
    });
  } catch (error) {
    const wasStopped = record.abortController.signal.aborted;
    if (!(error instanceof Judge0Error)) {
      console.error("Code execution failed unexpectedly", error);
    }
    executionStore.update(record.executionId, {
      status: wasStopped ? "stopped" : "failed",
      message: wasStopped ? "Execution was stopped." : error instanceof Judge0Error ? error.message : "Execution failed unexpectedly.",
      completedAt: new Date(),
    });
  }
}

export function mapJudge0Status(statusId: number): ExecutionRecordInternal["status"] {
  if (statusId === 3) return "success";
  if (statusId === 4) return "failed";
  if (statusId === 5) return "timeout";
  if (statusId === 6) return "compilation_failed";
  if (statusId >= 7 && statusId <= 12) return "runtime_error";
  return "failed";
}

export function stopExecution(executionId: string, requester: RequesterInfo): void {
  const record = executionStore.get(executionId);
  if (!record) {
    throw new AuthError("unknown_error", "Execution not found.", 404);
  }
  if (record.requestedById !== requester.identity.id) {
    throw new AuthError("unknown_error", "You can only stop your own executions.", 403);
  }
  record.abortController.abort();
  if (record.status === "queued" || record.status === "running") {
    executionStore.update(executionId, { status: "stopped", message: "Execution was stopped.", completedAt: new Date() });
  }
}

export function getExecutionResult(executionId: string, requester: RequesterInfo): ExecutionResultPayload {
  const record = executionStore.get(executionId);
  if (!record) {
    throw new AuthError("unknown_error", "Execution not found.", 404);
  }
  if (record.requestedById !== requester.identity.id) {
    throw new AuthError("unknown_error", "You can only view your own executions.", 403);
  }
  return toResultPayload(record);
}

export function listRecentExecutions(workspaceId: string, requester: RequesterInfo): ExecutionRecordSummary[] {
  return executionStore.listForWorkspaceAndUser(workspaceId, requester.identity.id);
}
