import type { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { encodeAwarenessUpdate } from "y-protocols/awareness";
import {
  SOCKET_EVENTS,
  type RoomJoinPayload,
  type RoomJoinedPayload,
  type RoomParticipantLeftPayload,
} from "@difflane/shared-types";
import type { RoomRegistry } from "../rooms/RoomRegistry.js";
import type { ConnectionAwarenessTracker } from "./ConnectionAwarenessTracker.js";

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  registry: RoomRegistry,
  awarenessTracker: ConnectionAwarenessTracker,
): void {
  socket.on(SOCKET_EVENTS.ROOM_JOIN, (payload: RoomJoinPayload, ack?: (response: RoomJoinedPayload) => void) => {
    const displayName = payload.displayName.trim() || "Guest";
    const initials = payload.initials.trim() || displayName.slice(0, 2).toUpperCase();

    const room = registry.getOrCreateRoomByCode(payload.roomCode);
    socket.data.roomId = room.roomId;

    const participant = registry.addParticipant(room.roomId, socket.id, displayName, initials);
    void socket.join(room.roomId);

    const existingClientIds = Array.from(room.awareness.getStates().keys());

    const response: RoomJoinedPayload = {
      room: registry.getSnapshot(room.roomId)!,
      selfConnectionId: socket.id,
      docUpdate: Y.encodeStateAsUpdate(room.doc),
      awarenessUpdate: existingClientIds.length > 0 ? encodeAwarenessUpdate(room.awareness, existingClientIds) : null,
    };

    ack?.(response);
    socket.to(room.roomId).emit(SOCKET_EVENTS.ROOM_PARTICIPANT_JOINED, { participant });
  });

  socket.on(SOCKET_EVENTS.ROOM_LEAVE, () => {
    leaveCurrentRoom(io, socket, registry, awarenessTracker);
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(io, socket, registry, awarenessTracker);
  });
}

function leaveCurrentRoom(
  io: Server,
  socket: Socket,
  registry: RoomRegistry,
  awarenessTracker: ConnectionAwarenessTracker,
): void {
  const roomId: string | undefined = socket.data.roomId;
  if (!roomId) {
    return;
  }
  const clientIds = awarenessTracker.consume(socket.id);
  registry.removeParticipant(roomId, socket.id, clientIds);
  socket.data.roomId = undefined;
  socket.leave(roomId);

  const payload: RoomParticipantLeftPayload = { connectionId: socket.id };
  io.to(roomId).emit(SOCKET_EVENTS.ROOM_PARTICIPANT_LEFT, payload);
}
