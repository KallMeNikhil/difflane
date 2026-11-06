import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { createRoomDoc } from "../services/CollaborationService";
import { YjsSocketProvider, type RejoinResult, type YjsSocketProviderStatus } from "../lib/yjs/YjsSocketProvider";

interface UseYjsDocOptions {
  socket: Socket;
  roomId: string;
  initialDocUpdate: Uint8Array;
  initialAwarenessUpdate: Uint8Array | null;
  rejoin: () => Promise<RejoinResult>;
}

interface YjsDocState {
  doc: Y.Doc;
  awareness: Awareness;
}

export function useYjsDoc({ socket, roomId, initialDocUpdate, initialAwarenessUpdate, rejoin }: UseYjsDocOptions) {
  const [docState, setDocState] = useState<YjsDocState | null>(null);
  const [status, setStatus] = useState<YjsSocketProviderStatus>("connecting");
  const latestRef = useRef({ initialDocUpdate, initialAwarenessUpdate, rejoin });
  latestRef.current = { initialDocUpdate, initialAwarenessUpdate, rejoin };

  useEffect(() => {
    const { doc, awareness } = createRoomDoc();
    const provider = new YjsSocketProvider({ socket, roomId, doc, awareness, rejoin: () => latestRef.current.rejoin() });
    const unsubscribe = provider.onStatusChange(setStatus);

    provider.applyInitialState(latestRef.current.initialDocUpdate, latestRef.current.initialAwarenessUpdate);
    setDocState({ doc, awareness });

    return () => {
      unsubscribe();
      provider.destroy();
      doc.destroy();
      setDocState(null);
      setStatus("connecting");
    };
  }, [socket, roomId]);

  return { doc: docState?.doc ?? null, awareness: docState?.awareness ?? null, status };
}
