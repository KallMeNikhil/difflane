import type { CreateExecutionRequest, ExecutionRecordSummary, ExecutionResultPayload } from "@difflane/shared-types";
import { resolveServerUrl } from "../socket/socketClient";
import { getAccessToken } from "../auth/tokenStore";

export class ExecutionRequestError extends Error {}

function guestHeaders(guestId: string | null): Record<string, string> {
  return guestId ? { "x-guest-id": guestId } : {};
}

async function requestJson<T>(path: string, init?: RequestInit, guestId: string | null = null): Promise<T> {
  const baseUrl = resolveServerUrl() ?? "";
  const accessToken = getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...guestHeaders(guestId),
      ...init?.headers,
    },
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const body = await response.json().catch(() => ({ message: "Unexpected server response." }));
  if (!response.ok) {
    throw new ExecutionRequestError(body?.message ?? "Execution request failed.");
  }
  return body as T;
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
