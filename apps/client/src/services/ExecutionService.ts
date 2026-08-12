import type { CreateExecutionRequest, ExecutionRecordSummary, ExecutionResultPayload } from "@difflane/shared-types";
import * as executionClient from "../lib/workspace/executionClient";

export function runExecution(code: string, request: CreateExecutionRequest, guestId: string | null): Promise<ExecutionRecordSummary> {
  return executionClient.createExecution(code, request, guestId);
}

export function getExecution(code: string, executionId: string, guestId: string | null): Promise<ExecutionResultPayload> {
  return executionClient.fetchExecution(code, executionId, guestId);
}

export function stopExecution(code: string, executionId: string, guestId: string | null): Promise<void> {
  return executionClient.stopExecution(code, executionId, guestId);
}
