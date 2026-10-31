import { Icon } from "../common";
import type { ExecutionResultPayload } from "@difflane/shared-types";

interface RunControlProps {
  isSupported: boolean;
  isRunning: boolean;
  activeExecution: ExecutionResultPayload | null;
  isAwaitingInput?: boolean;
  onRun: () => void;
  onStop: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued…",
  running: "Running…",
  success: "Success",
  failed: "Failed",
  stopped: "Stopped",
  timeout: "Timed out",
  resource_limit: "Resource limit",
  compilation_failed: "Compile error",
  runtime_error: "Runtime error",
  unsupported: "Unsupported",
  awaiting_input: "Waiting for input",
};

const STATUS_TONE: Record<string, string> = {
  queued: "text-on-surface-variant",
  running: "text-secondary",
  success: "text-tertiary",
  failed: "text-error",
  stopped: "text-on-surface-variant",
  timeout: "text-error",
  resource_limit: "text-error",
  compilation_failed: "text-error",
  runtime_error: "text-error",
  unsupported: "text-on-surface-variant",
  awaiting_input: "text-primary",
};

export function RunControl({ isSupported, isRunning, activeExecution, isAwaitingInput = false, onRun, onStop }: RunControlProps) {
  const status = isAwaitingInput ? "awaiting_input" : isRunning ? "running" : activeExecution?.status;
  if (!isSupported) {
    return (
      <span className="text-on-surface-variant font-label-sm text-[10px] tracking-widest uppercase opacity-60">
        Execution not supported for this language yet
      </span>
    );
  }

  return (
    <div className="flex items-center gap-sm">
      {status && (isRunning || activeExecution) && (
        <span className={`whitespace-nowrap font-label-sm text-[10px] tracking-widest uppercase ${STATUS_TONE[status] ?? "text-on-surface-variant"}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      )}
      {isRunning ? (
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-xs px-sm py-1 rounded text-error hover:bg-error-container/10 transition-colors font-label-sm text-[11px]"
        >
          <Icon name="stop" size={16} />
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={onRun}
          className="flex items-center gap-xs px-sm py-1 rounded text-tertiary hover:bg-tertiary-container/10 transition-colors font-label-sm text-[11px]"
        >
          <Icon name="play_arrow" size={16} />
          Run
        </button>
      )}
    </div>
  );
}
