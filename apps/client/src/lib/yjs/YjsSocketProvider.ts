import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import type { Socket } from "socket.io-client";
import { SOCKET_EVENTS, type AwarenessUpdatePayload, type DocUpdatePayload } from "@difflane/shared-types";

export type YjsSocketProviderStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface RejoinResult {
  docUpdate: Uint8Array;
  awarenessUpdate: Uint8Array | null;
}

interface YjsSocketProviderOptions {
  socket: Socket;
  roomId: string;
  doc: Y.Doc;
  awareness: Awareness;
  rejoin: () => Promise<RejoinResult>;
}

type StatusListener = (status: YjsSocketProviderStatus) => void;

function toUint8Array(data: Uint8Array | ArrayBuffer | number[]): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (Array.isArray(data)) {
    return Uint8Array.from(data);
  }
  return new Uint8Array(data);
}

export class YjsSocketProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  private readonly socket: Socket;
  private readonly roomId: string;
  private readonly rejoin: () => Promise<RejoinResult>;
  private status: YjsSocketProviderStatus = "connecting";
  private readonly statusListeners = new Set<StatusListener>();

  constructor(options: YjsSocketProviderOptions) {
    this.socket = options.socket;
    this.roomId = options.roomId;
    this.doc = options.doc;
    this.awareness = options.awareness;
    this.rejoin = options.rejoin;

    this.doc.on("update", this.handleLocalDocUpdate);
    this.awareness.on("update", this.handleLocalAwarenessChange);
    this.socket.on(SOCKET_EVENTS.DOC_UPDATE, this.handleRemoteDocUpdate);
    this.socket.on(SOCKET_EVENTS.AWARENESS_UPDATE, this.handleRemoteAwarenessUpdate);
    this.socket.on("disconnect", this.handleSocketDisconnect);
    this.socket.on("connect", this.handleSocketReconnect);
  }

  private readonly handleLocalDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) {
      return;
    }
    const payload: DocUpdatePayload = { roomId: this.roomId, update };
    this.socket.emit(SOCKET_EVENTS.DOC_UPDATE, payload);
  };

  private readonly handleLocalAwarenessChange = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) {
      return;
    }
    const changedClients = added.concat(updated, removed);
    if (changedClients.length === 0) {
      return;
    }
    const update = encodeAwarenessUpdate(this.awareness, changedClients);
    const payload: AwarenessUpdatePayload = { roomId: this.roomId, update };
    this.socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, payload);
  };

  private readonly handleRemoteDocUpdate = (payload: DocUpdatePayload) => {
    if (payload.roomId !== this.roomId) {
      return;
    }
    Y.applyUpdate(this.doc, toUint8Array(payload.update), this);
  };

  private readonly handleRemoteAwarenessUpdate = (payload: AwarenessUpdatePayload) => {
    if (payload.roomId !== this.roomId) {
      return;
    }
    applyAwarenessUpdate(this.awareness, toUint8Array(payload.update), this);
  };

  private readonly handleSocketDisconnect = () => {
    this.setStatus("reconnecting");
  };

  private readonly handleSocketReconnect = () => {
    if (this.status !== "reconnecting") {
      return;
    }
    this.rejoin()
      .then((result) => {
        Y.applyUpdate(this.doc, toUint8Array(result.docUpdate), this);
        if (result.awarenessUpdate) {
          applyAwarenessUpdate(this.awareness, toUint8Array(result.awarenessUpdate), this);
        }
        const localState = this.awareness.getLocalState();
        if (localState) {
          this.awareness.setLocalState(localState);
        }
        this.setStatus("connected");
      })
      .catch(() => {
        this.setStatus("reconnecting");
      });
  };

  applyInitialState(docUpdate: Uint8Array, awarenessUpdate: Uint8Array | null): void {
    Y.applyUpdate(this.doc, toUint8Array(docUpdate), this);
    if (awarenessUpdate) {
      applyAwarenessUpdate(this.awareness, toUint8Array(awarenessUpdate), this);
    }
    this.setStatus("connected");
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): YjsSocketProviderStatus {
    return this.status;
  }

  private setStatus(status: YjsSocketProviderStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  destroy(): void {
    this.doc.off("update", this.handleLocalDocUpdate);
    this.awareness.off("update", this.handleLocalAwarenessChange);
    this.socket.off(SOCKET_EVENTS.DOC_UPDATE, this.handleRemoteDocUpdate);
    this.socket.off(SOCKET_EVENTS.AWARENESS_UPDATE, this.handleRemoteAwarenessUpdate);
    this.socket.off("disconnect", this.handleSocketDisconnect);
    this.socket.off("connect", this.handleSocketReconnect);
    removeAwarenessStates(this.awareness, [this.doc.clientID], "provider-destroyed");
    this.setStatus("disconnected");
  }
}
