import assert from "node:assert/strict";
import { test } from "node:test";
import { TerminalError, TERMINAL_SAFE_MESSAGES, toSafeTerminalMessage } from "../TerminalError.js";
import { AuthError } from "../../auth/AuthError.js";

test("intentional TerminalError messages pass through unchanged", () => {
  const error = new TerminalError(TERMINAL_SAFE_MESSAGES.authRequired);
  assert.equal(toSafeTerminalMessage(error), TERMINAL_SAFE_MESSAGES.authRequired);
});

test("intentional AuthError messages pass through unchanged", () => {
  const error = new AuthError("unknown_error", "You do not have permission to perform this action.", 403);
  assert.equal(toSafeTerminalMessage(error), "You do not have permission to perform this action.");
});

test("unexpected internal errors are replaced with a generic message", () => {
  const filesystemError = new Error("ENOENT: no such file or directory, open '/home/difflane/secret.env'");
  const sanitized = toSafeTerminalMessage(filesystemError);
  assert.equal(sanitized, TERMINAL_SAFE_MESSAGES.generic);
  assert.ok(!sanitized.includes("/home/difflane"));
});

test("a custom fallback can be provided for known failure categories", () => {
  const filesystemError = new Error("spawn docker ENOENT");
  const sanitized = toSafeTerminalMessage(filesystemError, TERMINAL_SAFE_MESSAGES.sandboxUnavailable);
  assert.equal(sanitized, TERMINAL_SAFE_MESSAGES.sandboxUnavailable);
});

test("non-Error thrown values never leak into the sanitized message", () => {
  const sanitized = toSafeTerminalMessage("raw string throw with /etc/passwd inside it");
  assert.equal(sanitized, TERMINAL_SAFE_MESSAGES.generic);
});
