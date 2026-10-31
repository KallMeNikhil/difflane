import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { Icon, IconButton } from "../common";
import { useWhiteboardPresence } from "../../hooks/useWhiteboardPresence";
import { readLocalAuthor } from "../../lib/whiteboard/whiteboardPresence";
import type { WhiteboardJumpHandler } from "./WhiteboardCanvas";
import { WhiteboardPresenceBar } from "./WhiteboardPresenceBar";

const WhiteboardCanvas = lazy(() => import("./WhiteboardCanvas"));

interface WhiteboardWindowProps {
  doc: Y.Doc | null;
  awareness: Awareness | null;
  readOnly: boolean;
  onClose: () => void;
}

interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STORAGE_KEY = "difflane:whiteboard:rect";
const MIN_WIDTH = 420;
const MIN_HEIGHT = 300;
const VIEWPORT_MARGIN = 8;

function defaultRect(): WindowRect {
  const width = Math.min(1100, window.innerWidth - VIEWPORT_MARGIN * 2);
  const height = Math.min(760, window.innerHeight - VIEWPORT_MARGIN * 2);
  return { x: (window.innerWidth - width) / 2, y: (window.innerHeight - height) / 2, width, height };
}

function clampRect(rect: WindowRect): WindowRect {
  const maxWidth = window.innerWidth - VIEWPORT_MARGIN * 2;
  const maxHeight = window.innerHeight - VIEWPORT_MARGIN * 2;
  const width = Math.max(Math.min(MIN_WIDTH, maxWidth), Math.min(rect.width, maxWidth));
  const height = Math.max(Math.min(MIN_HEIGHT, maxHeight), Math.min(rect.height, maxHeight));
  return {
    width,
    height,
    x: Math.min(Math.max(VIEWPORT_MARGIN, rect.x), window.innerWidth - width - VIEWPORT_MARGIN),
    y: Math.min(Math.max(VIEWPORT_MARGIN, rect.y), window.innerHeight - height - VIEWPORT_MARGIN),
  };
}

function readStoredRect(): WindowRect {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<WindowRect> | null;
    if (parsed && [parsed.x, parsed.y, parsed.width, parsed.height].every((value) => typeof value === "number")) {
      return clampRect(parsed as WindowRect);
    }
  } catch {
  }
  return clampRect(defaultRect());
}

function storeRect(rect: WindowRect): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rect));
  } catch {
  }
}

export function WhiteboardWindow({ doc, awareness, readOnly, onClose }: WhiteboardWindowProps) {
  const selfUserId = readLocalAuthor(awareness?.getLocalState())?.userId ?? null;
  const peers = useWhiteboardPresence(awareness, selfUserId);
  const jumpRef = useRef<WhiteboardJumpHandler | null>(null);
  const handleJumpReady = useCallback((jump: WhiteboardJumpHandler | null) => {
    jumpRef.current = jump;
  }, []);
  const [rect, setRect] = useState<WindowRect>(readStoredRect);
  const [isMaximized, setMaximized] = useState(false);
  const [isInteracting, setInteracting] = useState(false);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  useEffect(() => {
    const handleResize = () => setRect((current) => clampRect(current));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMaximized) {
        setMaximized(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized]);

  const startPointerGesture = useCallback(
    (event: React.PointerEvent, mode: "move" | "resize") => {
      if (isMaximized || event.button !== 0) return;
      event.preventDefault();
      const start = { x: event.clientX, y: event.clientY, rect: rectRef.current };
      setInteracting(true);
      let latest = start.rect;
      const handleMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        const next =
          mode === "move"
            ? { ...start.rect, x: start.rect.x + dx, y: start.rect.y + dy }
            : { ...start.rect, width: Math.max(MIN_WIDTH, start.rect.width + dx), height: Math.max(MIN_HEIGHT, start.rect.height + dy) };
        latest = clampRect(next);
        setRect(latest);
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        setInteracting(false);
        storeRect(latest);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [isMaximized],
  );

  const style = isMaximized
    ? { left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN, width: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`, height: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)` }
    : { left: rect.x, top: rect.y, width: rect.width, height: rect.height };

  return (
    <div
      role="dialog"
      aria-label="Whiteboard"
      className="fixed z-[60] flex flex-col rounded-lg border border-outline-variant bg-[#121212] shadow-2xl overflow-hidden"
      style={style}
    >
      <div
        className={`h-10 flex-shrink-0 flex items-center gap-sm px-md border-b border-outline-variant bg-surface-container-lowest select-none ${
          isMaximized ? "" : "cursor-move"
        }`}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          startPointerGesture(event, "move");
        }}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          setMaximized((value) => !value);
        }}
      >
        <Icon name="draw" size={16} className="text-on-surface-variant" />
        <span className="font-label-md text-[13px] font-semibold text-on-surface">Whiteboard</span>
        {readOnly && <span className="text-[11px] text-on-surface-variant">View only</span>}
        <div className="ml-auto flex items-center gap-sm">
          <WhiteboardPresenceBar peers={peers} onJump={(peer) => jumpRef.current?.(peer.clientId)} />
          <span className="w-px h-4 bg-outline-variant" />
          <IconButton
            icon={isMaximized ? "close_fullscreen" : "open_in_full"}
            size={15}
            shape="square"
            className="w-7 h-7"
            aria-label={isMaximized ? "Restore whiteboard size" : "Maximize whiteboard"}
            onClick={() => setMaximized((value) => !value)}
          />
          <IconButton icon="close" size={16} shape="square" className="w-7 h-7" aria-label="Close whiteboard" onClick={onClose} />
        </div>
      </div>

      <div className={`relative flex-1 min-h-0 ${isInteracting ? "pointer-events-none" : ""}`}>
        {doc ? (
          <Suspense fallback={<div className="h-full flex items-center justify-center text-[12px] text-on-surface-variant">Loading whiteboard…</div>}>
            <WhiteboardCanvas doc={doc} awareness={awareness} readOnly={readOnly} onJumpReady={handleJumpReady} />
          </Suspense>
        ) : (
          <div className="h-full flex items-center justify-center text-[12px] text-on-surface-variant">Connecting to the workspace…</div>
        )}
      </div>

      {!isMaximized && (
        <div
          aria-hidden="true"
          className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize z-10"
          onPointerDown={(event) => startPointerGesture(event, "resize")}
        >
          <Icon name="drag_handle" size={14} className="absolute right-0 bottom-0 rotate-[-45deg] text-on-surface-variant/70" />
        </div>
      )}
    </div>
  );
}
