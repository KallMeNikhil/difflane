import type { CreateExecutionRequest, ExecutionRecordSummary, ExecutionResultPayload, ExecutionStatus } from "@difflane/shared-types";
import { ApiRequestError } from "../lib/http/apiRequest";
import * as executionClient from "../lib/workspace/executionClient";

const ACTIVE_STATUSES: ExecutionStatus[] = ["queued", "running"];
const POLL_INTERVAL_MS = 800;
const POLL_DEADLINE_MS = 90_000;
const MAX_CONSECUTIVE_POLL_FAILURES = 4;
const ENTRY_SYNC_RETRY_DELAY_MS = 700;

export function isActiveStatus(status: ExecutionStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function runExecution(code: string, request: CreateExecutionRequest, guestId: string | null): Promise<ExecutionRecordSummary> {
  return executionClient.createExecution(code, request, guestId);
}

export function getExecution(code: string, executionId: string, guestId: string | null): Promise<ExecutionResultPayload> {
  return executionClient.fetchExecution(code, executionId, guestId);
}

export function stopExecution(code: string, executionId: string, guestId: string | null): Promise<void> {
  return executionClient.stopExecution(code, executionId, guestId);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function placeholderResult(summary: ExecutionRecordSummary): ExecutionResultPayload {
  return { ...summary, stdout: "", stderr: "", compileOutput: null, message: null, truncated: false, cpuTimeSeconds: null, memoryKb: null };
}

export interface ExecuteOptions {
  signal?: AbortSignal;
  onUpdate?: (result: ExecutionResultPayload) => void;
}

export async function executeAndWait(
  code: string,
  request: CreateExecutionRequest,
  guestId: string | null,
  options: ExecuteOptions = {},
): Promise<ExecutionResultPayload> {
  const { signal, onUpdate } = options;
  let summary: ExecutionRecordSummary;
  try {
    summary = await runExecution(code, request, guestId);
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 404 || signal?.aborted) {
      throw error;
    }
    await delay(ENTRY_SYNC_RETRY_DELAY_MS, signal);
    summary = await runExecution(code, request, guestId);
  }

  let latest = placeholderResult(summary);
  onUpdate?.(latest);
  const deadline = Date.now() + POLL_DEADLINE_MS;
  let failures = 0;

  while (isActiveStatus(latest.status)) {
    if (signal?.aborted) {
      await stopExecution(code, summary.executionId, guestId).catch(() => undefined);
      latest = await getExecution(code, summary.executionId, guestId).catch(() => ({
        ...latest,
        status: "stopped" as const,
        message: "Execution was stopped.",
      }));
      onUpdate?.(latest);
      return latest;
    }
    if (Date.now() > deadline) {
      latest = { ...latest, status: "failed", message: "Gave up waiting for the result. The execution service may be overloaded; please try again." };
      onUpdate?.(latest);
      return latest;
    }
    await delay(POLL_INTERVAL_MS, signal);
    if (signal?.aborted) {
      continue;
    }
    try {
      latest = await getExecution(code, summary.executionId, guestId);
      failures = 0;
      onUpdate?.(latest);
    } catch (error) {
      failures += 1;
      if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) {
        throw error;
      }
    }
  }
  return latest;
}
