import { useCallback, useRef, useState } from "react";
import { findExecutionLanguageForMonacoId, type ExecutionResultPayload, type ExecutionStatus } from "@difflane/shared-types";
import * as ExecutionService from "../services/ExecutionService";
import * as executionClient from "../lib/workspace/executionClient";

const ACTIVE_STATUSES: ExecutionStatus[] = ["queued", "running"];
const POLL_INTERVAL_MS = 800;
const POLL_TIMEOUT_MS = 25_000;

export interface UseExecutionResult {
  activeExecution: ExecutionResultPayload | null;
  isRunning: boolean;
  isLanguageSupported: (monacoLanguageId: string) => boolean;
  run: (entryPath: string, monacoLanguageId: string) => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

export function useExecution(workspaceCode: string, guestId: string | null): UseExecutionResult {
  const [activeExecution, setActiveExecution] = useState<ExecutionResultPayload | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executionIdRef = useRef<string | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const poll = useCallback(
    (executionId: string, deadline: number) => {
      clearPoll();
      pollTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            const result = await executionClient.fetchExecution(workspaceCode, executionId, guestId);
            if (executionIdRef.current !== executionId) {
              return;
            }
            setActiveExecution(result);
            if (ACTIVE_STATUSES.includes(result.status) && Date.now() < deadline) {
              poll(executionId, deadline);
            }
          } catch {
            if (executionIdRef.current === executionId) {
              clearPoll();
            }
          }
        })();
      }, POLL_INTERVAL_MS);
    },
    [workspaceCode, guestId, clearPoll],
  );

  const run = useCallback(
    async (entryPath: string, monacoLanguageId: string) => {
      const descriptor = findExecutionLanguageForMonacoId(monacoLanguageId);
      if (!descriptor || descriptor.kind === "preview") {
        return;
      }
      const initial = await ExecutionService.runExecution(workspaceCode, { entryPath, languageId: descriptor.id }, guestId);
      executionIdRef.current = initial.executionId;
      setActiveExecution({ ...initial, stdout: "", stderr: "", compileOutput: null, truncated: false });
      poll(initial.executionId, Date.now() + POLL_TIMEOUT_MS);
    },
    [workspaceCode, guestId, poll],
  );

  const stop = useCallback(async () => {
    if (!executionIdRef.current) {
      return;
    }
    clearPoll();
    await ExecutionService.stopExecution(workspaceCode, executionIdRef.current, guestId);
    const result = await executionClient.fetchExecution(workspaceCode, executionIdRef.current, guestId);
    setActiveExecution(result);
  }, [workspaceCode, guestId, clearPoll]);

  const reset = useCallback(() => {
    clearPoll();
    executionIdRef.current = null;
    setActiveExecution(null);
  }, [clearPoll]);

  const isLanguageSupported = useCallback((monacoLanguageId: string) => {
    const descriptor = findExecutionLanguageForMonacoId(monacoLanguageId);
    return Boolean(descriptor && descriptor.kind !== "preview");
  }, []);

  const isRunning = activeExecution ? ACTIVE_STATUSES.includes(activeExecution.status) : false;

  return { activeExecution, isRunning, isLanguageSupported, run, stop, reset };
}
