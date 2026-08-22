import { randomUUID } from "node:crypto";
import type { ExecutionLanguageId, ExecutionRecordSummary, ExecutionResultPayload, ExecutionStatus } from "@difflane/shared-types";

export interface ExecutionRecordInternal {
  executionId: string;
  workspaceId: string;
  workspaceCode: string;
  snapshotEntryPath: string;
  languageId: ExecutionLanguageId;
  status: ExecutionStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compileOutput: string | null;
  truncated: boolean;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  requestedByType: "user" | "guest";
  requestedById: string;
  requestedByDisplayName: string;
  abortController: AbortController;
}

const MAX_RETAINED_PER_WORKSPACE = 20;

export class ExecutionStore {
  private readonly records = new Map<string, ExecutionRecordInternal>();
  private readonly byWorkspace = new Map<string, string[]>();

  create(input: Omit<ExecutionRecordInternal, "executionId" | "status" | "exitCode" | "stdout" | "stderr" | "compileOutput" | "truncated" | "startedAt" | "completedAt" | "abortController">): ExecutionRecordInternal {
    const record: ExecutionRecordInternal = {
      ...input,
      executionId: randomUUID(),
      status: "queued",
      exitCode: null,
      stdout: "",
      stderr: "",
      compileOutput: null,
      truncated: false,
      startedAt: null,
      completedAt: null,
      abortController: new AbortController(),
    };
    this.records.set(record.executionId, record);
    const forWorkspace = this.byWorkspace.get(record.workspaceId) ?? [];
    forWorkspace.push(record.executionId);
    while (forWorkspace.length > MAX_RETAINED_PER_WORKSPACE) {
      const evictableIndex = forWorkspace.findIndex((id) => {
        const candidate = this.records.get(id);
        return candidate && candidate.status !== "queued" && candidate.status !== "running";
      });
      if (evictableIndex === -1) {
        break;
      }
      const [evicted] = forWorkspace.splice(evictableIndex, 1);
      if (evicted) {
        this.records.delete(evicted);
      }
    }
    this.byWorkspace.set(record.workspaceId, forWorkspace);
    return record;
  }

  get(executionId: string): ExecutionRecordInternal | undefined {
    return this.records.get(executionId);
  }

  update(executionId: string, patch: Partial<ExecutionRecordInternal>): void {
    const existing = this.records.get(executionId);
    if (!existing) {
      return;
    }
    Object.assign(existing, patch);
  }

  countActiveForUser(requestedById: string): number {
    let count = 0;
    for (const record of this.records.values()) {
      if (record.requestedById === requestedById && (record.status === "queued" || record.status === "running")) {
        count += 1;
      }
    }
    return count;
  }

  countActiveForWorkspace(workspaceId: string): number {
    let count = 0;
    for (const record of this.records.values()) {
      if (record.workspaceId === workspaceId && (record.status === "queued" || record.status === "running")) {
        count += 1;
      }
    }
    return count;
  }

  listForWorkspaceAndUser(workspaceId: string, requestedById: string): ExecutionRecordSummary[] {
    const ids = this.byWorkspace.get(workspaceId) ?? [];
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is ExecutionRecordInternal => Boolean(record) && record!.requestedById === requestedById)
      .map(toSummary);
  }
}

function toSummary(record: ExecutionRecordInternal): ExecutionRecordSummary {
  return {
    executionId: record.executionId,
    workspaceCode: record.workspaceCode,
    snapshotId: record.executionId,
    languageId: record.languageId,
    entryPath: record.snapshotEntryPath,
    status: record.status,
    exitCode: record.exitCode,
    createdAt: record.createdAt.toISOString(),
    startedAt: record.startedAt ? record.startedAt.toISOString() : null,
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    durationMs: record.startedAt && record.completedAt ? record.completedAt.getTime() - record.startedAt.getTime() : null,
    requestedBy: { identityType: record.requestedByType, displayName: record.requestedByDisplayName },
  };
}

export function toResultPayload(record: ExecutionRecordInternal): ExecutionResultPayload {
  return {
    ...toSummary(record),
    stdout: record.stdout,
    stderr: record.stderr,
    compileOutput: record.compileOutput,
    truncated: record.truncated,
  };
}

export const executionStore = new ExecutionStore();
