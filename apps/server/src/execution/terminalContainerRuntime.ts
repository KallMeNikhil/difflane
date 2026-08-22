import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { env } from "../config/env.js";

export class TerminalContainerError extends Error {}

interface DockerCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

function runDocker(args: string[], timeoutMs: number): Promise<DockerCommandResult> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(env.terminal.dockerBinaryPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      reject(error);
      return;
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, timedOut });
    });
  });
}

function baseRunArgs(containerName: string): string[] {
  const args = [
    "run",
    "-d",
    "--rm",
    "--name",
    containerName,
    "--network",
    "none",
    "--memory",
    env.terminal.containerMemoryLimit,
    "--memory-swap",
    env.terminal.containerMemoryLimit,
    "--cpus",
    env.terminal.containerCpuLimit,
    "--pids-limit",
    String(env.terminal.containerPidsLimit),
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,size=32m",
    `--tmpfs=${env.terminal.containerWorkdir}:rw,size=32m,uid=1000,gid=1000`,
    "--user",
    "1000:1000",
    "--workdir",
    env.terminal.containerWorkdir,
  ];
  if (env.terminal.containerRuntime) {
    args.push("--runtime", env.terminal.containerRuntime);
  }
  args.push(env.terminal.containerImage, "sleep", "infinity");
  return args;
}

export async function createSandboxContainer(containerName: string): Promise<void> {
  let result: DockerCommandResult;
  try {
    result = await runDocker(baseRunArgs(containerName), 15_000);
  } catch {
    throw new TerminalContainerError("sandbox_unavailable");
  }
  if (result.exitCode !== 0 || result.timedOut) {
    throw new TerminalContainerError("sandbox_unavailable");
  }
}

export function spawnInteractiveShell(containerName: string, cwd: string): ChildProcessWithoutNullStreams {
  return spawn(env.terminal.dockerBinaryPath, ["exec", "-i", "-w", cwd, containerName, "sh"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export interface SandboxExecResult {
  output: string;
  exitCode: number | null;
  timedOut: boolean;
}

export async function execInSandbox(
  containerName: string,
  cwd: string,
  executable: string,
  args: string[],
  timeoutMs: number,
): Promise<SandboxExecResult> {
  let result: DockerCommandResult;
  try {
    result = await runDocker(["exec", "-w", cwd, containerName, executable, ...args], timeoutMs);
  } catch {
    throw new TerminalContainerError("execution_failed");
  }
  return {
    output: result.stdout + result.stderr,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
  };
}

export async function destroySandboxContainer(containerName: string): Promise<void> {
  try {
    await runDocker(["rm", "-f", containerName], 10_000);
  } catch {
    // Cleanup must be idempotent and must never throw.
  }
}
