import type { CreateExecutionRequest, ExecutionRecordSummary, ExecutionResultPayload } from "@difflane/shared-types";
import { apiRequest } from "../http/apiRequest";

function requestJson<T>(path: string, init: RequestInit | undefined, guestId: string | null, timeoutMs?: number): Promise<T> {
  return apiRequest<T>(path, init, { guestId, timeoutMs });
}

export function createExecution(code: string, request: CreateExecutionRequest, guestId: string | null): Promise<ExecutionRecordSummary> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/executions`, { method: "POST", body: JSON.stringify(request) }, guestId);
}

export function fetchExecution(code: string, executionId: string, guestId: string | null): Promise<ExecutionResultPayload> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/executions/${encodeURIComponent(executionId)}`, undefined, guestId);
}

export function stopExecution(code: string, executionId: string, guestId: string | null): Promise<void> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/executions/${encodeURIComponent(executionId)}/stop`, { method: "POST" }, guestId);
}

export function fetchRecentExecutions(code: string, guestId: string | null): Promise<{ executions: ExecutionRecordSummary[] }> {
  return requestJson(`/api/workspaces/${encodeURIComponent(code)}/executions`, undefined, guestId);
}
