import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { TerminalExitPayload, TerminalSessionStatus } from "@difflane/shared-types";
import * as TerminalService from "../services/TerminalService";

export interface UseTerminalOptions {
  workspaceCode: string;
  accessToken: string | null;
  guestId: string | null;
  enabled: boolean;
}

export interface UseTerminalResult {
  status: TerminalSessionStatus;
  sessionId: string | null;
  errorMessage: string | null;
  exitInfo: TerminalExitPayload | null;
  sendInput: (data: string) => void;
  restart: () => void;
  onData: (listener: (data: string) => void) => () => void;
}

export function useTerminal({ workspaceCode, accessToken, guestId, enabled }: UseTerminalOptions): UseTerminalResult {
  const [status, setStatus] = useState<TerminalSessionStatus>("connecting");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exitInfo, setExitInfo] = useState<TerminalExitPayload | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const dataListenersRef = useRef(new Set<(data: string) => void>());
  const [restartToken, setRestartToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let disposed = false;
    setStatus("connecting");
    setErrorMessage(null);
    setExitInfo(null);
    setSessionId(null);

    const socket = TerminalService.connectTerminalSocket();
    socketRef.current = socket;

    const offReady = TerminalService.onTerminalReady(socket, (payload) => {
      if (disposed) return;
      setSessionId(payload.sessionId);
      setStatus("ready");
    });
    const offData = TerminalService.onTerminalData(socket, (payload) => {
      if (disposed) return;
      for (const listener of dataListenersRef.current) {
        listener(payload.data);
      }
    });
    const offExit = TerminalService.onTerminalExit(socket, (payload) => {
      if (disposed) return;
      setExitInfo(payload);
      setStatus("closed");
    });
    const offError = TerminalService.onTerminalError(socket, (payload) => {
      if (disposed) return;
      setErrorMessage(payload.message);
      setStatus("error");
    });

    const startSession = () => {
      TerminalService.createTerminalSession(socket, {
        workspaceCode,
        accessToken: accessToken ?? undefined,
        guestId: guestId ?? undefined,
        cols: 80,
        rows: 24,
      });
    };

    if (socket.connected) {
      startSession();
    } else {
      socket.once("connect", startSession);
    }

    return () => {
      disposed = true;
      offReady();
      offData();
      offExit();
      offError();
      if (sessionId) {
        TerminalService.closeTerminalSession(socket, sessionId);
      }
      TerminalService.disconnectTerminalSocket(socket);
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceCode, accessToken, guestId, enabled, restartToken]);

  const sendInput = useCallback((data: string) => {
    const socket = socketRef.current;
    if (socket && sessionId) {
      TerminalService.sendTerminalInput(socket, sessionId, data);
    }
  }, [sessionId]);

  const restart = useCallback(() => {
    setRestartToken((token) => token + 1);
  }, []);

  const onData = useCallback((listener: (data: string) => void) => {
    dataListenersRef.current.add(listener);
    return () => {
      dataListenersRef.current.delete(listener);
    };
  }, []);

  return { status, sessionId, errorMessage, exitInfo, sendInput, restart, onData };
}
