import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { CaptureUpdateAction, Excalidraw, MainMenu, getCommonBounds, reconcileElements } from "@excalidraw/excalidraw";
import type { NonDeletedExcalidrawElement, OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type { BinaryFileData, Collaborator, ExcalidrawImperativeAPI, SocketId } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { useWhiteboard, type WhiteboardSceneApi } from "../../hooks/useWhiteboard";
import { formatRelativeTimeLabel } from "../../services/SessionHistoryService";
import {
  readLocalAuthor,
  readWhiteboardPeers,
  WHITEBOARD_OPEN_FIELD,
  WHITEBOARD_POINTER_FIELD,
  type WhiteboardPointerState,
} from "../../lib/whiteboard/whiteboardPresence";
import { readElementAuthorship, type ElementAuthorship, type SyncedElement, type SyncedFile } from "../../lib/whiteboard/whiteboardSync";

export type WhiteboardJumpHandler = (clientId: number) => boolean;

interface WhiteboardCanvasProps {
  doc: Y.Doc;
  awareness: Awareness | null;
  readOnly: boolean;
  onJumpReady?: (jump: WhiteboardJumpHandler | null) => void;
}

interface HoverCard {
  left: number;
  top: number;
  authorship: ElementAuthorship;
}

const POINTER_THROTTLE_MS = 50;
const HIT_TOLERANCE_PX = 6;
const HOVER_CARD_WIDTH = 240;

function findElementAt(elements: readonly NonDeletedExcalidrawElement[], x: number, y: number, tolerance: number): NonDeletedExcalidrawElement | null {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    const [minX, minY, maxX, maxY] = getCommonBounds([element]);
    if (x >= minX - tolerance && x <= maxX + tolerance && y >= minY - tolerance && y <= maxY + tolerance) {
      return element;
    }
  }
  return null;
}

function relativeTime(timestamp: number): string {
  return formatRelativeTimeLabel(new Date(timestamp).toISOString());
}

export default function WhiteboardCanvas({ doc, awareness, readOnly, onJumpReady }: WhiteboardCanvasProps) {
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
  const lastPointerSentRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clientPointRef = useRef<{ x: number; y: number } | null>(null);
  const selfUserId = useMemo(() => readLocalAuthor(awareness?.getLocalState())?.userId ?? null, [awareness]);

  const sceneApi = useMemo<WhiteboardSceneApi | null>(() => {
    if (!excalidrawApi) {
      return null;
    }
    return {
      getSceneElementsIncludingDeleted: () => excalidrawApi.getSceneElementsIncludingDeleted() as unknown as readonly SyncedElement[],
      getFiles: () => excalidrawApi.getFiles() as unknown as Record<string, SyncedFile>,
      addFiles: (files) => excalidrawApi.addFiles(files as unknown as BinaryFileData[]),
      applyRemoteElements: (remote) => {
        const reconciled = reconcileElements(
          excalidrawApi.getSceneElementsIncludingDeleted() as readonly OrderedExcalidrawElement[],
          remote as unknown as RemoteExcalidrawElement[],
          excalidrawApi.getAppState(),
        );
        excalidrawApi.updateScene({ elements: reconciled, captureUpdate: CaptureUpdateAction.NEVER });
      },
    };
  }, [excalidrawApi]);

  const getAuthor = useCallback(() => readLocalAuthor(awareness?.getLocalState()), [awareness]);
  const { initialElements, initialFiles, handleLocalChange } = useWhiteboard(doc, sceneApi, readOnly, getAuthor);

  const [initialData] = useState(() => ({
    elements: initialElements as unknown as OrderedExcalidrawElement[],
    files: Object.fromEntries(initialFiles.map((file) => [file.id, file])) as unknown as Record<string, BinaryFileData>,
    scrollToContent: true,
  }));

  useEffect(() => {
    if (!awareness) {
      return;
    }
    awareness.setLocalStateField(WHITEBOARD_OPEN_FIELD, true);
    return () => {
      awareness.setLocalStateField(WHITEBOARD_POINTER_FIELD, null);
      awareness.setLocalStateField(WHITEBOARD_OPEN_FIELD, false);
    };
  }, [awareness]);

  useEffect(() => {
    if (!awareness || !excalidrawApi) {
      return;
    }
    const render = () => {
      const collaborators = new Map<SocketId, Collaborator>();
      for (const peer of readWhiteboardPeers(awareness.getStates(), awareness.clientID, selfUserId)) {
        if (!peer.pointer) continue;
        collaborators.set(String(peer.clientId) as SocketId, {
          id: peer.userId,
          username: peer.name,
          pointer: { x: peer.pointer.x, y: peer.pointer.y, tool: peer.pointer.tool ?? "pointer" },
          button: peer.pointer.button,
          selectedElementIds: peer.pointer.selectedElementIds,
          color: { background: peer.color, stroke: peer.color },
        });
      }
      excalidrawApi.updateScene({ collaborators, captureUpdate: CaptureUpdateAction.NEVER });
    };
    render();
    awareness.on("change", render);
    return () => awareness.off("change", render);
  }, [awareness, excalidrawApi, selfUserId]);

  useEffect(() => {
    if (!onJumpReady) {
      return;
    }
    if (!awareness || !excalidrawApi) {
      onJumpReady(null);
      return;
    }
    onJumpReady((clientId) => {
      const pointer = (awareness.getStates().get(clientId) as Record<string, unknown> | undefined)?.[WHITEBOARD_POINTER_FIELD] as
        | WhiteboardPointerState
        | null
        | undefined;
      if (!pointer) {
        return false;
      }
      const appState = excalidrawApi.getAppState();
      const zoom = appState.zoom.value;
      excalidrawApi.updateScene({
        appState: { scrollX: appState.width / 2 / zoom - pointer.x, scrollY: appState.height / 2 / zoom - pointer.y },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      return true;
    });
    return () => onJumpReady(null);
  }, [awareness, excalidrawApi, onJumpReady]);

  const updateHoverCard = useCallback(
    (sceneX: number, sceneY: number, button: "down" | "up") => {
      const container = containerRef.current;
      const clientPoint = clientPointRef.current;
      if (!excalidrawApi || !container || !clientPoint || button === "down") {
        setHoverCard(null);
        return;
      }
      const appState = excalidrawApi.getAppState();
      if (appState.activeTool.type !== "selection" && appState.activeTool.type !== "hand") {
        setHoverCard(null);
        return;
      }
      const element = findElementAt(excalidrawApi.getSceneElements(), sceneX, sceneY, HIT_TOLERANCE_PX / appState.zoom.value);
      const containerId = element && element.type === "text" ? element.containerId : null;
      const authorship = element ? (containerId && readElementAuthorship(doc, containerId)) || readElementAuthorship(doc, element.id) : undefined;
      if (!authorship) {
        setHoverCard(null);
        return;
      }
      const bounds = container.getBoundingClientRect();
      const left = Math.min(clientPoint.x - bounds.left + 14, bounds.width - HOVER_CARD_WIDTH - 8);
      const top = Math.min(clientPoint.y - bounds.top + 18, bounds.height - 64);
      setHoverCard({ left: Math.max(8, left), top: Math.max(8, top), authorship });
    },
    [doc, excalidrawApi],
  );

  const handlePointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number; tool: "pointer" | "laser" }; button: "down" | "up" }) => {
      if (!excalidrawApi) return;
      updateHoverCard(payload.pointer.x, payload.pointer.y, payload.button);
      if (!awareness) return;
      const now = Date.now();
      if (now - lastPointerSentRef.current < POINTER_THROTTLE_MS) return;
      lastPointerSentRef.current = now;
      const pointerState: WhiteboardPointerState = {
        x: payload.pointer.x,
        y: payload.pointer.y,
        tool: payload.pointer.tool,
        button: payload.button,
        selectedElementIds: excalidrawApi.getAppState().selectedElementIds as Record<string, true>,
      };
      awareness.setLocalStateField(WHITEBOARD_POINTER_FIELD, pointerState);
    },
    [awareness, excalidrawApi, updateHoverCard],
  );

  const describeAuthor = (userId: string, name: string) => (userId === selfUserId ? "you" : name);

  return (
    <div
      ref={containerRef}
      className="difflane-whiteboard relative h-full w-full"
      onPointerMove={(event) => {
        clientPointRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerLeave={() => {
        clientPointRef.current = null;
        setHoverCard(null);
        awareness?.setLocalStateField(WHITEBOARD_POINTER_FIELD, null);
      }}
    >
      <Excalidraw
        excalidrawAPI={setExcalidrawApi}
        initialData={initialData}
        theme="dark"
        isCollaborating
        viewModeEnabled={readOnly}
        onChange={(elements, _appState, files) =>
          handleLocalChange(elements as unknown as readonly SyncedElement[], files as unknown as Record<string, SyncedFile>)
        }
        onPointerUpdate={handlePointerUpdate}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.CommandPalette />
          <MainMenu.DefaultItems.Help />
          {!readOnly && <MainMenu.DefaultItems.ClearCanvas />}
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>

      {hoverCard && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 rounded-md border border-outline-variant bg-surface-container-highest/95 px-sm py-xs shadow-xl backdrop-blur-sm"
          style={{ left: hoverCard.left, top: hoverCard.top, maxWidth: HOVER_CARD_WIDTH }}
        >
          <div className="flex items-center gap-xs text-[11px] text-on-surface">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hoverCard.authorship.createdBy.color }} />
            <span className="truncate">
              Drawn by <span className="font-semibold">{describeAuthor(hoverCard.authorship.createdBy.userId, hoverCard.authorship.createdBy.name)}</span>
            </span>
            <span className="text-on-surface-variant flex-shrink-0">· {relativeTime(hoverCard.authorship.createdAt)}</span>
          </div>
          {(hoverCard.authorship.updatedBy.userId !== hoverCard.authorship.createdBy.userId ||
            hoverCard.authorship.updatedAt - hoverCard.authorship.createdAt > 60_000) && (
            <div className="mt-0.5 flex items-center gap-xs text-[11px] text-on-surface-variant">
              <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hoverCard.authorship.updatedBy.color }} />
              <span className="truncate">
                Edited by {describeAuthor(hoverCard.authorship.updatedBy.userId, hoverCard.authorship.updatedBy.name)} ·{" "}
                {relativeTime(hoverCard.authorship.updatedAt)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
