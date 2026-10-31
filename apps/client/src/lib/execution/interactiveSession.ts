import type { ExecutionResultPayload } from "@difflane/shared-types";

export type InputAnswer = { kind: "line"; text: string } | { kind: "eof" } | { kind: "cancel" };

export interface TranscriptSegment {
  kind: "output" | "input";
  text: string;
}

export interface InteractiveAnswer {
  cut: number;
  text: string;
}

export interface InteractiveSnapshot {
  phase: "running" | "awaiting_input" | "finished";
  result: ExecutionResultPayload | null;
  answers: InteractiveAnswer[];
  transcript: TranscriptSegment[];
}

export interface InteractiveExecuteRequest {
  stdin: string;
  interactive: boolean;
  continuationOf?: string;
}

export interface InteractiveSessionOptions {
  execute: (request: InteractiveExecuteRequest, signal: AbortSignal) => Promise<ExecutionResultPayload>;
  readInput: (signal: AbortSignal) => Promise<InputAnswer>;
  onUpdate?: (snapshot: InteractiveSnapshot) => void;
  signal: AbortSignal;
}

export function buildTranscript(stdout: string, answers: readonly InteractiveAnswer[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let position = 0;
  for (const answer of answers) {
    const cut = Math.min(Math.max(answer.cut, position), stdout.length);
    if (cut > position) {
      segments.push({ kind: "output", text: stdout.slice(position, cut) });
    }
    segments.push({ kind: "input", text: `${answer.text}\n` });
    position = cut;
  }
  if (position < stdout.length) {
    segments.push({ kind: "output", text: stdout.slice(position) });
  }
  return segments;
}

export function joinAnswers(answers: readonly InteractiveAnswer[]): string {
  return answers.map((answer) => `${answer.text}\n`).join("");
}

export async function runInteractiveSession({ execute, readInput, onUpdate, signal }: InteractiveSessionOptions): Promise<InteractiveSnapshot> {
  const answers: InteractiveAnswer[] = [];
  let interactive = true;
  let continuationOf: string | undefined;
  let result: ExecutionResultPayload | null = null;

  const emit = (phase: InteractiveSnapshot["phase"]): InteractiveSnapshot => {
    const snapshot: InteractiveSnapshot = {
      phase,
      result,
      answers: [...answers],
      transcript: buildTranscript(result?.stdout ?? "", answers),
    };
    onUpdate?.(snapshot);
    return snapshot;
  };

  for (;;) {
    emit("running");
    result = await execute({ stdin: joinAnswers(answers), interactive, continuationOf }, signal);
    if (signal.aborted || result.status !== "awaiting_input") {
      return emit("finished");
    }

    emit("awaiting_input");
    const answer = await readInput(signal);
    if (answer.kind === "cancel" || signal.aborted) {
      result = { ...result, status: "stopped", message: null };
      return emit("finished");
    }
    continuationOf = result.executionId;
    if (answer.kind === "eof") {
      interactive = false;
      continue;
    }
    answers.push({ cut: result.stdout.length, text: answer.text });
  }
}
