import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExecutionResultPayload } from "@difflane/shared-types";
import {
  buildTranscript,
  runInteractiveSession,
  type InputAnswer,
  type InteractiveExecuteRequest,
  type InteractiveSnapshot,
} from "../interactiveSession";

function result(status: ExecutionResultPayload["status"], stdout: string, executionId: string): ExecutionResultPayload {
  return {
    executionId, workspaceCode: "ABC", snapshotId: executionId, languageId: "java", entryPath: "test.java", status,
    exitCode: status === "success" ? 0 : null, createdAt: "", startedAt: null, completedAt: null, durationMs: null, requestedBy: null,
    stdout, stderr: "", compileOutput: null, message: null, truncated: false, cpuTimeSeconds: null, memoryKb: null,
  };
}

function studentProgram(requests: InteractiveExecuteRequest[]) {
  return async (request: InteractiveExecuteRequest) => {
    requests.push(request);
    const lines = request.stdin.split("\n").filter(Boolean);
    let stdout = "Enter number of students: ";
    const tokens = lines.join(" ").split(/\s+/).filter(Boolean);
    const count = tokens.length > 0 ? Number(tokens[0]) : null;
    let consumed = 1;
    let needsMore = count === null;
    for (let student = 1; count !== null && student <= count; student += 1) {
      stdout += `Student ${student}\nEnter name: `;
      if (tokens.length <= consumed) { needsMore = true; break; }
      consumed += 1;
      stdout += "Enter marks: ";
      if (tokens.length <= consumed) { needsMore = true; break; }
      consumed += 1;
    }
    if (!needsMore) stdout += "Done\n";
    const awaiting = request.interactive && needsMore;
    return result(awaiting ? "awaiting_input" : "success", stdout, `run-${requests.length}`);
  };
}

test("answers are echoed where the program asked for them", () => {
  const transcript = buildTranscript("Name: Age: Hi\n", [
    { cut: 6, text: "Nikhil" },
    { cut: 11, text: "21" },
  ]);
  assert.deepEqual(transcript, [
    { kind: "output", text: "Name: " },
    { kind: "input", text: "Nikhil\n" },
    { kind: "output", text: "Age: " },
    { kind: "input", text: "21\n" },
    { kind: "output", text: "Hi\n" },
  ]);
});

test("each answer re-runs the program with every answer so far and continues the same run", async () => {
  const requests: InteractiveExecuteRequest[] = [];
  const answers: InputAnswer[] = [
    { kind: "line", text: "2" },
    { kind: "line", text: "Nikhil 95" },
    { kind: "line", text: "Rahul" },
    { kind: "line", text: "82" },
  ];
  const final = await runInteractiveSession({
    signal: new AbortController().signal,
    execute: studentProgram(requests),
    readInput: async () => answers.shift()!,
  });

  assert.equal(final.phase, "finished");
  assert.equal(final.result?.status, "success");
  assert.deepEqual(
    requests.map((request) => request.continuationOf),
    [undefined, "run-1", "run-2", "run-3", "run-4"],
  );
  const text = final.transcript.map((segment) => segment.text).join("");
  assert.equal(
    text,
    "Enter number of students: 2\nStudent 1\nEnter name: Nikhil 95\nEnter marks: Student 2\nEnter name: Rahul\nEnter marks: 82\nDone\n",
  );
});

test("a pasted block answers several prompts at once", async () => {
  const requests: InteractiveExecuteRequest[] = [];
  const answers: InputAnswer[] = [{ kind: "line", text: "1\nAman 67" }];
  const final = await runInteractiveSession({
    signal: new AbortController().signal,
    execute: studentProgram(requests),
    readInput: async () => answers.shift()!,
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].stdin, "1\nAman 67\n");
  assert.match(final.transcript.map((segment) => segment.text).join(""), /Done/);
});

test("Ctrl+D re-runs without the input hook; cancelling stops the run", async () => {
  const requests: InteractiveExecuteRequest[] = [];
  const eof = await runInteractiveSession({
    signal: new AbortController().signal,
    execute: studentProgram(requests),
    readInput: async () => ({ kind: "eof" }),
  });
  assert.equal(requests.at(-1)?.interactive, false);
  assert.equal(eof.phase, "finished");

  const updates: InteractiveSnapshot["phase"][] = [];
  const cancelled = await runInteractiveSession({
    signal: new AbortController().signal,
    execute: studentProgram([]),
    readInput: async () => ({ kind: "cancel" }),
    onUpdate: (snapshot) => updates.push(snapshot.phase),
  });
  assert.equal(cancelled.result?.status, "stopped");
  assert.deepEqual(updates, ["running", "awaiting_input", "finished"]);
});
