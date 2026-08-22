import assert from "node:assert/strict";
import { test } from "node:test";
import { ExecutionStore } from "../executionStore.js";

function baseInput(workspaceId: string) {
  return {
    workspaceId,
    workspaceCode: "TEST01",
    snapshotEntryPath: "main.py",
    languageId: "python" as const,
    createdAt: new Date(),
    requestedByType: "user" as const,
    requestedById: "user-1",
    requestedByDisplayName: "Tester",
  };
}

test("active queued/running records survive eviction under load", () => {
  const store = new ExecutionStore();
  const workspaceId = "workspace-a";

  const activeRecord = store.create(baseInput(workspaceId));
  store.update(activeRecord.executionId, { status: "running" });

  for (let i = 0; i < 25; i += 1) {
    const record = store.create(baseInput(workspaceId));
    store.update(record.executionId, { status: "success", completedAt: new Date() });
  }

  const stillPresent = store.get(activeRecord.executionId);
  assert.ok(stillPresent, "an active running execution must not be evicted");
  assert.equal(stillPresent?.status, "running");
});

test("queued records survive eviction as well", () => {
  const store = new ExecutionStore();
  const workspaceId = "workspace-b";

  const queuedRecord = store.create(baseInput(workspaceId));

  for (let i = 0; i < 25; i += 1) {
    const record = store.create(baseInput(workspaceId));
    store.update(record.executionId, { status: "failed", completedAt: new Date() });
  }

  const stillPresent = store.get(queuedRecord.executionId);
  assert.ok(stillPresent, "a queued execution must not be evicted");
});

test("completed records are still evicted once retention is exceeded", () => {
  const store = new ExecutionStore();
  const workspaceId = "workspace-c";

  let firstCompletedId = "";
  for (let i = 0; i < 25; i += 1) {
    const record = store.create(baseInput(workspaceId));
    store.update(record.executionId, { status: "success", completedAt: new Date() });
    if (i === 0) {
      firstCompletedId = record.executionId;
    }
  }

  assert.equal(store.get(firstCompletedId), undefined, "oldest completed record should eventually be evicted");
});
