import assert from "node:assert/strict";
import { test } from "node:test";
import { TerminalSandboxSession } from "../terminalSandbox.js";

test("destroy() is idempotent and only reports exit once", async () => {
  const session = new TerminalSandboxSession();
  let exitCount = 0;
  session.onExitEvent(() => {
    exitCount += 1;
  });

  await session.destroy("closed");
  await session.destroy("closed");
  await session.destroy("error");

  assert.equal(exitCount, 1, "onExit should fire exactly once regardless of repeated destroy() calls");
});

test("handleLine is a no-op after the session has been destroyed", async () => {
  const session = new TerminalSandboxSession();
  const received: string[] = [];
  session.onDataEvent((data) => received.push(data));

  await session.destroy("closed");
  await session.handleLine("pwd");

  assert.equal(received.length, 0, "no output should be emitted for a destroyed session");
});
