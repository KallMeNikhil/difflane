import { useCallback, useEffect, useRef, useState } from "react";
import { findExecutionLanguageForMonacoId } from "@difflane/shared-types";
import * as ExecutionService from "../services/ExecutionService";
import { runInteractiveSession, type InputAnswer, type InteractiveSnapshot } from "../lib/execution/interactiveSession";

export interface UseExecutionResult {
  session: InteractiveSnapshot | null;
  isRunning: boolean;
  isAwaitingInput: boolean;
  errorMessage: string | null;
  isLanguageSupported: (monacoLanguageId: string) => boolean;
  run: (entryPath: string, monacoLanguageId: string) => Promise<void>;
  submitInput: (text: string) => void;
  endInput: () => void;
  stop: () => void;
  reset: () => void;
}

export function useExecution(workspaceCode: string, guestId: string | null): UseExecutionResult {
  const [session, setSession] = useState<InteractiveSnapshot | null>(null);
  const [isRunning, setRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const answerRef = useRef<((answer: InputAnswer) => void) | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const answer = useCallback((value: InputAnswer) => {
    const resolve = answerRef.current;
    answerRef.current = null;
    resolve?.(value);
  }, []);

  const run = useCallback(
    async (entryPath: string, monacoLanguageId: string) => {
      const descriptor = findExecutionLanguageForMonacoId(monacoLanguageId);
      if (!descriptor || descriptor.kind === "preview") {
        setErrorMessage("This file type can't be executed.");
        return;
      }
      controllerRef.current?.abort();
      answer({ kind: "cancel" });
      const controller = new AbortController();
      controllerRef.current = controller;
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      const isCurrent = () => runIdRef.current === runId;

      setRunning(true);
      setErrorMessage(null);
      setSession(null);
      try {
        await runInteractiveSession({
          signal: controller.signal,
          execute: (request, signal) =>
            ExecutionService.executeAndWait(workspaceCode, { entryPath, languageId: descriptor.id, ...request }, guestId, { signal }),
          readInput: (signal) =>
            new Promise<InputAnswer>((resolve) => {
              answerRef.current = resolve;
              signal.addEventListener("abort", () => answer({ kind: "cancel" }), { once: true });
            }),
          onUpdate: (snapshot) => {
            if (isCurrent()) setSession(snapshot);
          },
        });
      } catch (error) {
        if (isCurrent()) setErrorMessage(error instanceof Error ? error.message : "Execution failed.");
      } finally {
        if (isCurrent()) setRunning(false);
      }
    },
    [workspaceCode, guestId, answer],
  );

  const submitInput = useCallback((text: string) => answer({ kind: "line", text }), [answer]);
  const endInput = useCallback(() => answer({ kind: "eof" }), [answer]);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    answer({ kind: "cancel" });
  }, [answer]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    answer({ kind: "cancel" });
    runIdRef.current += 1;
    setRunning(false);
    setErrorMessage(null);
    setSession(null);
  }, [answer]);

  const isLanguageSupported = useCallback((monacoLanguageId: string) => {
    const descriptor = findExecutionLanguageForMonacoId(monacoLanguageId);
    return Boolean(descriptor && descriptor.kind !== "preview");
  }, []);

  return {
    session,
    isRunning,
    isAwaitingInput: session?.phase === "awaiting_input",
    errorMessage,
    isLanguageSupported,
    run,
    submitInput,
    endInput,
    stop,
    reset,
  };
}
