import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import {
  HEARTBEAT_MIN_INTERVAL_MS,
  PRESENCE_TICK_MS,
  TYPING_CLEAR_MS,
  buildLocalAwarenessState,
  readRemoteCollaborators,
  type LocalIdentity,
} from "../services/PresenceService";

const ACTIVITY_EVENT_OPTIONS: AddEventListenerOptions = { passive: true };

export function usePresence(awareness: Awareness | null, identity: LocalIdentity) {
  const [awarenessVersion, setAwarenessVersion] = useState(0);
  const [tick, setTick] = useState(0);

  const localRef = useRef({
    activeFileId: null as string | null,
    isTyping: false,
    lastEditedAt: null as string | null,
    lastActiveAt: new Date().toISOString(),
  });
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatAtRef = useRef(0);

  useEffect(() => {
    if (!awareness) {
      setAwarenessVersion((value) => value + 1);
      return;
    }
    const handler = () => setAwarenessVersion((value) => value + 1);
    awareness.on("change", handler);
    handler();
    return () => {
      awareness.off("change", handler);
      awareness.setLocalState(null);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [awareness]);

  useEffect(() => {
    if (!awareness) {
      return;
    }
    awareness.setLocalState(buildLocalAwarenessState(identity, localRef.current));
  }, [awareness, identity]);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), PRESENCE_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const markActive = useCallback(() => {
    const now = Date.now();
    if (now - lastHeartbeatAtRef.current < HEARTBEAT_MIN_INTERVAL_MS) {
      return;
    }
    lastHeartbeatAtRef.current = now;
    localRef.current.lastActiveAt = new Date(now).toISOString();
    awareness?.setLocalStateField("lastActiveAt", localRef.current.lastActiveAt);
  }, [awareness]);

  useEffect(() => {
    if (!awareness) {
      return;
    }
    const handleActivity = () => markActive();
    window.addEventListener("mousemove", handleActivity, ACTIVITY_EVENT_OPTIONS);
    window.addEventListener("keydown", handleActivity, ACTIVITY_EVENT_OPTIONS);
    window.addEventListener("mousedown", handleActivity, ACTIVITY_EVENT_OPTIONS);
    window.addEventListener("scroll", handleActivity, ACTIVITY_EVENT_OPTIONS);
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [awareness, markActive]);

  const setActiveFileId = useCallback(
    (activeFileId: string | null) => {
      localRef.current.activeFileId = activeFileId;
      localRef.current.lastActiveAt = new Date().toISOString();
      if (!awareness) {
        return;
      }
      awareness.setLocalStateField("activeFileId", activeFileId);
      awareness.setLocalStateField("lastActiveAt", localRef.current.lastActiveAt);
    },
    [awareness],
  );

  const markTyping = useCallback(() => {
    const nowIso = new Date().toISOString();
    localRef.current.lastActiveAt = nowIso;
    localRef.current.lastEditedAt = nowIso;
    lastHeartbeatAtRef.current = Date.now();

    if (!awareness) {
      return;
    }

    if (!localRef.current.isTyping) {
      localRef.current.isTyping = true;
      awareness.setLocalStateField("isTyping", true);
    }
    awareness.setLocalStateField("lastEditedAt", nowIso);
    awareness.setLocalStateField("lastActiveAt", nowIso);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      localRef.current.isTyping = false;
      awareness.setLocalStateField("isTyping", false);
    }, TYPING_CLEAR_MS);
  }, [awareness]);

  const collaborators = useMemo(() => {
    if (!awareness) {
      return [];
    }
    return readRemoteCollaborators(awareness, Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awareness, awarenessVersion, tick]);

  return { collaborators, setActiveFileId, markTyping };
}
