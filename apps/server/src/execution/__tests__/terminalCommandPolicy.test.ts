import assert from "node:assert/strict";
import { test } from "node:test";
import { isExecutableAllowed, validateTerminalCommand } from "../terminalCommandPolicy.js";

test("basic file/navigation commands are allowed", () => {
  for (const cmd of ["pwd", "ls", "cat file.txt", "mkdir scratch", "grep -r foo ."]) {
    const result = validateTerminalCommand(cmd);
    assert.equal(result.allowed, true, `${cmd} should be allowed`);
  }
});

test("compilers, interpreters, and package managers are not permitted", () => {
  for (const executable of ["gcc", "g++", "javac", "java", "python", "python3", "node", "npm"]) {
    assert.equal(isExecutableAllowed(executable), false, `${executable} must not be in the allowlist`);
    const result = validateTerminalCommand(`${executable} --version`);
    assert.equal(result.allowed, false);
  }
});

test("shell metacharacters and path traversal are rejected", () => {
  const dangerous = ["cat ../../etc/passwd", "echo hi && rm -rf /", "ls | grep secret", "echo `whoami`", "cat /etc/passwd"];
  for (const cmd of dangerous) {
    const result = validateTerminalCommand(cmd);
    assert.equal(result.allowed, false, `${cmd} should be rejected`);
  }
});

test("empty input is treated as a no-op prompt redraw", () => {
  const result = validateTerminalCommand("   ");
  assert.equal(result.allowed, true);
});
