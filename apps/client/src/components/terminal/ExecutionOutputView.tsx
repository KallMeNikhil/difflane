import { useEffect, useRef, useState } from "react";
import { EXECUTION_LANGUAGES, EXECUTION_LIMITS } from "@difflane/shared-types";
import type { InteractiveSnapshot } from "../../lib/execution/interactiveSession";
import { Icon } from "../common";

interface ExecutionOutputViewProps {
  session: InteractiveSnapshot | null;
  isRunning: boolean;
  isAwaitingInput: boolean;
  errorMessage: string | null;
  activeFileLabel: string | null;
  canRunActiveFile: boolean;
  onRun: () => void;
  onStop: () => void;
  onClear: () => void;
  onSubmitInput: (text: string) => void;
  onEndInput: () => void;
}

const STATUS_TEXT: Record<string, { label: string; tone: string }> = {
  queued: { label: "Queued", tone: "text-on-surface-variant" },
  running: { label: "Running", tone: "text-secondary" },
  awaiting_input: { label: "Waiting for input", tone: "text-primary" },
  success: { label: "Finished", tone: "text-tertiary" },
  failed: { label: "Failed", tone: "text-error" },
  stopped: { label: "Stopped", tone: "text-on-surface-variant" },
  timeout: { label: "Time limit exceeded", tone: "text-error" },
  resource_limit: { label: "Resource limit", tone: "text-error" },
  compilation_failed: { label: "Compilation error", tone: "text-error" },
  runtime_error: { label: "Runtime error", tone: "text-error" },
  unsupported: { label: "Unsupported", tone: "text-on-surface-variant" },
};

export function ExecutionOutputView({
  session,
  isRunning,
  isAwaitingInput,
  errorMessage,
  activeFileLabel,
  canRunActiveFile,
  onRun,
  onStop,
  onClear,
  onSubmitInput,
  onEndInput,
}: ExecutionOutputViewProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const result = session?.result ?? null;
  const isFinished = session?.phase === "finished";
  const isReplaying = isRunning && session?.phase === "running" && (session.answers.length ?? 0) > 0;
  const language = result ? EXECUTION_LANGUAGES.find((entry) => entry.id === result.languageId)?.displayName : null;
  const status = isAwaitingInput
    ? STATUS_TEXT.awaiting_input
    : isRunning
      ? { label: "Running…", tone: "text-secondary" }
      : errorMessage
        ? { label: "Error", tone: "text-error" }
        : result
          ? STATUS_TEXT[result.status] ?? { label: result.status, tone: "" }
          : { label: "Ready", tone: "text-on-surface-variant" };
  const hasOutput = Boolean(session && (session.transcript.length > 0 || result?.stderr || result?.compileOutput));

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [session, isAwaitingInput, errorMessage]);

  useEffect(() => {
    if (isAwaitingInput) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isAwaitingInput, session]);

  function submit(text: string) {
    if (!isAwaitingInput) return;
    setDraft("");
    onSubmitInput(text.slice(0, EXECUTION_LIMITS.maxStdinBytes));
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="h-10 px-md flex items-center gap-sm border-b border-outline-variant/50 flex-shrink-0">
        {isRunning ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-xs px-md h-7 rounded bg-error/90 hover:bg-error text-white font-label-sm text-[12px] font-semibold transition-colors"
          >
            <Icon name="stop" size={16} />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={onRun}
            disabled={!canRunActiveFile}
            title="Run (Ctrl+Enter)"
            className="flex items-center gap-xs px-md h-7 rounded bg-primary hover:bg-primary/90 text-on-primary font-label-sm text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="play_arrow" size={16} />
            Run
          </button>
        )}
        <span className="font-code text-[12px] text-on-surface truncate">{result?.entryPath ?? activeFileLabel ?? "No runnable file open"}</span>
        {language && <span className="text-[11px] text-on-surface-variant flex-shrink-0">{language}</span>}
        <span className="hidden md:inline text-[10px] text-on-surface-variant/70 flex-shrink-0">Ctrl+Enter</span>
        <div className="ml-auto flex items-center gap-sm flex-shrink-0 text-[11px]">
          {isFinished && result?.cpuTimeSeconds != null && <span className="text-on-surface-variant">{result.cpuTimeSeconds.toFixed(2)}s</span>}
          {isFinished && result?.memoryKb != null && <span className="text-on-surface-variant">{(result.memoryKb / 1024).toFixed(1)} MB</span>}
          <span className={`flex items-center gap-1 ${status.tone}`}>
            {isRunning && !isAwaitingInput && <Icon name="progress_activity" size={14} className="animate-spin" />}
            {status.label}
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={isRunning}
            title="Clear output"
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface transition-colors disabled:opacity-40"
          >
            <Icon name="block" size={15} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto px-md py-sm font-code text-[13px] leading-relaxed cursor-text"
        onClick={() => {
          if (isAwaitingInput && !window.getSelection()?.toString()) inputRef.current?.focus();
        }}
      >
        {!session && !errorMessage && !isRunning && (
          <p className="text-on-surface-variant">
            {canRunActiveFile
              ? "Press Run to execute the file. When the program asks for input, type it right here."
              : "Open a C, C++, Java, Python, JavaScript or TypeScript file to run it."}
          </p>
        )}
        {isRunning && !hasOutput && !isAwaitingInput && <p className="text-on-surface-variant">Running…</p>}
        {result?.compileOutput && <pre className="whitespace-pre-wrap break-words text-[#e5c07b]">{result.compileOutput}</pre>}

        {session && (session.transcript.length > 0 || isAwaitingInput) && (
          <pre className="whitespace-pre-wrap break-words text-on-surface">
            {session.transcript.map((segment, index) =>
              segment.kind === "input" ? (
                <span key={index} className="text-primary">
                  {segment.text}
                </span>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
            {isAwaitingInput && (
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submit(draft);
                  } else if (event.ctrlKey && (event.key === "d" || event.key === "D")) {
                    event.preventDefault();
                    setDraft("");
                    onEndInput();
                  } else if (event.ctrlKey && (event.key === "c" || event.key === "C") && !window.getSelection()?.toString()) {
                    event.preventDefault();
                    onStop();
                  }
                }}
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
                  if (!text.includes("\n")) return;
                  event.preventDefault();
                  submit(`${draft}${text}`.replace(/\n+$/, ""));
                }}
                aria-label="Program input"
                spellCheck={false}
                autoComplete="off"
                className="inline-block min-w-[2ch] w-[60%] bg-transparent p-0 m-0 border-0 outline-none text-primary caret-primary font-code text-[13px] leading-relaxed"
              />
            )}
            {isReplaying && <span className="inline-block w-2 h-4 align-text-bottom bg-on-surface-variant/60 animate-pulse" aria-hidden="true" />}
          </pre>
        )}

        {result?.stderr && <pre className="whitespace-pre-wrap break-words text-error">{result.stderr}</pre>}
        {errorMessage && <p className="text-error whitespace-pre-wrap">{errorMessage}</p>}
        {isFinished && result?.message && <p className="mt-xs whitespace-pre-wrap font-body-sm text-[12px] text-[#e5c07b]">{result.message}</p>}
        {isFinished && result?.truncated && <p className="mt-xs font-body-sm text-[11px] text-on-surface-variant">Output was truncated.</p>}
        {isFinished && result?.status === "success" && session.transcript.length === 0 && !result.stderr && !result.message && (
          <p className="text-on-surface-variant italic">The program finished without printing anything.</p>
        )}
        {isFinished && result && result.exitCode !== null && !["success", "timeout", "stopped"].includes(result.status) && (
          <p className="mt-sm font-body-sm text-[11px] text-on-surface-variant">Exited with code {result.exitCode}.</p>
        )}
        {isAwaitingInput && (
          <p className="mt-sm font-body-sm text-[11px] text-on-surface-variant">
            The program is waiting for input - type and press <span className="text-on-surface">Enter</span>. Paste several lines to answer
            them all at once, <span className="text-on-surface">Ctrl+D</span> ends input.
          </p>
        )}
      </div>
    </div>
  );
}
