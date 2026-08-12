import { env } from "../config/env.js";
import { EXECUTION_LIMITS } from "@difflane/shared-types";

export interface Judge0SubmissionFile {
  name: string;
  content: string;
}

export interface Judge0SubmitInput {
  languageId: number;
  sourceCode: string;
  stdin?: string;
  additionalFiles?: Judge0SubmissionFile[];
}

export interface Judge0Result {
  statusId: number;
  statusDescription: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  exitCode: number | null;
  time: number | null;
  memory: number | null;
}

const JUDGE0_STATUS_QUEUED = 1;
const JUDGE0_STATUS_PROCESSING = 2;

class Judge0Error extends Error {}

function authHeaders(): Record<string, string> {
  return env.judge0.authToken ? { "X-Auth-Token": env.judge0.authToken } : {};
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Judge0Error(`${label} timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function submitExecution(input: Judge0SubmitInput): Promise<string> {
  const response = await withTimeout(
    fetch(`${env.judge0.baseUrl}/submissions?base64_encoded=true&wait=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        language_id: input.languageId,
        source_code: Buffer.from(input.sourceCode, "utf-8").toString("base64"),
        stdin: input.stdin ? Buffer.from(input.stdin, "utf-8").toString("base64") : undefined,
        cpu_time_limit: EXECUTION_LIMITS.cpuTimeSeconds,
        wall_time_limit: EXECUTION_LIMITS.wallTimeSeconds,
        memory_limit: EXECUTION_LIMITS.memoryKb,
        max_processes_and_or_threads: EXECUTION_LIMITS.maxProcesses,
        enable_network: false,
        redirect_stderr_to_stdout: false,
      }),
    }),
    env.judge0.requestTimeoutMs,
    "Judge0 submission",
  );

  if (!response.ok) {
    throw new Judge0Error(`Judge0 rejected the submission (${response.status}).`);
  }
  const body = (await response.json()) as { token?: string };
  if (!body.token) {
    throw new Judge0Error("Judge0 did not return a submission token.");
  }
  return body.token;
}

function decodeBase64(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

async function fetchSubmission(token: string): Promise<Judge0Result & { statusId: number }> {
  const response = await withTimeout(
    fetch(`${env.judge0.baseUrl}/submissions/${token}?base64_encoded=true`, {
      headers: authHeaders(),
    }),
    env.judge0.requestTimeoutMs,
    "Judge0 status poll",
  );
  if (!response.ok) {
    throw new Judge0Error(`Judge0 status lookup failed (${response.status}).`);
  }
  const body = (await response.json()) as {
    status?: { id: number; description: string };
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    message?: string | null;
    exit_code?: number | null;
    time?: string | null;
    memory?: number | null;
  };
  return {
    statusId: body.status?.id ?? 0,
    statusDescription: body.status?.description ?? "Unknown",
    stdout: decodeBase64(body.stdout).slice(0, EXECUTION_LIMITS.maxOutputBytes),
    stderr: decodeBase64(body.stderr).slice(0, EXECUTION_LIMITS.maxOutputBytes),
    compileOutput: decodeBase64(body.compile_output).slice(0, EXECUTION_LIMITS.maxOutputBytes),
    message: decodeBase64(body.message),
    exitCode: body.exit_code ?? null,
    time: body.time ? Number.parseFloat(body.time) : null,
    memory: body.memory ?? null,
  };
}

export async function pollExecution(token: string, signal?: AbortSignal): Promise<Judge0Result> {
  const deadline = Date.now() + env.judge0.pollTimeoutMs;
  for (;;) {
    if (signal?.aborted) {
      throw new Judge0Error("Execution was stopped.");
    }
    const result = await fetchSubmission(token);
    if (result.statusId !== JUDGE0_STATUS_QUEUED && result.statusId !== JUDGE0_STATUS_PROCESSING) {
      return result;
    }
    if (Date.now() > deadline) {
      throw new Judge0Error("Judge0 execution polling timed out.");
    }
    await new Promise((resolve) => setTimeout(resolve, env.judge0.pollIntervalMs));
  }
}

export { Judge0Error };
