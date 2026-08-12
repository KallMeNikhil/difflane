import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { TERMINAL_LIMITS } from "@difflane/shared-types";
import { env } from "../config/env.js";
import { isExecutableAllowed, validateTerminalCommand } from "./terminalCommandPolicy.js";

const MINIMAL_PATH = "/usr/local/bin:/usr/bin:/bin";
const MAX_OUTPUT_BYTES = 64_000;
const COMMAND_TIMEOUT_MS = 10_000;

export type TerminalSandboxEventHandler = (data: string) => void;
export type TerminalSandboxExitHandler = (exitCode: number | null, reason: "exit" | "timeout" | "idle" | "closed" | "error") => void;

export class TerminalSandboxSession {
  readonly sessionId: string = randomUUID();
  private readonly sandboxDir: string;
  private relativeCwd = ".";
  private idleTimer: NodeJS.Timeout | null = null;
  private lifetimeTimer: NodeJS.Timeout | null = null;
  private destroyed = false;
  private activeChild: ReturnType<typeof spawn> | null = null;

  private onData: TerminalSandboxEventHandler = () => undefined;
  private onExit: TerminalSandboxExitHandler = () => undefined;

  constructor() {
    this.sandboxDir = path.join(env.terminal.sandboxRoot, this.sessionId);
  }

  onDataEvent(handler: TerminalSandboxEventHandler): void {
    this.onData = handler;
  }

  onExitEvent(handler: TerminalSandboxExitHandler): void {
    this.onExit = handler;
  }

  async start(): Promise<void> {
    await mkdir(this.sandboxDir, { recursive: true });
    this.write(`Difflane sandboxed shell. Allowlisted commands only. Type "clear" to reset.\r\n$ `);
    this.armIdleTimer();
    this.lifetimeTimer = setTimeout(() => {
      void this.destroy("timeout");
    }, TERMINAL_LIMITS.maxSessionLifetimeMs);
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

  async handleLine(rawLine: string): Promise<void> {
    if (this.destroyed) {
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

    const tokens = line.split(/\s+/);
    const executable = tokens[0];
    const args = tokens.slice(1);

    if (executable === "cd") {
      this.handleCd(args[0] ?? ".");
      this.write("$ ");
      return;
    }

    if (!isExecutableAllowed(executable)) {
      this.write(`\r\nCommand not permitted.\r\n$ `);
      return;
    }

    await this.runCommand(executable, args);
    this.write("$ ");
  }

  private handleCd(target: string): void {
    const nextRelative = path.normalize(path.join(this.relativeCwd, target));
    const resolved = path.resolve(this.sandboxDir, nextRelative);
    const isWithinSandbox = resolved === this.sandboxDir || resolved.startsWith(`${this.sandboxDir}${path.sep}`);
    if (!isWithinSandbox) {
      this.write("\r\ncd: cannot leave the workspace sandbox\r\n");
      return;
    }
    this.relativeCwd = path.relative(this.sandboxDir, resolved) || ".";
  }

  private runCommand(executable: string, args: string[]): Promise<void> {
    return new Promise((resolve) => {
      const cwd = path.resolve(this.sandboxDir, this.relativeCwd);
      let outputBytes = 0;
      let settled = false;

      const child = spawn(executable, args, {
        cwd,
        env: {
          PATH: MINIMAL_PATH,
          HOME: this.sandboxDir,
          LANG: "C.UTF-8",
        },
        shell: false,
        timeout: COMMAND_TIMEOUT_MS,
      });
      this.activeChild = child;

      const forward = (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_OUTPUT_BYTES) {
          if (!settled) {
            this.write("\r\n[output truncated]\r\n");
            child.kill("SIGKILL");
          }
          return;
        }
        this.write(chunk.toString("utf-8").replace(/\n/g, "\r\n"));
      };

      child.stdout?.on("data", forward);
      child.stderr?.on("data", forward);

      const finish = () => {
        if (settled) return;
        settled = true;
        this.activeChild = null;
        resolve();
      };

      child.on("error", (error) => {
        this.write(`\r\n${error.message}\r\n`);
        finish();
      });
      child.on("close", () => finish());
    });
  }

  killActiveProcess(): void {
    this.activeChild?.kill("SIGTERM");
  }

  async destroy(reason: "exit" | "timeout" | "idle" | "closed" | "error" = "closed"): Promise<void> {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.lifetimeTimer) clearTimeout(this.lifetimeTimer);
    this.activeChild?.kill("SIGKILL");
    await rm(this.sandboxDir, { recursive: true, force: true }).catch(() => undefined);
    this.onExit(null, reason);
  }
}
