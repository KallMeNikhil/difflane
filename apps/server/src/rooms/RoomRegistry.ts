import * as Y from "yjs";
import { Awareness, removeAwarenessStates } from "y-protocols/awareness";
import type { MemberRole, ParticipantIdentityType, RoomParticipant, RoomSnapshot } from "@difflane/shared-types";
import type { ConnectionAwarenessTracker } from "../socket/ConnectionAwarenessTracker.js";

export interface Room {
  roomId: string;
  roomCode: string;
  workspaceId: string;
  doc: Y.Doc;
  awareness: Awareness;
  participants: Map<string, RoomParticipant>;
}

const PARTICIPANT_COLOR_PALETTE = ["#b4c5ff", "#ffb596", "#86efac", "#b7c8e1", "#f4a8c9", "#f6d97a"];
const EMPTY_ROOM_EVICTION_MS = 5 * 60 * 1000;

export function toRoomId(roomCode: string): string {
  return `room:${roomCode.trim().toUpperCase()}`;
}

export interface AddParticipantInput {
  userId: string;
  identityType: ParticipantIdentityType;
  displayName: string;
  initials: string;
  role: MemberRole;
}

export class RoomRegistry {
  private readonly rooms = new Map<string, Room>();
  private readonly emptyRoomTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly awarenessTracker: ConnectionAwarenessTracker) {}

  private cancelEviction(roomId: string): void {
    const timer = this.emptyRoomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.emptyRoomTimers.delete(roomId);
    }
  }

  getOrCreateRoomByCode(roomCode: string, workspaceId: string): { room: Room; created: boolean } {
    const normalizedCode = roomCode.trim().toUpperCase();
    const roomId = toRoomId(normalizedCode);
    this.cancelEviction(roomId);
    const existing = this.rooms.get(roomId);
    if (existing) {
      return { room: existing, created: false };
    }
    const room = this.createRoom(roomId, normalizedCode, workspaceId, new Map());
    this.rooms.set(roomId, room);
    return { room, created: true };
  }

  private createRoom(roomId: string, roomCode: string, workspaceId: string, participants: Map<string, RoomParticipant>): Room {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    awareness.on("update", ({ added, updated }: { added: number[]; updated: number[] }, origin: unknown) => {
      if (typeof origin === "string") {
        this.awarenessTracker.track(origin, [...added, ...updated]);
      }
    });
    return { roomId, roomCode, workspaceId, doc, awareness, participants };
  }

  resetRoomDoc(roomId: string): Room | undefined {
    const existing = this.rooms.get(roomId);
    if (!existing) {
      return undefined;
    }
    existing.doc.destroy();
    const replacement = this.createRoom(roomId, existing.roomCode, existing.workspaceId, existing.participants);
    this.rooms.set(roomId, replacement);
    return replacement;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByWorkspaceId(workspaceId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.workspaceId === workspaceId) {
        return room;
      }
    }
    return undefined;
  }

  addParticipant(roomId: string, connectionId: string, input: AddParticipantInput): RoomParticipant {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Cannot add participant to unknown room: ${roomId}`);
    }
    const color = PARTICIPANT_COLOR_PALETTE[room.participants.size % PARTICIPANT_COLOR_PALETTE.length];
    const participant: RoomParticipant = {
      connectionId,
      userId: input.userId,
      identityType: input.identityType,
      displayName: input.displayName,
      initials: input.initials,
      role: input.role,
      color,
    };
    room.participants.set(connectionId, participant);
    return participant;
  }

  removeParticipant(roomId: string, connectionId: string, awarenessClientIds: number[]): RoomParticipant | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }
    const participant = room.participants.get(connectionId);
    room.participants.delete(connectionId);
    if (awarenessClientIds.length > 0) {
      removeAwarenessStates(room.awareness, awarenessClientIds, "connection-closed");
    }
    if (room.participants.size === 0) {
      this.cancelEviction(roomId);
      const timer = setTimeout(() => {
        this.emptyRoomTimers.delete(roomId);
        const current = this.rooms.get(roomId);
        if (current && current.participants.size === 0) {
          current.doc.destroy();
          this.rooms.delete(roomId);
        }
      }, EMPTY_ROOM_EVICTION_MS);
      timer.unref?.();
      this.emptyRoomTimers.set(roomId, timer);
    }
    return participant;
  }

  getSnapshot(roomId: string): RoomSnapshot | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }
    return { roomId: room.roomId, roomCode: room.roomCode, participants: Array.from(room.participants.values()) };
  }

  getParticipant(roomId: string, connectionId: string): RoomParticipant | undefined {
    return this.rooms.get(roomId)?.participants.get(connectionId);
  }

  updateParticipantRole(
    workspaceId: string,
    userId: string,
    identityType: ParticipantIdentityType,
    role: MemberRole,
  ): { roomId: string; participants: RoomParticipant[] } | undefined {
    const room = this.getRoomByWorkspaceId(workspaceId);
    if (!room) {
      return undefined;
    }
    const updated: RoomParticipant[] = [];
    for (const participant of room.participants.values()) {
      if (participant.userId === userId && participant.identityType === identityType) {
        participant.role = role;
        updated.push(participant);
      }
    }
    return { roomId: room.roomId, participants: updated };
  }

  findParticipantConnectionsByUser(
    workspaceId: string,
    userId: string,
    identityType: ParticipantIdentityType,
  ): { roomId: string; connectionIds: string[] } | undefined {
    const room = this.getRoomByWorkspaceId(workspaceId);
    if (!room) {
      return undefined;
    }
    const connectionIds: string[] = [];
    for (const [connectionId, participant] of room.participants.entries()) {
      if (participant.userId === userId && participant.identityType === identityType) {
        connectionIds.push(connectionId);
      }
    }
    return { roomId: room.roomId, connectionIds };
  }
}
