import { EXECUTION_LANGUAGES, EXECUTION_LIMITS, type ExecutionLanguageId, type ExecutionRecordSummary, type ExecutionResultPayload } from "@difflane/shared-types";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";
import type { Identity } from "../workspaces/workspaceService.js";
import { AuthError } from "../auth/AuthError.js";
import { captureExecutionSnapshot } from "./executionSnapshot.js";
import { isJudge0ExecutableLanguage, isPreviewLanguage, JUDGE0_LANGUAGE_BINDINGS } from "./languagePolicy.js";
import { Judge0Error, pollExecution, submitExecution } from "./judge0Client.js";
import { executionStore, toResultPayload, type ExecutionRecordInternal } from "./executionStore.js";

export interface RequesterInfo {
  identity: Identity;
  displayName: string;
}

function isSupportedLanguage(languageId: string): languageId is ExecutionLanguageId {
  return EXECUTION_LANGUAGES.some((entry) => entry.id === languageId);
}

export async function createExecution(
  lifecycleManager: WorkspaceLifecycleManager,
  workspaceId: string,
  workspaceCode: string,
  languageId: string,
  entryPath: string,
  requester: RequesterInfo,
  stdin?: string,
): Promise<ExecutionRecordSummary> {
  if (!isSupportedLanguage(languageId)) {
    throw new AuthError("unknown_error", "Execution is not supported for this language.", 400);
  }
  if (isPreviewLanguage(languageId)) {
    throw new AuthError("unknown_error", "HTML/CSS use the preview surface, not code execution.", 400);
  }
  if (executionStore.countActiveForUser(requester.identity.id) >= EXECUTION_LIMITS.maxConcurrentPerUser) {
    throw new AuthError("rate_limited", "You already have executions running. Wait for them to finish.", 429);
  }
  if (executionStore.countActiveForWorkspace(workspaceId) >= EXECUTION_LIMITS.maxConcurrentPerWorkspace) {
    throw new AuthError("rate_limited", "This workspace has reached its concurrent execution limit.", 429);
  }

  const snapshot = captureExecutionSnapshot(lifecycleManager, workspaceId, entryPath);

  const record = executionStore.create({
    workspaceId,
    workspaceCode,
    snapshotEntryPath: entryPath,
    languageId,
    createdAt: new Date(),
    requestedByType: requester.identity.type,
    requestedById: requester.identity.id,
    requestedByDisplayName: requester.displayName,
  });

  void runExecution(record, snapshot, stdin);

  return toResultPayload(record);
}

async function runExecution(
  record: ExecutionRecordInternal,
  snapshot: { entryPath: string; files: { path: string; content: string }[] },
  stdin: string | undefined,
): Promise<void> {
  executionStore.update(record.executionId, { status: "running", startedAt: new Date() });

  if (!isJudge0ExecutableLanguage(record.languageId)) {
    executionStore.update(record.executionId, { status: "unsupported", completedAt: new Date() });
    return;
  }

  const binding = JUDGE0_LANGUAGE_BINDINGS[record.languageId];
  const entryFile = snapshot.files.find((file) => file.path === snapshot.entryPath);
  if (!entryFile) {
    executionStore.update(record.executionId, { status: "failed", completedAt: new Date(), stderr: "Entry file not found." });
    return;
  }

  try {
    const token = await submitExecution({
      languageId: binding.judge0LanguageId,
      sourceCode: entryFile.content,
      stdin,
    });
    const result = await pollExecution(token, record.abortController.signal);

    const status = mapJudge0Status(result.statusId);
    executionStore.update(record.executionId, {
      status,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput || null,
      truncated: result.stdout.length >= EXECUTION_LIMITS.maxOutputBytes || result.stderr.length >= EXECUTION_LIMITS.maxOutputBytes,
      completedAt: new Date(),
    });
  } catch (error) {
    const message = error instanceof Judge0Error ? error.message : "Execution failed unexpectedly.";
    const wasStopped = record.abortController.signal.aborted;
    executionStore.update(record.executionId, {
      status: wasStopped ? "stopped" : "failed",
      stderr: message,
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
  if (statusId === 13) return "failed";
  if (statusId === 14) return "failed";
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
    executionStore.update(executionId, { status: "stopped", completedAt: new Date() });
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
