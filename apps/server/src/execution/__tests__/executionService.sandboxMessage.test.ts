import assert from "node:assert/strict";
import { test } from "node:test";
import { SANDBOX_UNAVAILABLE_MESSAGE, mapJudge0Status } from "../executionService.js";

test("sandbox unavailable message does not leak raw Judge0 sandbox internals", () => {
  assert.ok(SANDBOX_UNAVAILABLE_MESSAGE.length > 0);
  assert.equal(SANDBOX_UNAVAILABLE_MESSAGE.includes("/box"), false);
  assert.equal(SANDBOX_UNAVAILABLE_MESSAGE.includes("cgroup"), false);
  assert.equal(SANDBOX_UNAVAILABLE_MESSAGE.includes("isolate"), false);
});

test("internal error status (13) still maps to failed", () => {
  assert.equal(mapJudge0Status(13), "failed");
});
