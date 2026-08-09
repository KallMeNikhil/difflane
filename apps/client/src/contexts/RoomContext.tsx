import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type AttentionReceivedPayload,
  type RoomParticipant,
  type RoomRoleChangedPayload,
  type RoomMemberRemovedPayload,
  type WorkspacePersistedPayload,
  type WorkspacePersistenceFailedPayload,
} from "@difflane/shared-types";
import { RoomJoinError, connectSocket, disconnectSocket, joinRoom, leaveRoom, onParticipantJoined, onParticipantLeft } from "../services/SocketService";
import { useYjsDoc } from "../hooks/useYjsDoc";
import { usePresence } from "../hooks/usePresence";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useNotifications } from "../hooks/useNotifications";
import { getAccessToken } from "../lib/auth/tokenStore";
import * as AuthService from "../services/AuthService";
import type { RejoinResult } from "../lib/yjs/YjsSocketProvider";
import { RoomContext, type IncomingAttentionRequest, type RoomContextValue, type WorkspacePersistenceStatus } from "../hooks/useRoom";
import { ROUTES } from "../constants/routes";
import type { RoomJoinPayload, RoomJoinedPayload } from "@difflane/shared-types";

const PARTICIPANT_LEAVE_GRACE_MS = 4000;
const ATTENTION_COOLDOWN_MS = 10_000;
const ATTENTION_TOAST_DURATION_MS = 8000;

async function joinRoomWithFreshToken(
  socket: Socket,
  buildPayload: () => RoomJoinPayload,
  isAuthenticated: boolean,
  ensureGuestSession: () => Promise<string>,
): Promise<RoomJoinedPayload> {
  try {
    return await joinRoom(socket, buildPayload());
  } catch (error) {
    if (isAuthenticated && error instanceof RoomJoinError && error.code === "expired_token") {
      await AuthService.refresh();
      return joinRoom(socket, buildPayload());
    }
    if (!isAuthenticated && error instanceof RoomJoinError && error.code === "guest_required") {
      const freshGuestId = await ensureGuestSession();
      return joinRoom(socket, { ...buildPayload(), guestId: freshGuestId });
    }
    throw error;
  }
}

interface JoinedConnection {
  socket: Socket;
  roomId: string;
  selfConnectionId: string;
  initialDocUpdate: Uint8Array;
  initialAwarenessUpdate: Uint8Array | null;
  selfColor: string;
  selfRole: RoomParticipant["role"];
}

interface RoomProviderProps {
  roomCode: string;
  children: ReactNode;
}

export function RoomProvider({ roomCode, children }: RoomProviderProps) {
  const identity = useCurrentUser();
  const { addNotification } = useNotifications();
  const [connection, setConnection] = useState<JoinedConnection | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const participantsRef = useRef<RoomParticipant[]>(participants);
  participantsRef.current = participants;
  const pendingLeftRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    if (identity.status === "loading") {
      return;
    }

    let cancelled = false;
    const socket = connectSocket();

    joinRoomWithFreshToken(
      socket,
      () => ({
        roomCode,
        displayName: identityRef.current.displayName,
        initials: identityRef.current.initials,
        accessToken: identity.isAuthenticated ? (getAccessToken() ?? undefined) : undefined,
        guestId: identity.isAuthenticated ? undefined : identity.guestId ?? undefined,
      }),
      identity.isAuthenticated,
      identity.ensureGuestSession,
    )
      .then((joined) => {
        if (cancelled) {
          disconnectSocket(socket);
          return;
        }
        const self = joined.room.participants.find((participant) => participant.connectionId === joined.selfConnectionId);
        setParticipants(joined.room.participants);
        setConnection({
          socket,
          roomId: joined.room.roomId,
          selfConnectionId: joined.selfConnectionId,
          initialDocUpdate: joined.docUpdate,
          initialAwarenessUpdate: joined.awarenessUpdate,
          selfColor: self?.color ?? "#b4c5ff",
          selfRole: self?.role ?? "editor",
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to join the room.");
          disconnectSocket(socket);
        }
      });

    return () => {
      cancelled = true;
      leaveRoom(socket);
      disconnectSocket(socket);
    };
  }, [roomCode, identity.status, identity.isAuthenticated, identity.guestId, identity.ensureGuestSession]);

  useEffect(() => {
    if (!connection) {
      return;
    }
    const pendingLeft = pendingLeftRef.current;
    const offJoined = onParticipantJoined(connection.socket, (participant) => {
      setParticipants((prev) => [...prev.filter((existing) => existing.connectionId !== participant.connectionId), participant]);
      const pendingTimeout = pendingLeft.get(participant.userId);
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        pendingLeft.delete(participant.userId);
        addNotification({
          category: "system",
          icon: "sync",
          tone: "success",
          actorName: participant.displayName,
          actorInitials: participant.initials,
          message: "reconnected",
          roomCode,
        });
      } else {
        addNotification({
          category: "system",
          icon: "person_add",
          tone: "success",
          actorName: participant.displayName,
          actorInitials: participant.initials,
          message: "joined the workspace",
          roomCode,
        });
      }
    });
    const offLeft = onParticipantLeft(connection.socket, ({ connectionId }) => {
      const leaving = participantsRef.current.find((participant) => participant.connectionId === connectionId);
      setParticipants((prev) => prev.filter((participant) => participant.connectionId !== connectionId));
      if (!leaving) {
        return;
      }
      const timeout = setTimeout(() => {
        pendingLeft.delete(leaving.userId);
        addNotification({
          category: "system",
          icon: "person_remove",
          tone: "accent",
          actorName: leaving.displayName,
          actorInitials: leaving.initials,
          message: "left the workspace",
          roomCode,
        });
      }, PARTICIPANT_LEAVE_GRACE_MS);
      pendingLeft.set(leaving.userId, timeout);
    });
    return () => {
      offJoined();
      offLeft();
      pendingLeft.forEach((timeout) => clearTimeout(timeout));
      pendingLeft.clear();
    };
  }, [connection, addNotification, roomCode]);

  if (!connection) {
    const value: RoomContextValue = {
      status: errorMessage ? "error" : "joining",
      errorMessage,
      roomCode,
      connectionStatus: null,
      participants,
      collaborators: [],
      selfRole: "viewer",
      selfConnectionId: null,
      doc: null,
      awareness: null,
      setActiveFileId: () => {},
      markTyping: () => {},
      persistenceStatus: "pending",
      lastPersistedAt: null,
      persistenceErrorMessage: null,
      followedUserId: null,
      followUser: () => {},
      unfollowUser: () => {},
      requestAttention: () => {},
      attentionCooldownIds: [],
      incomingAttention: null,
      dismissIncomingAttention: () => {},
    };
    return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
  }

  return (
    <ConnectedRoom roomCode={roomCode} connection={connection} participants={participants} setParticipants={setParticipants}>
      {children}
    </ConnectedRoom>
  );
}

function ConnectedRoom({
  roomCode,
  connection,
  participants,
  setParticipants,
  children,
}: {
  roomCode: string;
  connection: JoinedConnection;
  participants: RoomParticipant[];
  setParticipants: Dispatch<SetStateAction<RoomParticipant[]>>;
  children: ReactNode;
}) {
  const identity = useCurrentUser();
  const { addNotification } = useNotifications();
  const [selfColor, setSelfColor] = useState(connection.selfColor);
  const [selfRole, setSelfRole] = useState(connection.selfRole);
  const rejoin = useCallback(async (): Promise<RejoinResult> => {
    const joined = await joinRoomWithFreshToken(
      connection.socket,
      () => ({
        roomCode,
        displayName: identity.displayName,
        initials: identity.initials,
        accessToken: identity.isAuthenticated ? (getAccessToken() ?? undefined) : undefined,
        guestId: identity.isAuthenticated ? undefined : identity.guestId ?? undefined,
      }),
      identity.isAuthenticated,
      identity.ensureGuestSession,
    );
    setParticipants(joined.room.participants);
    const self = joined.room.participants.find((participant) => participant.connectionId === joined.selfConnectionId);
    if (self) {
      setSelfColor(self.color);
      setSelfRole(self.role);
    }
    return { docUpdate: joined.docUpdate, awarenessUpdate: joined.awarenessUpdate };
  }, [connection.socket, roomCode, identity.displayName, identity.initials, identity.isAuthenticated, identity.guestId, identity.ensureGuestSession, setParticipants]);
  const { doc, awareness, status } = useYjsDoc({
    socket: connection.socket,
    roomId: connection.roomId,
    initialDocUpdate: connection.initialDocUpdate,
    initialAwarenessUpdate: connection.initialAwarenessUpdate,
    rejoin,
  });

  const [persistenceStatus, setPersistenceStatus] = useState<WorkspacePersistenceStatus>("pending");
  const [lastPersistedAt, setLastPersistedAt] = useState<string | null>(null);
  const [persistenceErrorMessage, setPersistenceErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket = connection.socket;

    function handlePersisted(payload: WorkspacePersistedPayload) {
      if (payload.roomId !== connection.roomId) {
        return;
      }
      setPersistenceStatus("saved");
      setLastPersistedAt(payload.persistedAt);
      setPersistenceErrorMessage(null);
    }

    function handleFailed(payload: WorkspacePersistenceFailedPayload) {
      if (payload.roomId !== connection.roomId) {
        return;
      }
      setPersistenceStatus("failed");
      setPersistenceErrorMessage(payload.message);
    }

    function handleRestored(payload: { roomId: string }) {
      if (payload.roomId !== connection.roomId) {
        return;
      }
      window.location.reload();
    }

    function handleMemberRemoved(payload: RoomMemberRemovedPayload) {
      if (payload.roomId !== connection.roomId || payload.connectionId !== connection.selfConnectionId) {
        return;
      }
      addNotification({
        category: "workspace",
        icon: "person_remove",
        tone: "warning",
        message:
          payload.reason === "removed"
            ? "You were removed from this workspace by the owner."
            : "You have left this workspace.",
        roomCode,
      });
      window.location.assign(ROUTES.dashboard);
    }

    function handleRoleChanged(payload: RoomRoleChangedPayload) {
      if (payload.roomId !== connection.roomId) {
        return;
      }
      if (payload.connectionId === connection.selfConnectionId) {
        setSelfRole(payload.role);
        addNotification({
          category: "workspace",
          icon: payload.role === "viewer" ? "visibility" : "edit",
          tone: payload.role === "viewer" ? "warning" : "success",
          message:
            payload.role === "viewer"
              ? "You no longer have edit permission. Your role is now Viewer."
              : `You can now edit this workspace. Your role is now ${payload.role === "owner" ? "Owner" : "Editor"}.`,
          roomCode,
        });
      }
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.connectionId === payload.connectionId ? { ...participant, role: payload.role } : participant,
        ),
      );
    }

    socket.on(SOCKET_EVENTS.WORKSPACE_PERSISTED, handlePersisted);
    socket.on(SOCKET_EVENTS.WORKSPACE_PERSISTENCE_FAILED, handleFailed);
    socket.on(SOCKET_EVENTS.WORKSPACE_RESTORED, handleRestored);
    socket.on(SOCKET_EVENTS.ROOM_ROLE_CHANGED, handleRoleChanged);
    socket.on(SOCKET_EVENTS.ROOM_MEMBER_REMOVED, handleMemberRemoved);
    return () => {
      socket.off(SOCKET_EVENTS.WORKSPACE_PERSISTED, handlePersisted);
      socket.off(SOCKET_EVENTS.WORKSPACE_PERSISTENCE_FAILED, handleFailed);
      socket.off(SOCKET_EVENTS.WORKSPACE_RESTORED, handleRestored);
      socket.off(SOCKET_EVENTS.ROOM_ROLE_CHANGED, handleRoleChanged);
      socket.off(SOCKET_EVENTS.ROOM_MEMBER_REMOVED, handleMemberRemoved);
    };
  }, [connection.socket, connection.roomId, connection.selfConnectionId, setParticipants, addNotification, roomCode]);

  const localIdentity = useMemo(
    () => ({
      userId: identity.userId,
      identityType: (identity.isAuthenticated ? "user" : "guest") as "user" | "guest",
      displayName: identity.displayName,
      initials: identity.initials,
      color: selfColor,
      role: selfRole,
    }),
    [identity.userId, identity.isAuthenticated, identity.displayName, identity.initials, selfColor, selfRole],
  );
  const { collaborators, setActiveFileId, markTyping } = usePresence(awareness, localIdentity);

  const [followedUserId, setFollowedUserId] = useState<string | null>(null);
  const followUser = useCallback((userId: string) => setFollowedUserId(userId), []);
  const unfollowUser = useCallback(() => setFollowedUserId(null), []);

  useEffect(() => {
    if (followedUserId && !collaborators.some((collaborator) => collaborator.id === followedUserId)) {
      setFollowedUserId(null);
    }
  }, [followedUserId, collaborators]);

  const attentionCooldownRef = useRef(new Map<string, number>());
  const attentionCooldownTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [attentionCooldownIds, setAttentionCooldownIds] = useState<string[]>([]);

  const clearAttentionCooldown = useCallback((targetConnectionId: string) => {
    attentionCooldownRef.current.delete(targetConnectionId);
    attentionCooldownTimeoutsRef.current.delete(targetConnectionId);
    setAttentionCooldownIds(Array.from(attentionCooldownRef.current.keys()));
  }, []);

  useEffect(() => {
    const timeouts = attentionCooldownTimeoutsRef.current;
    return () => {
      for (const timeoutId of timeouts.values()) {
        clearTimeout(timeoutId);
      }
      timeouts.clear();
    };
  }, []);

  const requestAttention = useCallback(
    (targetConnectionId: string, context: { fileId: string | null; fileLabel: string | null }) => {
      const now = Date.now();
      const lastSentAt = attentionCooldownRef.current.get(targetConnectionId) ?? 0;
      if (now - lastSentAt < ATTENTION_COOLDOWN_MS) {
        return;
      }
      attentionCooldownRef.current.set(targetConnectionId, now);
      setAttentionCooldownIds(Array.from(attentionCooldownRef.current.keys()));

      const existingTimeout = attentionCooldownTimeoutsRef.current.get(targetConnectionId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      attentionCooldownTimeoutsRef.current.set(
        targetConnectionId,
        setTimeout(() => clearAttentionCooldown(targetConnectionId), ATTENTION_COOLDOWN_MS),
      );

      connection.socket.emit(SOCKET_EVENTS.ATTENTION_REQUEST, {
        roomId: connection.roomId,
        targetConnectionId,
        fileId: context.fileId,
        fileLabel: context.fileLabel,
      });
    },
    [connection.socket, connection.roomId, clearAttentionCooldown],
  );

  const [incomingAttention, setIncomingAttention] = useState<IncomingAttentionRequest | null>(null);
  const incomingAttentionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissIncomingAttention = useCallback(() => {
    setIncomingAttention(null);
    if (incomingAttentionTimeoutRef.current) {
      clearTimeout(incomingAttentionTimeoutRef.current);
      incomingAttentionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const socket = connection.socket;
    function handleAttentionReceived(payload: AttentionReceivedPayload) {
      setIncomingAttention({
        id: `${payload.fromConnectionId}-${payload.receivedAt}`,
        fromConnectionId: payload.fromConnectionId,
        fromUserId: payload.fromUserId,
        fromDisplayName: payload.fromDisplayName,
        fromInitials: payload.fromInitials,
        fileId: payload.fileId,
        fileLabel: payload.fileLabel,
        receivedAt: payload.receivedAt,
        expiresAt: new Date(Date.now() + ATTENTION_TOAST_DURATION_MS).toISOString(),
      });
      if (incomingAttentionTimeoutRef.current) {
        clearTimeout(incomingAttentionTimeoutRef.current);
      }
      incomingAttentionTimeoutRef.current = setTimeout(() => setIncomingAttention(null), ATTENTION_TOAST_DURATION_MS);
    }
    socket.on(SOCKET_EVENTS.ATTENTION_RECEIVED, handleAttentionReceived);
    return () => {
      socket.off(SOCKET_EVENTS.ATTENTION_RECEIVED, handleAttentionReceived);
      if (incomingAttentionTimeoutRef.current) {
        clearTimeout(incomingAttentionTimeoutRef.current);
        incomingAttentionTimeoutRef.current = null;
      }
    };
  }, [connection.socket]);

  const value = useMemo<RoomContextValue>(
    () => ({
      status: "ready",
      errorMessage: null,
      roomCode,
      connectionStatus: status,
      participants,
      collaborators,
      selfRole,
      selfConnectionId: connection.selfConnectionId,
      doc,
      awareness,
      setActiveFileId,
      markTyping,
      persistenceStatus,
      lastPersistedAt,
      persistenceErrorMessage,
      followedUserId,
      followUser,
      unfollowUser,
      requestAttention,
      attentionCooldownIds,
      incomingAttention,
      dismissIncomingAttention,
    }),
    [
      roomCode,
      status,
      participants,
      collaborators,
      selfRole,
      connection.selfConnectionId,
      doc,
      awareness,
      setActiveFileId,
      markTyping,
      persistenceStatus,
      lastPersistedAt,
      persistenceErrorMessage,
      followedUserId,
      followUser,
      unfollowUser,
      requestAttention,
      attentionCooldownIds,
      incomingAttention,
      dismissIncomingAttention,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
