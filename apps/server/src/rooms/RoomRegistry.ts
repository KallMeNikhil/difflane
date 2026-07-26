import * as Y from "yjs";
import { Awareness, removeAwarenessStates } from "y-protocols/awareness";
import type { MemberRole, ParticipantIdentityType, RoomParticipant, RoomSnapshot } from "@difflane/shared-types";
import type { ConnectionAwarenessTracker } from "../socket/ConnectionAwarenessTracker.js";

interface Room {
  roomId: string;
  roomCode: string;
  workspaceId: string;
  doc: Y.Doc;
  awareness: Awareness;
  participants: Map<string, RoomParticipant>;
}

const PARTICIPANT_COLOR_PALETTE = ["#b4c5ff", "#ffb596", "#86efac", "#b7c8e1", "#f4a8c9", "#f6d97a"];

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

  constructor(private readonly awarenessTracker: ConnectionAwarenessTracker) {}

  getOrCreateRoomByCode(roomCode: string, workspaceId: string): { room: Room; created: boolean } {
    const normalizedCode = roomCode.trim().toUpperCase();
    const roomId = toRoomId(normalizedCode);
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

  removeParticipant(roomId: string, connectionId: string, awarenessClientIds: number[]): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    room.participants.delete(connectionId);
    if (awarenessClientIds.length > 0) {
      removeAwarenessStates(room.awareness, awarenessClientIds, "connection-closed");
    }
  }

  getSnapshot(roomId: string): RoomSnapshot | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }
    return { roomId: room.roomId, roomCode: room.roomCode, participants: Array.from(room.participants.values()) };
  }
}
