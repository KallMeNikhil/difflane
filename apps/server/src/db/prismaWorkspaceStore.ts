import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prismaClient.js";
import type {
  SessionHistoryRecord,
  SessionParticipantEntry,
  SessionTimelineEntry,
  SnapshotTrigger,
  WorkspaceSnapshotRecord,
  WorkspaceStateRecord,
} from "./models.js";
import type { CreateSnapshotInput, SaveStateInput, SessionTimelineEventInput, StartOrTouchSessionInput, WorkspaceStore } from "./WorkspaceStore.js";

type PrismaSessionStatus = "ACTIVE" | "COMPLETED";

type PrismaSnapshotTrigger = "MANUAL" | "BEFORE_IMPORT" | "BEFORE_RESTORE" | "BEFORE_DESTRUCTIVE";

/**
 * SessionParticipantEntry/SessionTimelineEntry (packages/shared-types via
 * db/models.ts) are plain, JSON-safe data: every field is a string. Prisma's
 * `Json` write type, Prisma.InputJsonValue, is structurally an index-signature
 * type (`{ [Key in string]?: InputJsonValue | null }`), and TypeScript does
 * not consider a closed interface assignable to an index-signature type even
 * when every property matches — it requires an explicit index signature on
 * the source. This is a TypeScript structural-typing gap, not a real
 * JSON-incompatibility (there are no Dates, Maps, Sets, undefined, class
 * instances, bigints, or symbols in these types). The cast below is the
 * single, justified serialization boundary for that gap; it must not be
 * duplicated elsewhere.
 */
function toInputJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function toAppTrigger(trigger: PrismaSnapshotTrigger): SnapshotTrigger {
  return trigger.toLowerCase() as SnapshotTrigger;
}

function toPrismaTrigger(trigger: SnapshotTrigger): PrismaSnapshotTrigger {
  return trigger.toUpperCase() as PrismaSnapshotTrigger;
}

function toWorkspaceStateRecord(state: {
  workspaceId: string;
  stateBytes: Uint8Array;
  fileCount: number;
  folderCount: number;
  updatedAt: Date;
}): WorkspaceStateRecord {
  return {
    workspaceId: state.workspaceId,
    stateBytes: state.stateBytes,
    fileCount: state.fileCount,
    folderCount: state.folderCount,
    updatedAt: state.updatedAt,
  };
}

function toSnapshotRecord(snapshot: {
  id: string;
  workspaceId: string;
  label: string;
  trigger: PrismaSnapshotTrigger;
  stateBytes: Uint8Array;
  fileCount: number;
  folderCount: number;
  createdByUserId: string | null;
  createdByGuestId: string | null;
  createdAt: Date;
}): WorkspaceSnapshotRecord {
  return {
    id: snapshot.id,
    workspaceId: snapshot.workspaceId,
    label: snapshot.label,
    trigger: toAppTrigger(snapshot.trigger),
    stateBytes: snapshot.stateBytes,
    fileCount: snapshot.fileCount,
    folderCount: snapshot.folderCount,
    createdByUserId: snapshot.createdByUserId,
    createdByGuestId: snapshot.createdByGuestId,
    createdAt: snapshot.createdAt,
  };
}

function toSessionHistoryRecord(record: {
  id: string;
  workspaceId: string;
  roomCode: string;
  status: PrismaSessionStatus;
  fileCount: number;
  folderCount: number;
  participants: unknown;
  timeline: unknown;
  startedAt: Date;
  endedAt: Date | null;
  lastActivityAt: Date;
}): SessionHistoryRecord {
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    roomCode: record.roomCode,
    status: record.status === "ACTIVE" ? "active" : "completed",
    fileCount: record.fileCount,
    folderCount: record.folderCount,
    participants: (record.participants as SessionParticipantEntry[] | null) ?? [],
    timeline: (record.timeline as SessionTimelineEntry[] | null) ?? [],
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    lastActivityAt: record.lastActivityAt,
  };
}

function toTimelineEntry(event: SessionTimelineEventInput): SessionTimelineEntry {
  return {
    id: randomUUID(),
    actorName: event.actorName,
    description: event.description,
    occurredAt: event.occurredAt.toISOString(),
  };
}

export function createPrismaWorkspaceStore(): WorkspaceStore {
  return {
    async getState(workspaceId: string) {
      const state = await prisma.workspaceState.findUnique({ where: { workspaceId } });
      return state ? toWorkspaceStateRecord(state) : null;
    },

    async saveState(input: SaveStateInput) {
      const stateBytes = Buffer.from(input.stateBytes);
      const state = await prisma.workspaceState.upsert({
        where: { workspaceId: input.workspaceId },
        create: { workspaceId: input.workspaceId, stateBytes, fileCount: input.fileCount, folderCount: input.folderCount },
        update: { stateBytes, fileCount: input.fileCount, folderCount: input.folderCount },
      });
      return toWorkspaceStateRecord(state);
    },

    async deleteState(workspaceId: string) {
      await prisma.workspaceState.deleteMany({ where: { workspaceId } });
    },

    async createSnapshot(input: CreateSnapshotInput) {
      const createdBy = input.createdBy;
      const snapshot = await prisma.workspaceSnapshot.create({
        data: {
          workspaceId: input.workspaceId,
          label: input.label,
          trigger: toPrismaTrigger(input.trigger),
          stateBytes: Buffer.from(input.stateBytes),
          fileCount: input.fileCount,
          folderCount: input.folderCount,
          createdByUserId: createdBy && "userId" in createdBy ? createdBy.userId : null,
          createdByGuestId: createdBy && "guestId" in createdBy ? createdBy.guestId : null,
        },
      });
      return toSnapshotRecord(snapshot);
    },

    async listSnapshots(workspaceId: string) {
      const snapshots = await prisma.workspaceSnapshot.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
      });
      return snapshots.map(toSnapshotRecord);
    },

    async findSnapshot(workspaceId: string, snapshotId: string) {
      const snapshot = await prisma.workspaceSnapshot.findFirst({ where: { id: snapshotId, workspaceId } });
      return snapshot ? toSnapshotRecord(snapshot) : null;
    },

    async renameSnapshot(workspaceId: string, snapshotId: string, label: string) {
      const existing = await prisma.workspaceSnapshot.findFirst({ where: { id: snapshotId, workspaceId } });
      if (!existing) {
        throw new Error("Snapshot not found");
      }
      const snapshot = await prisma.workspaceSnapshot.update({ where: { id: snapshotId }, data: { label } });
      return toSnapshotRecord(snapshot);
    },

    async deleteSnapshot(workspaceId: string, snapshotId: string) {
      await prisma.workspaceSnapshot.deleteMany({ where: { id: snapshotId, workspaceId } });
    },

    async startOrTouchSession(input: StartOrTouchSessionInput) {
      const existing = await prisma.sessionHistoryRecord.findFirst({
        where: { workspaceId: input.workspaceId, roomCode: input.roomCode, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      });

      const eventEntry = toTimelineEntry(input.event);

      if (!existing) {
        const created = await prisma.sessionHistoryRecord.create({
          data: {
            workspaceId: input.workspaceId,
            roomCode: input.roomCode,
            fileCount: input.fileCount,
            folderCount: input.folderCount,
            participants: toInputJson([input.participant]),
            timeline: toInputJson([eventEntry]),
          },
        });
        return toSessionHistoryRecord(created);
      }

      const existingParticipants = (existing.participants as SessionParticipantEntry[] | null) ?? [];
      const alreadyPresent = existingParticipants.some((participant) => participant.userId === input.participant.userId);
      const participants = alreadyPresent ? existingParticipants : [...existingParticipants, input.participant];
      const timeline = [...((existing.timeline as SessionTimelineEntry[] | null) ?? []), eventEntry];

      const updated = await prisma.sessionHistoryRecord.update({
        where: { id: existing.id },
        data: {
          fileCount: input.fileCount,
          folderCount: input.folderCount,
          participants: toInputJson(participants),
          timeline: toInputJson(timeline),
          lastActivityAt: new Date(),
        },
      });
      return toSessionHistoryRecord(updated);
    },

    async recordSessionEvent(workspaceId: string, roomCode: string, event: SessionTimelineEventInput) {
      const existing = await prisma.sessionHistoryRecord.findFirst({
        where: { workspaceId, roomCode, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      });
      if (!existing) {
        return;
      }
      const timeline = [...((existing.timeline as SessionTimelineEntry[] | null) ?? []), toTimelineEntry(event)];
      await prisma.sessionHistoryRecord.update({
        where: { id: existing.id },
        data: { timeline: toInputJson(timeline), lastActivityAt: new Date() },
      });
    },

    async completeSession(workspaceId: string, roomCode: string, event: SessionTimelineEventInput) {
      const existing = await prisma.sessionHistoryRecord.findFirst({
        where: { workspaceId, roomCode, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      });
      if (!existing) {
        return;
      }
      const timeline = [...((existing.timeline as SessionTimelineEntry[] | null) ?? []), toTimelineEntry(event)];
      await prisma.sessionHistoryRecord.update({
        where: { id: existing.id },
        data: { status: "COMPLETED", endedAt: new Date(), timeline: toInputJson(timeline), lastActivityAt: new Date() },
      });
    },

    async listSessionsForWorkspaceIds(workspaceIds: string[]) {
      if (workspaceIds.length === 0) {
        return [];
      }
      const records = await prisma.sessionHistoryRecord.findMany({
        where: { workspaceId: { in: workspaceIds } },
        orderBy: { startedAt: "desc" },
      });
      return records.map(toSessionHistoryRecord);
    },
  };
}
