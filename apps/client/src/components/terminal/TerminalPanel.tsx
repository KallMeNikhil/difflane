import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Icon, IconButton } from "../common";
import { useTerminal } from "../../hooks/useTerminal";

const MIN_PANEL_HEIGHT = 140;
const MAX_PANEL_HEIGHT = 560;
const DEFAULT_PANEL_HEIGHT = 240;

interface TerminalPanelProps {
  workspaceCode: string;
  accessToken: string | null;
  guestId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalPanel({ workspaceCode, accessToken, guestId, isOpen, onClose }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const { status, errorMessage, exitInfo, sendInput, restart, onData } = useTerminal({
    workspaceCode,
    accessToken,
    guestId,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      return;
    }
    const terminal = new Terminal({
      convertEol: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      theme: { background: "#0f1218" },
      disableStdin: false,
      cursorBlink: true,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    let lineBuffer = "";
    const disposable = terminal.onData((data) => {
      if (data === "\r") {
        terminal.write("\r\n");
        sendInput(lineBuffer);
        lineBuffer = "";
        return;
      }
      if (data === "\u007f") {
        if (lineBuffer.length > 0) {
          lineBuffer = lineBuffer.slice(0, -1);
          terminal.write("\b \b");
        }
        return;
      }
      lineBuffer += data;
      terminal.write(data);
    });

    return () => {
      disposable.dispose();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [isOpen, sendInput]);

  useEffect(() => {
    if (!xtermRef.current) {
      return;
    }
    return onData((data) => {
      xtermRef.current?.write(data);
    });
  }, [onData]);

  useEffect(() => {
    fitAddonRef.current?.fit();
  }, [panelHeight]);

  useEffect(() => {
    if (exitInfo && xtermRef.current) {
      xtermRef.current.write(`\r\n[session ${exitInfo.reason}]\r\n`);
    }
  }, [exitInfo]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!resizeStateRef.current) return;
      const delta = resizeStateRef.current.startY - event.clientY;
      const next = Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, resizeStateRef.current.startHeight + delta));
      setPanelHeight(next);
    }
    function handleMouseUp() {
      resizeStateRef.current = null;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex flex-col border-t border-outline-variant/50 bg-surface-container-lowest flex-shrink-0" style={{ height: panelHeight }}>
      <div
        className="h-2 cursor-row-resize flex-shrink-0 hover:bg-primary/20 transition-colors"
        onMouseDown={(event) => {
          resizeStateRef.current = { startY: event.clientY, startHeight: panelHeight };
        }}
      />
      <div className="h-9 px-md flex items-center justify-between border-b border-outline-variant/50 flex-shrink-0">
        <div className="flex items-center gap-xs text-on-surface-variant font-label-sm text-[11px] tracking-widest uppercase">
          <Icon name="terminal" size={14} />
          Terminal
          <TerminalStatusBadge status={status} errorMessage={errorMessage} />
        </div>
        <div className="flex items-center gap-xs">
          <IconButton icon="restart_alt" size={16} shape="square" className="w-7 h-7" aria-label="Restart terminal" onClick={restart} />
          <IconButton icon="close" size={16} shape="square" className="w-7 h-7" aria-label="Close terminal" onClick={onClose} />
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 px-sm py-xs" />
    </div>
  );
}

function TerminalStatusBadge({ status, errorMessage }: { status: string; errorMessage: string | null }) {
  if (status === "error") {
    return <span className="text-error normal-case">{errorMessage ?? "Connection error"}</span>;
  }
  if (status === "connecting") {
    return <span className="text-on-surface-variant normal-case">Connecting…</span>;
  }
  if (status === "closed") {
    return <span className="text-on-surface-variant normal-case">Session ended</span>;
  }
  return <span className="text-secondary normal-case">Ready</span>;
}
