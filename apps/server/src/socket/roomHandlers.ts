import type { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { parseCookie } from "cookie";
import { encodeAwarenessUpdate } from "y-protocols/awareness";
import {
  SOCKET_EVENTS,
  type MemberRole,
  type ParticipantIdentityType,
  type RoomJoinErrorPayload,
  type RoomJoinPayload,
  type RoomJoinedPayload,
  type RoomParticipant,
  type RoomParticipantLeftPayload,
} from "@difflane/shared-types";
import { toRoomId, type Room, type RoomRegistry } from "../rooms/RoomRegistry.js";
import type { ConnectionAwarenessTracker } from "./ConnectionAwarenessTracker.js";
import { env } from "../config/env.js";
import { verifyAccessTokenClaims } from "../auth/authService.js";
import { identityStore, workspaceStore } from "../db/index.js";
import { ensureWorkspace, isValidWorkspaceCode } from "../workspaces/workspaceService.js";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";

const DISPLAY_NAME_MAX_LENGTH = 60;
const INITIALS_MAX_LENGTH = 4;

class ExpiredJoinTokenError extends Error {
  constructor() {
    super("Your session has expired. Please refresh and try again.");
    this.name = "ExpiredJoinTokenError";
  }
}

class GuestIdentityRequiredError extends Error {
  constructor() {
    super("A guest session is required before joining a workspace.");
    this.name = "GuestIdentityRequiredError";
  }
}

function readGuestIdFromHandshake(socket: Socket): string | null {
  const rawCookie = socket.handshake.headers.cookie;
  if (!rawCookie) {
    return null;
  }
  const parsed = parseCookie(rawCookie);
  return parsed[env.auth.guestCookieName] ?? null;
}

async function resolveJoinIdentity(
  socket: Socket,
  payload: RoomJoinPayload,
): Promise<{ identityId: string; identityType: ParticipantIdentityType; displayName: string; initials: string }> {
  const fallbackDisplayName = payload.displayName.trim().slice(0, DISPLAY_NAME_MAX_LENGTH) || "Guest";
  const fallbackInitials = payload.initials.trim().slice(0, INITIALS_MAX_LENGTH) || fallbackDisplayName.slice(0, 2).toUpperCase();

  if (payload.accessToken) {
    const claims = verifyAccessTokenClaims(payload.accessToken);
    if (claims) {
      const user = await identityStore.findUserById(claims.sub);
      if (user) {
        return { identityId: user.id, identityType: "user", displayName: fallbackDisplayName, initials: fallbackInitials };
      }
    }
    throw new ExpiredJoinTokenError();
  }

  const cookieGuestId = readGuestIdFromHandshake(socket);
  if (cookieGuestId) {
    const guest = await identityStore.findGuestSession(cookieGuestId);
    if (guest) {
      await identityStore.touchGuestSession(guest.id);
      return { identityId: guest.id, identityType: "guest", displayName: fallbackDisplayName, initials: fallbackInitials };
    }
  }

  const payloadGuestId = typeof payload.guestId === "string" ? payload.guestId : null;
  if (payloadGuestId) {
    const guest = await identityStore.findGuestSession(payloadGuestId);
    if (guest) {
      await identityStore.touchGuestSession(guest.id);
      return { identityId: guest.id, identityType: "guest", displayName: fallbackDisplayName, initials: fallbackInitials };
    }
  }

  throw new GuestIdentityRequiredError();
}

interface JoinRateState {
  count: number;
  windowStart: number;
}

const joinRateBySocket = new Map<string, JoinRateState>();

function isRoomJoinRateLimited(socketId: string): boolean {
  const now = Date.now();
  const state = joinRateBySocket.get(socketId);
  if (!state || now - state.windowStart > env.socketRateLimit.windowMs) {
    joinRateBySocket.set(socketId, { count: 1, windowStart: now });
    return false;
  }
  state.count += 1;
  return state.count > env.socketRateLimit.roomJoinMax;
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
        if (isRoomJoinRateLimited(socket.id)) {
          ack?.({ error: "Too many join attempts. Please wait a moment and try again." });
          return;
        }
        if (typeof payload?.roomCode !== "string" || !isValidWorkspaceCode(payload.roomCode)) {
          ack?.({ error: "Invalid room code." });
          return;
        }
        const roomCode = payload.roomCode.trim().toUpperCase();

        if (socket.data.roomId && socket.data.roomId !== toRoomId(roomCode)) {
          leaveCurrentRoom(io, socket, registry, awarenessTracker);
        }

        const identity = await resolveJoinIdentity(socket, payload);
        const { workspace, role } = await ensureWorkspace({ type: identity.identityType, id: identity.identityId }, roomCode, roomCode);

        const { room, created } = registry.getOrCreateRoomByCode(roomCode, workspace.id);
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
        void recordParticipantJoined(workspace.id, room.roomCode, participant);
      } catch (error) {
        if (error instanceof ExpiredJoinTokenError) {
          ack?.({ error: error.message, code: "expired_token" });
          return;
        }
        if (error instanceof GuestIdentityRequiredError) {
          ack?.({ error: error.message, code: "guest_required" });
          return;
        }
        console.error("ROOM_JOIN failed:", error);
        ack?.({ error: "Unable to join this workspace. Please try again." });
      }
    })();
  });

  socket.on(SOCKET_EVENTS.ROOM_LEAVE, () => {
    leaveCurrentRoom(io, socket, registry, awarenessTracker);
  });

  socket.on("disconnect", () => {
    joinRateBySocket.delete(socket.id);
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
  const room = registry.getRoom(roomId);
  const clientIds = awarenessTracker.consume(socket.id);
  const participant = registry.removeParticipant(roomId, socket.id, clientIds);
  socket.data.roomId = undefined;
  socket.leave(roomId);

  const payload: RoomParticipantLeftPayload = { connectionId: socket.id };
  io.to(roomId).emit(SOCKET_EVENTS.ROOM_PARTICIPANT_LEFT, payload);

  if (room && participant) {
    void recordParticipantLeft(room, participant);
  }
}

async function recordParticipantJoined(workspaceId: string, roomCode: string, participant: RoomParticipant): Promise<void> {
  try {
    const state = await workspaceStore.getState(workspaceId);
    await workspaceStore.startOrTouchSession({
      workspaceId,
      roomCode,
      fileCount: state?.fileCount ?? 0,
      folderCount: state?.folderCount ?? 0,
      participant: {
        userId: participant.userId,
        identityType: participant.identityType,
        displayName: participant.displayName,
        initials: participant.initials,
        role: participant.role,
      },
      event: {
        actorName: participant.displayName,
        description: `${participant.displayName} joined the session`,
        occurredAt: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
  }
}

async function recordParticipantLeft(room: Room, participant: RoomParticipant): Promise<void> {
  try {
    if (room.participants.size === 0) {
      await workspaceStore.completeSession(room.workspaceId, room.roomCode, {
        actorName: participant.displayName,
        description: `${participant.displayName} left and the session ended`,
        occurredAt: new Date(),
      });
    } else {
      await workspaceStore.recordSessionEvent(room.workspaceId, room.roomCode, {
        actorName: participant.displayName,
        description: `${participant.displayName} left the session`,
        occurredAt: new Date(),
      });
    }
  } catch (error) {
    console.error(error);
  }
}
