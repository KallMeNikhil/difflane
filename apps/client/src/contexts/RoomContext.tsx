import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import type { RoomParticipant } from "@difflane/shared-types";
import { connectSocket, disconnectSocket, joinRoom, leaveRoom, onParticipantJoined, onParticipantLeft } from "../services/SocketService";
import { useYjsDoc } from "../hooks/useYjsDoc";
import { usePresence } from "../hooks/usePresence";
import { useCurrentUser } from "../hooks/useCurrentUser";
import type { RejoinResult } from "../lib/yjs/YjsSocketProvider";
import { RoomContext, type RoomContextValue } from "../hooks/useRoom";

interface JoinedConnection {
  socket: Socket;
  roomId: string;
  selfConnectionId: string;
  initialDocUpdate: Uint8Array;
  initialAwarenessUpdate: Uint8Array | null;
  selfColor: string;
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
    let cancelled = false;
    const socket = connectSocket();

    joinRoom(socket, { roomCode, displayName: identity.displayName, initials: identity.initials })
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
  }, [roomCode, identity.displayName, identity.initials]);

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
      doc: null,
      awareness: null,
      setActiveFileId: () => {},
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
  setParticipants: (participants: RoomParticipant[]) => void;
  children: ReactNode;
}) {
  const identity = useCurrentUser();
  const rejoin = useCallback(async (): Promise<RejoinResult> => {
    const joined = await joinRoom(connection.socket, {
      roomCode,
      displayName: identity.displayName,
      initials: identity.initials,
    });
    setParticipants(joined.room.participants);
    return { docUpdate: joined.docUpdate, awarenessUpdate: joined.awarenessUpdate };
  }, [connection.socket, roomCode, identity.displayName, identity.initials, setParticipants]);
  const { doc, awareness, status } = useYjsDoc({
    socket: connection.socket,
    roomId: connection.roomId,
    initialDocUpdate: connection.initialDocUpdate,
    initialAwarenessUpdate: connection.initialAwarenessUpdate,
    rejoin,
  });
  const localIdentity = useMemo(
    () => ({ userId: identity.userId, displayName: identity.displayName, initials: identity.initials, color: connection.selfColor }),
    [identity.userId, identity.displayName, identity.initials, connection.selfColor],
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
      doc,
      awareness,
      setActiveFileId,
    }),
    [roomCode, status, participants, collaborators, doc, awareness, setActiveFileId],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
