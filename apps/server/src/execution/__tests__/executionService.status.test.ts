import assert from "node:assert/strict";
import { test } from "node:test";
import { mapJudge0Status } from "../executionService.js";

test("success status maps to success", () => {
  assert.equal(mapJudge0Status(3), "success");
});

test("compilation error maps to compilation_failed", () => {
  assert.equal(mapJudge0Status(6), "compilation_failed");
});

test("time limit exceeded maps to timeout, not resource_limit", () => {
  assert.equal(mapJudge0Status(5), "timeout");
});

test("runtime error statuses (7-12) map to runtime_error", () => {
  for (let statusId = 7; statusId <= 12; statusId += 1) {
    assert.equal(mapJudge0Status(statusId), "runtime_error", `status ${statusId} should be runtime_error`);
  }
});

test("runtime error statuses never map to resource_limit", () => {
  for (let statusId = 7; statusId <= 12; statusId += 1) {
    assert.notEqual(mapJudge0Status(statusId), "resource_limit");
  }
});

test("internal error and exec format error map to failed", () => {
  assert.equal(mapJudge0Status(13), "failed");
  assert.equal(mapJudge0Status(14), "failed");
});
