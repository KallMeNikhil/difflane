import { prisma } from "./prismaClient.js";
import type { SnapshotTrigger, WorkspaceSnapshotRecord, WorkspaceStateRecord } from "./models.js";
import type { CreateSnapshotInput, SaveStateInput, WorkspaceStore } from "./WorkspaceStore.js";

type PrismaSnapshotTrigger = "MANUAL" | "BEFORE_IMPORT" | "BEFORE_RESTORE" | "BEFORE_DESTRUCTIVE";

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
  };
}
