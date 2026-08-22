import assert from "node:assert/strict";
import { test } from "node:test";
import { splitOnCommandMarker } from "../terminalSandbox.js";

const MARKER = "__DIFFLANE_CMD_DONE_test-session__";

test("returns not found when the marker has not arrived yet", () => {
  const result = splitOnCommandMarker("partial output so far", MARKER);
  assert.equal(result.found, false);
  assert.equal(result.remainder, "partial output so far");
});

test("splits command output from the marker line when it arrives in one chunk", () => {
  const buffer = `hello\n${MARKER}\n`;
  const result = splitOnCommandMarker(buffer, MARKER);
  assert.equal(result.found, true);
  assert.equal(result.before, "hello\n");
  assert.equal(result.remainder, "");
});

test("preserves output that arrives after the marker as remainder for the next command", () => {
  const buffer = `hello\n${MARKER}\nnext-command-output`;
  const result = splitOnCommandMarker(buffer, MARKER);
  assert.equal(result.found, true);
  assert.equal(result.before, "hello\n");
  assert.equal(result.remainder, "next-command-output");
});

test("handles a marker with no trailing newline yet by treating remainder as empty", () => {
  const buffer = `hello\n${MARKER}`;
  const result = splitOnCommandMarker(buffer, MARKER);
  assert.equal(result.found, true);
  assert.equal(result.before, "hello\n");
  assert.equal(result.remainder, "");
});

test("multi-line command output is preserved verbatim before the marker", () => {
  const buffer = `one\ntwo\nthree\n${MARKER}\n`;
  const result = splitOnCommandMarker(buffer, MARKER);
  assert.equal(result.found, true);
  assert.equal(result.before, "one\ntwo\nthree\n");
});
