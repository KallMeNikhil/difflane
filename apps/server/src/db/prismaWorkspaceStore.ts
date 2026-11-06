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
import { closeAllParticipants, markParticipantDeparted, upsertJoinedParticipant } from "../workspaces/sessionParticipants.js";
import type { CreateSnapshotInput, SaveStateInput, SessionTimelineEventInput, StartOrTouchSessionInput, WorkspaceStore } from "./WorkspaceStore.js";

type PrismaSessionStatus = "ACTIVE" | "COMPLETED";

type PrismaSnapshotTrigger = "MANUAL" | "BEFORE_IMPORT" | "BEFORE_RESTORE" | "BEFORE_DESTRUCTIVE";

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

      const now = input.event.occurredAt;
      const eventEntry = toTimelineEntry(input.event);

      if (!existing) {
        const created = await prisma.sessionHistoryRecord.create({
          data: {
            workspaceId: input.workspaceId,
            roomCode: input.roomCode,
            fileCount: input.fileCount,
            folderCount: input.folderCount,
            participants: toInputJson(upsertJoinedParticipant([], input.participant, now)),
            timeline: toInputJson([eventEntry]),
          },
        });
        return toSessionHistoryRecord(created);
      }

      const existingParticipants = (existing.participants as SessionParticipantEntry[] | null) ?? [];
      const participants = upsertJoinedParticipant(existingParticipants, input.participant, now);
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

    async markParticipantLeft(workspaceId, roomCode, participant, event) {
      const existing = await prisma.sessionHistoryRecord.findFirst({
        where: { workspaceId, roomCode, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      });
      if (!existing) {
        return;
      }
      const participants = markParticipantDeparted(
        (existing.participants as SessionParticipantEntry[] | null) ?? [],
        participant,
        event.occurredAt,
      );
      const timeline = [...((existing.timeline as SessionTimelineEntry[] | null) ?? []), toTimelineEntry(event)];
      await prisma.sessionHistoryRecord.update({
        where: { id: existing.id },
        data: { participants: toInputJson(participants), timeline: toInputJson(timeline), lastActivityAt: new Date() },
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
      const now = new Date();
      const participants = closeAllParticipants((existing.participants as SessionParticipantEntry[] | null) ?? [], event.occurredAt);
      const timeline = [...((existing.timeline as SessionTimelineEntry[] | null) ?? []), toTimelineEntry(event)];
      await prisma.sessionHistoryRecord.update({
        where: { id: existing.id },
        data: {
          status: "COMPLETED",
          endedAt: now,
          participants: toInputJson(participants),
          timeline: toInputJson(timeline),
          lastActivityAt: now,
        },
      });
    },

    async completeStaleSessions() {
      const stale = await prisma.sessionHistoryRecord.findMany({ where: { status: "ACTIVE" } });
      for (const record of stale) {
        const participants = closeAllParticipants((record.participants as SessionParticipantEntry[] | null) ?? [], record.lastActivityAt);
        await prisma.sessionHistoryRecord.update({
          where: { id: record.id },
          data: { status: "COMPLETED", endedAt: record.lastActivityAt, participants: toInputJson(participants) },
        });
      }
      return stale.length;
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
