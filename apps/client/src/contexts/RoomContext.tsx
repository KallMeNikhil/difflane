import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type RoomParticipant,
  type RoomRoleChangedPayload,
  type WorkspacePersistedPayload,
  type WorkspacePersistenceFailedPayload,
} from "@difflane/shared-types";
import { RoomJoinError, connectSocket, disconnectSocket, joinRoom, leaveRoom, onParticipantJoined, onParticipantLeft } from "../services/SocketService";
import { useYjsDoc } from "../hooks/useYjsDoc";
import { usePresence } from "../hooks/usePresence";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { getAccessToken } from "../lib/auth/tokenStore";
import * as AuthService from "../services/AuthService";
import type { RejoinResult } from "../lib/yjs/YjsSocketProvider";
import { RoomContext, type RoomContextValue, type WorkspacePersistenceStatus } from "../hooks/useRoom";
import type { RoomJoinPayload, RoomJoinedPayload } from "@difflane/shared-types";

async function joinRoomWithFreshToken(
  socket: Socket,
  buildPayload: () => RoomJoinPayload,
  isAuthenticated: boolean,
): Promise<RoomJoinedPayload> {
  try {
    return await joinRoom(socket, buildPayload());
  } catch (error) {
    if (isAuthenticated && error instanceof RoomJoinError && error.code === "expired_token") {
      await AuthService.refresh();
      return joinRoom(socket, buildPayload());
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
  const [connection, setConnection] = useState<JoinedConnection | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Guest Lifecycle Fix / OAuth Runtime Fix: wait for identity resolution
    // (guest or authenticated) before opening the socket and joining the
    // room. Joining while identity is still "loading" causes a race where
    // the server resolves an incomplete/incorrect identity.
    if (identity.status === "loading") {
      return;
    }

    let cancelled = false;
    const socket = connectSocket();

    joinRoomWithFreshToken(
      socket,
      () => ({
        roomCode,
        displayName: identity.displayName,
        initials: identity.initials,
        accessToken: identity.isAuthenticated ? (getAccessToken() ?? undefined) : undefined,
        guestId: identity.isAuthenticated ? undefined : identity.guestId ?? undefined,
      }),
      identity.isAuthenticated,
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
  }, [roomCode, identity.status, identity.displayName, identity.initials, identity.isAuthenticated, identity.guestId]);

  useEffect(() => {
    if (!connection) {
      return;
    }
    const offJoined = onParticipantJoined(connection.socket, (participant) => {
      setParticipants((prev) => [...prev.filter((existing) => existing.connectionId !== participant.connectionId), participant]);
    });
    const offLeft = onParticipantLeft(connection.socket, ({ connectionId }) => {
      setParticipants((prev) => prev.filter((participant) => participant.connectionId !== connectionId));
    });
    return () => {
      offJoined();
      offLeft();
    };
  }, [connection]);

  if (!connection) {
    const value: RoomContextValue = {
      status: errorMessage ? "error" : "joining",
      errorMessage,
      roomCode,
      connectionStatus: null,
      participants,
      collaborators: [],
      selfRole: "viewer",
      doc: null,
      awareness: null,
      setActiveFileId: () => {},
      persistenceStatus: "pending",
      lastPersistedAt: null,
      persistenceErrorMessage: null,
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
    );
    setParticipants(joined.room.participants);
    const self = joined.room.participants.find((participant) => participant.connectionId === joined.selfConnectionId);
    if (self) {
      setSelfColor(self.color);
      setSelfRole(self.role);
    }
    return { docUpdate: joined.docUpdate, awarenessUpdate: joined.awarenessUpdate };
  }, [connection.socket, roomCode, identity.displayName, identity.initials, identity.isAuthenticated, identity.guestId, setParticipants]);
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

    function handleRoleChanged(payload: RoomRoleChangedPayload) {
      if (payload.roomId !== connection.roomId) {
        return;
      }
      if (payload.connectionId === connection.selfConnectionId) {
        setSelfRole(payload.role);
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
    return () => {
      socket.off(SOCKET_EVENTS.WORKSPACE_PERSISTED, handlePersisted);
      socket.off(SOCKET_EVENTS.WORKSPACE_PERSISTENCE_FAILED, handleFailed);
      socket.off(SOCKET_EVENTS.WORKSPACE_RESTORED, handleRestored);
      socket.off(SOCKET_EVENTS.ROOM_ROLE_CHANGED, handleRoleChanged);
    };
  }, [connection.socket, connection.roomId, connection.selfConnectionId, setParticipants]);

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
  const { collaborators, setActiveFileId } = usePresence(awareness, localIdentity);

  const value = useMemo<RoomContextValue>(
    () => ({
      status: "ready",
      errorMessage: null,
      roomCode,
      connectionStatus: status,
      participants,
      collaborators,
      selfRole,
      doc,
      awareness,
      setActiveFileId,
      persistenceStatus,
      lastPersistedAt,
      persistenceErrorMessage,
    }),
    [
      roomCode,
      status,
      participants,
      collaborators,
      selfRole,
      doc,
      awareness,
      setActiveFileId,
      persistenceStatus,
      lastPersistedAt,
      persistenceErrorMessage,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
