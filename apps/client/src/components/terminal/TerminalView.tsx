import { useEffect, useRef } from "react";
import type * as Y from "yjs";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { createDocShellFileSystem } from "../../lib/terminal/docShellFileSystem";
import type { InputAnswer } from "../../lib/execution/interactiveSession";
import { ANSI, VirtualShell, type ShellRunner } from "../../lib/terminal/virtualShell";
import * as ExecutionService from "../../services/ExecutionService";

interface TerminalViewProps {
  doc: Y.Doc | null;
  workspaceCode: string;
  guestId: string | null;
  userName: string;
  isVisible: boolean;
  onOpenFile: (fileId: string) => void;
}

const KEY = {
  enter: "\r",
  backspace: "\x7f",
  ctrlBackspace: "\x08",
  delete: "\x1b[3~",
  left: "\x1b[D",
  right: "\x1b[C",
  up: "\x1b[A",
  down: "\x1b[B",
  home: ["\x1b[H", "\x1bOH", "\x01"],
  end: ["\x1b[F", "\x1bOF", "\x05"],
  ctrlC: "\x03",
  ctrlD: "\x04",
  ctrlL: "\x0c",
  ctrlU: "\x15",
  ctrlW: "\x17",
  tab: "\t",
} as const;

function toUserName(displayName: string): string {
  const slug = displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "you";
}

export function TerminalView({ doc, workspaceCode, guestId, userName, isVisible, onOpenFile }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const onOpenFileRef = useRef(onOpenFile);
  onOpenFileRef.current = onOpenFile;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !doc) {
      return;
    }

    const terminal = new Terminal({
      convertEol: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      theme: { background: "#0f1218" },
      cursorBlink: true,
      scrollback: 5000,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddonRef.current = fitAddon;
    try {
      fitAddon.fit();
    } catch {
    }

    const runner: ShellRunner = {
      run: (request, signal) => ExecutionService.executeAndWait(workspaceCode, request, guestId, { signal }),
    };
    let buffer = "";
    let cursor = 0;
    let collecting: { resolve: (answer: InputAnswer) => void } | null = null;
    let lineTail = "";

    const finishCollecting = (value: InputAnswer) => {
      const current = collecting;
      if (!current) return;
      collecting = null;
      buffer = "";
      cursor = 0;
      current.resolve(value);
    };

    const shell = new VirtualShell({
      fs: createDocShellFileSystem(doc),
      runner,
      userName: toUserName(userName),
      openFile: (fileId) => onOpenFileRef.current(fileId),
      clearScreen: () => terminal.clear(),
      readProgramInput: (signal) =>
        new Promise<InputAnswer>((resolve) => {
          collecting = { resolve };
          buffer = "";
          cursor = 0;
          render();
          signal.addEventListener("abort", () => finishCollecting({ kind: "cancel" }), { once: true });
        }),
    });

    let historyIndex: number | null = null;
    let draft = "";
    let running: AbortController | null = null;
    let lastOutputEndedWithNewline = true;
    const pendingLines: string[] = [];
    let disposed = false;

    const write = (text: string) => {
      if (!text) return;
      terminal.write(text);
      lastOutputEndedWithNewline = text.endsWith("\n");
      const newline = text.lastIndexOf("\n");
      lineTail = newline === -1 ? lineTail + text : text.slice(newline + 1);
    };

    const render = () => {
      const prompt = collecting ? lineTail : shell.prompt();
      terminal.write(`\r\x1b[K${prompt}${buffer}`);
      const back = buffer.length - cursor;
      if (back > 0) {
        terminal.write(`\x1b[${back}D`);
      }
    };

    const setBuffer = (next: string, nextCursor = next.length) => {
      buffer = next;
      cursor = Math.max(0, Math.min(nextCursor, next.length));
      render();
    };

    const submit = async (line: string) => {
      terminal.write("\r\n");
      lastOutputEndedWithNewline = true;
      historyIndex = null;
      draft = "";
      running = new AbortController();
      try {
        await shell.execute(line, { write }, running.signal);
      } catch (error) {
        write(`${ANSI.red}shell: ${error instanceof Error ? error.message : "command failed"}${ANSI.reset}\n`);
      }
      running = null;
      if (disposed) return;
      if (!lastOutputEndedWithNewline) {
        terminal.write("\r\n");
      }
      const next = pendingLines.shift();
      if (next !== undefined) {
        buffer = next;
        cursor = next.length;
        render();
        void submit(next);
        return;
      }
      buffer = "";
      cursor = 0;
      render();
    };

    const historyStep = (direction: -1 | 1) => {
      const entries = shell.historyEntries;
      if (entries.length === 0) return;
      if (historyIndex === null) {
        if (direction === 1) return;
        draft = buffer;
        historyIndex = entries.length - 1;
      } else {
        historyIndex += direction;
      }
      if (historyIndex >= entries.length) {
        historyIndex = null;
        setBuffer(draft);
        return;
      }
      historyIndex = Math.max(0, historyIndex);
      setBuffer(entries[historyIndex]);
    };

    const insert = (text: string) => {
      setBuffer(buffer.slice(0, cursor) + text + buffer.slice(cursor), cursor + text.length);
    };

    const disposable = terminal.onData((data) => {
      if (collecting) {
        const answerWith = (answer: InputAnswer, echo: string) => {
          terminal.write(echo);
          lastOutputEndedWithNewline = true;
          lineTail = "";
          finishCollecting(answer);
        };
        if (data === KEY.enter) {
          answerWith({ kind: "line", text: buffer }, "\r\n");
          return;
        }
        if (data === KEY.ctrlD) {
          answerWith(buffer ? { kind: "line", text: buffer } : { kind: "eof" }, buffer ? "\r\n" : "^D\r\n");
          return;
        }
        if (data.includes(KEY.ctrlC)) {
          pendingLines.length = 0;
          answerWith({ kind: "cancel" }, "^C\r\n");
          running?.abort();
          return;
        }
        if (data === KEY.tab || data === KEY.up || data === KEY.down) {
          return;
        }
        if (!data.startsWith("\x1b") && /[\r\n]/.test(data)) {
          const pasted = `${buffer.slice(0, cursor)}${data}`.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n+$/, "");
          answerWith({ kind: "line", text: pasted }, `${pasted.slice(buffer.slice(0, cursor).length).replace(/\n/g, "\r\n")}\r\n`);
          return;
        }
      } else if (running) {
        if (data.includes(KEY.ctrlC)) {
          pendingLines.length = 0;
          write("^C\n");
          running.abort();
        }
        return;
      }

      if (data === KEY.enter) {
        void submit(buffer);
        return;
      }
      if (data === KEY.backspace || data === KEY.ctrlBackspace) {
        if (cursor > 0) setBuffer(buffer.slice(0, cursor - 1) + buffer.slice(cursor), cursor - 1);
        return;
      }
      if (data === KEY.delete) {
        if (cursor < buffer.length) setBuffer(buffer.slice(0, cursor) + buffer.slice(cursor + 1), cursor);
        return;
      }
      if (data === KEY.left) {
        if (cursor > 0) setBuffer(buffer, cursor - 1);
        return;
      }
      if (data === KEY.right) {
        if (cursor < buffer.length) setBuffer(buffer, cursor + 1);
        return;
      }
      if (data === KEY.up) return historyStep(-1);
      if (data === KEY.down) return historyStep(1);
      if ((KEY.home as readonly string[]).includes(data)) return setBuffer(buffer, 0);
      if ((KEY.end as readonly string[]).includes(data)) return setBuffer(buffer, buffer.length);
      if (data === KEY.ctrlC) {
        terminal.write("^C\r\n");
        historyIndex = null;
        setBuffer("");
        return;
      }
      if (data === KEY.ctrlL) {
        terminal.clear();
        render();
        return;
      }
      if (data === KEY.ctrlU) return setBuffer(buffer.slice(cursor), 0);
      if (data === KEY.ctrlW) {
        const start = buffer.slice(0, cursor).replace(/\S+\s*$/, "").length;
        setBuffer(buffer.slice(0, start) + buffer.slice(cursor), start);
        return;
      }
      if (data === KEY.tab) {
        const completion = shell.complete(buffer.slice(0, cursor));
        if (completion.suggestions.length > 0) {
          terminal.write(`\r\n${completion.suggestions.join("  ")}\r\n`);
        }
        setBuffer(completion.line + buffer.slice(cursor), completion.line.length);
        return;
      }
      if (data.startsWith("\x1b")) {
        return;
      }

      const lines = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      // eslint-disable-next-line no-control-regex
      const printable = (text: string) => text.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").replace(/\t/g, "  ");
      insert(printable(lines[0]));
      if (lines.length > 1) {
        pendingLines.push(...lines.slice(1, -1).map(printable));
        const tail = printable(lines[lines.length - 1]);
        if (tail) pendingLines.push(tail);
        void submit(buffer);
      }
    });

    write(`${ANSI.bold}Difflane workspace shell${ANSI.reset} ${ANSI.dim}— commands work on the shared workspace files. Type ${ANSI.reset}${ANSI.cyan}help${ANSI.reset}${ANSI.dim} to get started.${ANSI.reset}\n`);
    render();

    const observer = new ResizeObserver(() => {
      if (container.offsetParent === null) return;
      try {
        fitAddon.fit();
      } catch {
      }
    });
    observer.observe(container);

    return () => {
      disposed = true;
      running?.abort();
      observer.disconnect();
      disposable.dispose();
      terminal.dispose();
      fitAddonRef.current = null;
    };
  }, [doc, workspaceCode, guestId, userName]);

  useEffect(() => {
    if (!isVisible) return;
    const frame = requestAnimationFrame(() => {
      try {
        fitAddonRef.current?.fit();
      } catch {
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isVisible]);

  if (!doc) {
    return <div className="flex-1 min-h-0 px-md py-sm text-on-surface-variant text-[12px]">Connecting to the workspace…</div>;
  }
  return <div ref={containerRef} className="flex-1 min-h-0 px-sm py-xs" onClick={() => containerRef.current?.querySelector("textarea")?.focus()} />;
}
