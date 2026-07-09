import * as Y from "yjs";
import { Awareness, removeAwarenessStates } from "y-protocols/awareness";
import type { RoomParticipant, RoomSnapshot } from "@difflane/shared-types";
import type { ConnectionAwarenessTracker } from "../socket/ConnectionAwarenessTracker.js";

interface Room {
  roomId: string;
  roomCode: string;
  doc: Y.Doc;
  awareness: Awareness;
  participants: Map<string, RoomParticipant>;
}

const PARTICIPANT_COLOR_PALETTE = ["#b4c5ff", "#ffb596", "#86efac", "#b7c8e1", "#f4a8c9", "#f6d97a"];

function toRoomId(roomCode: string): string {
  return `room:${roomCode.trim().toUpperCase()}`;
}

export class RoomRegistry {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly awarenessTracker: ConnectionAwarenessTracker) {}

  getOrCreateRoomByCode(roomCode: string): Room {
    const normalizedCode = roomCode.trim().toUpperCase();
    const roomId = toRoomId(normalizedCode);
    const existing = this.rooms.get(roomId);
    if (existing) {
      return existing;
    }
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    awareness.on("update", ({ added, updated }: { added: number[]; updated: number[] }, origin: unknown) => {
      if (typeof origin === "string") {
        this.awarenessTracker.track(origin, [...added, ...updated]);
      }
    });
    const room: Room = { roomId, roomCode: normalizedCode, doc, awareness, participants: new Map() };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addParticipant(roomId: string, connectionId: string, displayName: string, initials: string): RoomParticipant {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Cannot add participant to unknown room: ${roomId}`);
    }
    const color = PARTICIPANT_COLOR_PALETTE[room.participants.size % PARTICIPANT_COLOR_PALETTE.length];
    const participant: RoomParticipant = {
      connectionId,
      userId: connectionId,
      displayName,
      initials,
      role: "editor",
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
