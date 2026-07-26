import type { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { encodeAwarenessUpdate } from "y-protocols/awareness";
import {
  SOCKET_EVENTS,
  type MemberRole,
  type ParticipantIdentityType,
  type RoomJoinErrorPayload,
  type RoomJoinPayload,
  type RoomJoinedPayload,
  type RoomParticipantLeftPayload,
} from "@difflane/shared-types";
import type { RoomRegistry } from "../rooms/RoomRegistry.js";
import type { ConnectionAwarenessTracker } from "./ConnectionAwarenessTracker.js";
import { verifyAccessTokenClaims } from "../auth/authService.js";
import { identityStore } from "../db/index.js";
import { ensureWorkspace } from "../workspaces/workspaceService.js";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";

async function resolveJoinIdentity(
  payload: RoomJoinPayload,
): Promise<{ identityId: string; identityType: ParticipantIdentityType; displayName: string; initials: string }> {
  const fallbackDisplayName = payload.displayName.trim() || "Guest";
  const fallbackInitials = payload.initials.trim() || fallbackDisplayName.slice(0, 2).toUpperCase();

  if (payload.accessToken) {
    const claims = verifyAccessTokenClaims(payload.accessToken);
    if (claims) {
      const user = await identityStore.findUserById(claims.sub);
      if (user) {
        return { identityId: user.id, identityType: "user", displayName: fallbackDisplayName, initials: fallbackInitials };
      }
    }
  }

  if (payload.guestId) {
    const guest = await identityStore.findGuestSession(payload.guestId);
    if (guest) {
      await identityStore.touchGuestSession(guest.id);
      return { identityId: guest.id, identityType: "guest", displayName: fallbackDisplayName, initials: fallbackInitials };
    }
  }

  const guest = await identityStore.createGuestSession(fallbackDisplayName);
  return { identityId: guest.id, identityType: "guest", displayName: fallbackDisplayName, initials: fallbackInitials };
}

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  registry: RoomRegistry,
  awarenessTracker: ConnectionAwarenessTracker,
  lifecycleManager: WorkspaceLifecycleManager,
): void {
  socket.on(SOCKET_EVENTS.ROOM_JOIN, (payload: RoomJoinPayload, ack?: (response: RoomJoinedPayload | RoomJoinErrorPayload) => void) => {
    void (async () => {
      try {
        const identity = await resolveJoinIdentity(payload);
        const { workspace, role } = await ensureWorkspace(
          { type: identity.identityType, id: identity.identityId },
          payload.roomCode,
          payload.roomCode,
        );

        const { room, created } = registry.getOrCreateRoomByCode(payload.roomCode, workspace.id);
        if (created) {
          await lifecycleManager.hydrateRoomDoc(workspace.id, room.doc);
        }
        socket.data.roomId = room.roomId;

        const participant = registry.addParticipant(room.roomId, socket.id, {
          userId: identity.identityId,
          identityType: identity.identityType,
          displayName: identity.displayName,
          initials: identity.initials,
          role: role.toLowerCase() as MemberRole,
        });
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to join this workspace.";
        ack?.({ error: message });
      }
    })();
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
