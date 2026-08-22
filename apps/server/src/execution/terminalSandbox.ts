import { randomUUID } from "node:crypto";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { TERMINAL_LIMITS } from "@difflane/shared-types";
import { env } from "../config/env.js";
import { validateTerminalCommand } from "./terminalCommandPolicy.js";
import { createSandboxContainer, destroySandboxContainer, spawnInteractiveShell } from "./terminalContainerRuntime.js";

const MAX_OUTPUT_BYTES = 64_000;
const COMMAND_TIMEOUT_MS = 10_000;
const SHELL_CLOSE_GRACE_MS = 2_000;

export type TerminalSandboxEventHandler = (data: string) => void;
export type TerminalSandboxExitHandler = (
  exitCode: number | null,
  reason: "exit" | "timeout" | "idle" | "closed" | "error",
) => void;

export interface MarkerSplitResult {
  found: boolean;
  before: string;
  remainder: string;
}

export function splitOnCommandMarker(buffer: string, marker: string): MarkerSplitResult {
  const markerIndex = buffer.indexOf(marker);
  if (markerIndex === -1) {
    return { found: false, before: "", remainder: buffer };
  }
  const before = buffer.slice(0, markerIndex);
  const afterMarkerLineEnd = buffer.indexOf("\n", markerIndex);
  const remainder = afterMarkerLineEnd === -1 ? "" : buffer.slice(afterMarkerLineEnd + 1);
  return { found: true, before, remainder };
}

export class TerminalSandboxSession {
  readonly sessionId: string = randomUUID();
  private readonly containerName: string;
  private readonly marker: string;
  private shellProcess: ChildProcessWithoutNullStreams | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private lifetimeTimer: NodeJS.Timeout | null = null;
  private destroyed = false;
  private containerReady = false;
  private commandInFlight = false;
  private stdoutBuffer = "";
  private pendingResolve: (() => void) | null = null;
  private outputByteCount = 0;
  private outputTruncated = false;

  private onData: TerminalSandboxEventHandler = () => undefined;
  private onExit: TerminalSandboxExitHandler = () => undefined;

  constructor() {
    this.containerName = `difflane-term-${this.sessionId}`;
    this.marker = `__DIFFLANE_CMD_DONE_${this.sessionId}__`;
  }

  onDataEvent(handler: TerminalSandboxEventHandler): void {
    this.onData = handler;
  }

  onExitEvent(handler: TerminalSandboxExitHandler): void {
    this.onExit = handler;
  }

  async start(): Promise<void> {
    await createSandboxContainer(this.containerName);
    this.containerReady = true;

    const shell = spawnInteractiveShell(this.containerName, env.terminal.containerWorkdir);
    this.shellProcess = shell;
    this.wireShellStreams(shell);

    this.write(`Difflane sandboxed shell. Allowlisted commands only. Type "clear" to reset.\r\n$ `);
    this.armIdleTimer();
    this.lifetimeTimer = setTimeout(() => {
      void this.destroy("timeout");
    }, TERMINAL_LIMITS.maxSessionLifetimeMs);
  }

  private wireShellStreams(shell: ChildProcessWithoutNullStreams): void {
    shell.stdout.on("data", (chunk: Buffer) => {
      this.handleShellStdout(chunk.toString("utf-8"));
    });
    shell.stderr.on("data", (chunk: Buffer) => {
      this.emitOutput(chunk.toString("utf-8"));
    });
    shell.on("error", () => {
      void this.destroy("error");
    });
    shell.on("close", () => {
      if (!this.destroyed) {
        void this.destroy("exit");
      }
    });
  }

  private armIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      void this.destroy("idle");
    }, TERMINAL_LIMITS.idleTimeoutMs);
  }

  private write(data: string): void {
    if (!this.destroyed) {
      this.onData(data);
    }
  }

  private emitOutput(chunk: string): void {
    if (this.outputTruncated || !chunk) {
      return;
    }
    let toWrite = chunk;
    if (this.outputByteCount + toWrite.length > MAX_OUTPUT_BYTES) {
      toWrite = toWrite.slice(0, Math.max(0, MAX_OUTPUT_BYTES - this.outputByteCount));
      this.outputTruncated = true;
    }
    this.outputByteCount += toWrite.length;
    if (toWrite) {
      this.write(toWrite.replace(/\n/g, "\r\n"));
    }
    if (this.outputTruncated) {
      this.write("\r\n[output truncated]\r\n");
    }
  }

  private handleShellStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    const result = splitOnCommandMarker(this.stdoutBuffer, this.marker);
    if (!result.found) {
      if (this.stdoutBuffer.length > MAX_OUTPUT_BYTES * 2) {
        this.emitOutput(this.stdoutBuffer);
        this.stdoutBuffer = "";
      }
      return;
    }
    this.stdoutBuffer = result.remainder;
    if (result.before) {
      this.emitOutput(result.before);
    }
    this.resolvePendingCommand();
  }

  private resolvePendingCommand(): void {
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve?.();
  }

  async handleLine(rawLine: string): Promise<void> {
    if (this.destroyed || !this.containerReady || this.commandInFlight) {
      return;
    }
    this.armIdleTimer();
    const line = rawLine.trim();

    if (!line) {
      this.write("$ ");
      return;
    }

    if (line === "clear") {
      this.write("\x1b[2J\x1b[H$ ");
      return;
    }

    const validation = validateTerminalCommand(line);
    if (!validation.allowed) {
      this.write(`\r\n${validation.reason}\r\n$ `);
      return;
    }

    await this.runCommand(line);
    this.write("$ ");
  }

  private async runCommand(line: string): Promise<void> {
    const shell = this.shellProcess;
    if (!shell || shell.exitCode !== null || shell.killed) {
      this.write("\r\nThe command could not be completed.\r\n");
      return;
    }

    this.commandInFlight = true;
    this.outputByteCount = 0;
    this.outputTruncated = false;

    const donePromise = new Promise<void>((resolve) => {
      this.pendingResolve = resolve;
    });

    const timeoutHandle = setTimeout(() => {
      if (this.pendingResolve) {
        this.write("\r\n[command timed out]\r\n");
        this.resolvePendingCommand();
      }
    }, COMMAND_TIMEOUT_MS);

    try {
      shell.stdin.write(`${line}\n`);
      shell.stdin.write(`echo ${this.marker}\n`);
      await donePromise;
    } catch {
      this.resolvePendingCommand();
      this.write("\r\nThe command could not be completed.\r\n");
    } finally {
      clearTimeout(timeoutHandle);
      this.commandInFlight = false;
    }
  }

  async destroy(reason: "exit" | "timeout" | "idle" | "closed" | "error" = "closed"): Promise<void> {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.lifetimeTimer) clearTimeout(this.lifetimeTimer);
    this.resolvePendingCommand();

    const shell = this.shellProcess;
    if (shell && shell.exitCode === null && !shell.killed) {
      await new Promise<void>((resolve) => {
        const forceKill = setTimeout(() => {
          try {
            shell.kill("SIGKILL");
          } catch {
            // Cleanup must never throw.
          }
          resolve();
        }, SHELL_CLOSE_GRACE_MS);
        shell.once("close", () => {
          clearTimeout(forceKill);
          resolve();
        });
        try {
          shell.stdin.end();
        } catch {
          clearTimeout(forceKill);
          resolve();
        }
      });
    }

    if (this.containerReady) {
      await destroySandboxContainer(this.containerName);
    }
    this.onExit(null, reason);
  }
}
