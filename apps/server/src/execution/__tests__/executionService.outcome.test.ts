import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyExecutionQuota, describeJudge0Outcome, SANDBOX_UNAVAILABLE_MESSAGE } from "../executionService.js";
import type { Judge0Result } from "../judge0Client.js";

function result(statusId: number, statusDescription: string, message = ""): Judge0Result {
  return { statusId, statusDescription, stdout: "", stderr: "", compileOutput: "", message, exitCode: null, time: null, memory: null };
}

test("an accepted run carries no extra message", () => {
  assert.equal(describeJudge0Outcome(result(3, "Accepted")), null);
});

test("runtime errors explain the signal or exit reason", () => {
  assert.equal(describeJudge0Outcome(result(11, "Runtime Error (NZEC)", "Exited with error status 1")), "Runtime Error (NZEC): Exited with error status 1");
});

test("time limit explains the limits", () => {
  assert.match(describeJudge0Outcome(result(5, "Time Limit Exceeded"))!, /5s of CPU/);
});

test("sandbox internal errors are reported as infrastructure problems", () => {
  assert.equal(describeJudge0Outcome(result(13, "Internal Error")), SANDBOX_UNAVAILABLE_MESSAGE);
});

test("daily quota counts down per identity and is independent between identities", () => {
  assert.equal(dailyExecutionQuota.remaining("quota-a", 2), 2);
  dailyExecutionQuota.consume("quota-a");
  dailyExecutionQuota.consume("quota-a");
  assert.equal(dailyExecutionQuota.remaining("quota-a", 2), 0);
  assert.equal(dailyExecutionQuota.remaining("quota-b", 2), 2);
});
