import { env } from "../config/env.js";
import { EXECUTION_LIMITS } from "@difflane/shared-types";
import { resolveJudge0LanguageIds, type Judge0ExecutableLanguageId } from "./languagePolicy.js";

export interface Judge0SubmitInput {
  languageId: number;
  sourceCode: string;
  stdin?: string;
  additionalFilesBase64?: string;
  compilerOptions?: string;
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
const LANGUAGE_CACHE_TTL_MS = 60 * 60 * 1000;
const LANGUAGE_RETRY_AFTER_MS = 60 * 1000;

class Judge0Error extends Error {}

export function judge0AuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (env.judge0.authToken) {
    headers[env.judge0.authHeader] = env.judge0.authToken;
  }
  try {
    const host = new URL(env.judge0.baseUrl).hostname;
    if (host.endsWith("rapidapi.com")) {
      headers["X-RapidAPI-Host"] = host;
    }
  } catch {
  }
  return headers;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, label: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    if (controller.signal.aborted) {
      throw new Judge0Error(`${label} timed out. The code execution service may be busy; please try again.`);
    }
    throw new Judge0Error("The code execution service could not be reached. Please try again shortly.");
  } finally {
    clearTimeout(timer);
  }
}

async function describeFailure(response: Response, action: string): Promise<string> {
  if (response.status === 401 || response.status === 403) {
    return "The code execution service rejected the server's credentials. Check JUDGE0_AUTH_HEADER / JUDGE0_AUTH_TOKEN.";
  }
  if (response.status === 429) {
    return "The code execution service's rate limit or daily quota has been reached. Please try again later.";
  }
  if (response.status === 503) {
    return "The code execution service is temporarily unavailable. Please try again shortly.";
  }
  let detail = "";
  try {
    const body = (await response.json()) as Record<string, unknown>;
    detail = Object.entries(body)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join("; ");
  } catch {
  }
  return `${action} failed (${response.status})${detail ? `: ${detail}` : "."}`;
}

let languageCache: { ids: Record<Judge0ExecutableLanguageId, number>; expiresAt: number } | null = null;

export async function getJudge0LanguageId(languageId: Judge0ExecutableLanguageId): Promise<number> {
  if (!languageCache || languageCache.expiresAt < Date.now()) {
    try {
      const response = await fetchWithTimeout(
        `${env.judge0.baseUrl}/languages`,
        { headers: judge0AuthHeaders() },
        env.judge0.requestTimeoutMs,
        "Judge0 language lookup",
      );
      if (!response.ok) {
        throw new Judge0Error(await describeFailure(response, "Judge0 language lookup"));
      }
      const available = (await response.json()) as { id: number; name: string }[];
      languageCache = { ids: resolveJudge0LanguageIds(available), expiresAt: Date.now() + LANGUAGE_CACHE_TTL_MS };
    } catch {
      languageCache = { ids: resolveJudge0LanguageIds([]), expiresAt: Date.now() + LANGUAGE_RETRY_AFTER_MS };
    }
  }
  return languageCache.ids[languageId];
}

export function resetJudge0LanguageCache(): void {
  languageCache = null;
}

export async function submitExecution(input: Judge0SubmitInput): Promise<string> {
  const response = await fetchWithTimeout(
    `${env.judge0.baseUrl}/submissions?base64_encoded=true&wait=false`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...judge0AuthHeaders() },
      body: JSON.stringify({
        language_id: input.languageId,
        source_code: Buffer.from(input.sourceCode, "utf-8").toString("base64"),
        stdin: input.stdin ? Buffer.from(input.stdin, "utf-8").toString("base64") : undefined,
        additional_files: input.additionalFilesBase64,
        compiler_options: input.compilerOptions,
        cpu_time_limit: EXECUTION_LIMITS.cpuTimeSeconds,
        wall_time_limit: EXECUTION_LIMITS.wallTimeSeconds,
        memory_limit: EXECUTION_LIMITS.memoryKb,
        enable_network: false,
        redirect_stderr_to_stdout: false,
      }),
    },
    env.judge0.requestTimeoutMs,
    "Submitting to the code execution service",
  );

  if (!response.ok) {
    throw new Judge0Error(await describeFailure(response, "Submitting to the code execution service"));
  }
  const body = (await response.json()) as { token?: string };
  if (!body.token) {
    throw new Judge0Error("The code execution service did not return a submission token.");
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

async function fetchSubmission(token: string): Promise<Judge0Result> {
  const fields = "status,stdout,stderr,compile_output,message,exit_code,time,memory";
  const response = await fetchWithTimeout(
    `${env.judge0.baseUrl}/submissions/${token}?base64_encoded=true&fields=${fields}`,
    { headers: judge0AuthHeaders() },
    env.judge0.requestTimeoutMs,
    "Checking the execution status",
  );
  if (!response.ok) {
    throw new Judge0Error(await describeFailure(response, "Checking the execution status"));
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
    stdout: decodeBase64(body.stdout),
    stderr: decodeBase64(body.stderr),
    compileOutput: decodeBase64(body.compile_output),
    message: decodeBase64(body.message),
    exitCode: body.exit_code ?? null,
    time: body.time ? Number.parseFloat(body.time) : null,
    memory: body.memory ?? null,
  };
}

function waitFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export async function pollExecution(token: string, signal?: AbortSignal): Promise<Judge0Result> {
  const deadline = Date.now() + env.judge0.pollTimeoutMs;
  let consecutiveFailures = 0;
  for (;;) {
    if (signal?.aborted) {
      throw new Judge0Error("Execution was stopped.");
    }
    try {
      const result = await fetchSubmission(token);
      consecutiveFailures = 0;
      if (result.statusId !== JUDGE0_STATUS_QUEUED && result.statusId !== JUDGE0_STATUS_PROCESSING) {
        return result;
      }
    } catch (error) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= 3) {
        throw error;
      }
    }
    if (Date.now() > deadline) {
      throw new Judge0Error("The program is still waiting in the execution queue. Please try again in a moment.");
    }
    await waitFor(env.judge0.pollIntervalMs, signal);
  }
}

export { Judge0Error };
