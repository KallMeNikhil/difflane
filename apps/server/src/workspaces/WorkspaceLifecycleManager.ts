import * as Y from "yjs";
import type { Server } from "socket.io";
import {
  SOCKET_EVENTS,
  type WorkspacePersistedPayload,
  type WorkspacePersistenceFailedPayload,
  type WorkspaceRestoredPayload,
  type WorkspaceExportPayload,
  type MemberRole,
  type ParticipantIdentityType,
  type RoomRoleChangedPayload,
} from "@difflane/shared-types";
import type { RoomRegistry } from "../rooms/RoomRegistry.js";
import type { SnapshotTrigger, WorkspaceSnapshotRecord } from "../db/models.js";
import * as persistence from "./PersistenceService.js";
import type { PersistenceIdentity } from "./PersistenceService.js";

const FILE_SYSTEM_KEY = "workspaceFileSystem";
const FILE_TEXTS_KEY = "fileTexts";
const WORKSPACE_METADATA_KEY = "workspaceMetadata";
const REPOSITORY_INFO_KEY = "repositoryInfo";
const DISCUSSION_FEED_KEY = "discussionFeed";
const REVIEW_THREADS_KEY = "reviewThreads";
const REVIEW_STATE_KEY = "reviewState";

interface FileSystemEntryLike {
  id: string;
  parentId: string | null;
  name: string;
  type: "file" | "folder";
  order: number;
  language?: string;
}

function serializeDiscussionFeed(array: Y.Array<unknown>): unknown[] {
  return array.toArray().map((item) => {
    if (item instanceof Y.Map) {
      return { kind: "thread", thread: item.toJSON() };
    }
    return item;
  });
}

function serializeReviewThreads(array: Y.Array<unknown>): unknown[] {
  return array.toArray().map((item) => (item instanceof Y.Map ? item.toJSON() : item));
}

function deserializeDiscussionFeedItem(raw: unknown): Y.Map<unknown> | Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (record.kind === "event") {
    return record;
  }
  const thread = (record.kind === "thread" ? record.thread : record) as Record<string, unknown> | undefined;
  if (!thread || typeof thread !== "object") {
    return null;
  }
  const threadMap = new Y.Map<unknown>();
  threadMap.set("id", thread.id);
  threadMap.set("status", thread.status);
  threadMap.set("anchor", thread.anchor ?? null);
  const comments = new Y.Array<unknown>();
  if (Array.isArray(thread.comments)) {
    comments.push(thread.comments);
  }
  threadMap.set("comments", comments);
  return threadMap;
}

function deserializeReviewThread(raw: unknown): Y.Map<unknown> | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const thread = raw as Record<string, unknown>;
  const threadMap = new Y.Map<unknown>();
  threadMap.set("id", thread.id);
  threadMap.set("fileId", thread.fileId);
  threadMap.set("anchor", thread.anchor);
  threadMap.set("status", thread.status);
  threadMap.set("createdAt", thread.createdAt);
  threadMap.set("resolvedAt", thread.resolvedAt ?? null);
  threadMap.set("resolvedBy", thread.resolvedBy ?? null);
  const comments = new Y.Array<unknown>();
  if (Array.isArray(thread.comments)) {
    comments.push(thread.comments);
  }
  threadMap.set("comments", comments);
  return threadMap;
}

function decodeDoc(stateBytes: Uint8Array): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, stateBytes);
  return doc;
}

function summarizeDoc(doc: Y.Doc): { fileCount: number; folderCount: number } {
  const entries = [...doc.getMap<FileSystemEntryLike>(FILE_SYSTEM_KEY).values()];
  return {
    fileCount: entries.filter((entry) => entry.type === "file").length,
    folderCount: entries.filter((entry) => entry.type === "folder").length,
  };
}

const PERSIST_DEBOUNCE_MS = 800;

export class WorkspaceLifecycleManager {
  private readonly writeQueues = new Map<string, Promise<void>>();
  private readonly pendingPersistTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly io: Server,
    private readonly registry: RoomRegistry,
  ) {}

  async hydrateRoomDoc(workspaceId: string, doc: Y.Doc): Promise<void> {
    const state = await persistence.readState(workspaceId);
    if (state) {
      Y.applyUpdate(doc, state.stateBytes);
    }
  }

  persistDocUpdate(roomId: string, workspaceId: string, doc: Y.Doc): void {
    const existingTimer = this.pendingPersistTimers.get(workspaceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      this.pendingPersistTimers.delete(workspaceId);
      this.schedulePersist(roomId, workspaceId, doc);
    }, PERSIST_DEBOUNCE_MS);
    this.pendingPersistTimers.set(workspaceId, timer);
  }

  private schedulePersist(roomId: string, workspaceId: string, doc: Y.Doc): void {
    const prior = this.writeQueues.get(workspaceId) ?? Promise.resolve();
    const next = prior.then(() => this.attemptPersist(roomId, workspaceId, doc, 0)).catch(() => undefined);
    this.writeQueues.set(workspaceId, next);
  }

  private async attemptPersist(roomId: string, workspaceId: string, doc: Y.Doc, attempt: number): Promise<void> {
    try {
      const bytes = Y.encodeStateAsUpdate(doc);
      await persistence.writeState(workspaceId, bytes, summarizeDoc(doc));
      const payload: WorkspacePersistedPayload = { roomId, persistedAt: new Date().toISOString() };
      this.io.to(roomId).emit(SOCKET_EVENTS.WORKSPACE_PERSISTED, payload);
    } catch (error) {
      if (attempt < 2) {
        await this.attemptPersist(roomId, workspaceId, doc, attempt + 1);
        return;
      }
      console.error(`Failed to persist workspace ${workspaceId}:`, error);
      const payload: WorkspacePersistenceFailedPayload = {
        roomId,
        message: "Failed to save workspace changes. Changes will be retried automatically.",
        willRetry: true,
      };
      this.io.to(roomId).emit(SOCKET_EVENTS.WORKSPACE_PERSISTENCE_FAILED, payload);
    }
  }

  notifyRoleChanged(workspaceId: string, userId: string, identityType: ParticipantIdentityType, role: MemberRole): void {
    const result = this.registry.updateParticipantRole(workspaceId, userId, identityType, role);
    if (!result) {
      return;
    }
    for (const participant of result.participants) {
      const payload: RoomRoleChangedPayload = { roomId: result.roomId, connectionId: participant.connectionId, role };
      this.io.to(result.roomId).emit(SOCKET_EVENTS.ROOM_ROLE_CHANGED, payload);
    }
  }

  async flushPendingPersists(): Promise<void> {
    for (const [workspaceId, timer] of this.pendingPersistTimers) {
      clearTimeout(timer);
      this.pendingPersistTimers.delete(workspaceId);
      const room = this.registry.getRoomByWorkspaceId(workspaceId);
      if (room) {
        this.schedulePersist(room.roomId, workspaceId, room.doc);
      }
    }
    await Promise.all(Array.from(this.writeQueues.values()));
  }

  async listSnapshots(workspaceId: string): Promise<WorkspaceSnapshotRecord[]> {
    return persistence.listSnapshots(workspaceId);
  }

  async createManualSnapshot(workspaceId: string, label: string, createdBy: PersistenceIdentity): Promise<WorkspaceSnapshotRecord> {
    return this.snapshotCurrentState(workspaceId, label, "manual", createdBy);
  }

  async createAutomaticSnapshot(
    workspaceId: string,
    trigger: SnapshotTrigger,
    createdBy: PersistenceIdentity,
  ): Promise<WorkspaceSnapshotRecord | null> {
    const state = await persistence.readState(workspaceId);
    if (!state) {
      return null;
    }
    return persistence.writeSnapshot(
      workspaceId,
      trigger === "before_import" ? "Pre-import safety snapshot" : trigger === "before_restore" ? "Pre-restore safety snapshot" : "Safety snapshot",
      trigger,
      state.stateBytes,
      { fileCount: state.fileCount, folderCount: state.folderCount },
      createdBy,
    );
  }

  private async snapshotCurrentState(
    workspaceId: string,
    label: string,
    trigger: SnapshotTrigger,
    createdBy: PersistenceIdentity,
  ): Promise<WorkspaceSnapshotRecord> {
    const state = await persistence.readState(workspaceId);
    const bytes = state?.stateBytes ?? Y.encodeStateAsUpdate(new Y.Doc());
    const summary = state ? { fileCount: state.fileCount, folderCount: state.folderCount } : { fileCount: 0, folderCount: 0 };
    return persistence.writeSnapshot(workspaceId, label, trigger, bytes, summary, createdBy);
  }

  async renameSnapshot(workspaceId: string, snapshotId: string, label: string): Promise<WorkspaceSnapshotRecord> {
    return persistence.renameSnapshotLabel(workspaceId, snapshotId, label);
  }

  async deleteSnapshot(workspaceId: string, snapshotId: string): Promise<void> {
    await persistence.removeSnapshot(workspaceId, snapshotId);
  }

  async restoreSnapshot(
    roomId: string,
    workspaceId: string,
    snapshotId: string,
    restoredBy: PersistenceIdentity,
  ): Promise<WorkspaceSnapshotRecord> {
    const snapshot = await persistence.readSnapshot(workspaceId, snapshotId);
    if (!snapshot) {
      throw new Error("Snapshot not found.");
    }

    await this.createAutomaticSnapshot(workspaceId, "before_restore", restoredBy);
    await persistence.writeState(workspaceId, snapshot.stateBytes, {
      fileCount: snapshot.fileCount,
      folderCount: snapshot.folderCount,
    });

    const resetRoom = this.registry.resetRoomDoc(roomId);
    if (resetRoom) {
      Y.applyUpdate(resetRoom.doc, snapshot.stateBytes);
    }

    const payload: WorkspaceRestoredPayload = { roomId };
    this.io.to(roomId).emit(SOCKET_EVENTS.WORKSPACE_RESTORED, payload);
    return snapshot;
  }

  async getPersistedState(workspaceId: string) {
    return persistence.readState(workspaceId);
  }

  async finalizeImportedState(
    workspaceId: string,
    bytes: Uint8Array,
    fileCount: number,
    folderCount: number,
  ): Promise<void> {
    await persistence.writeState(workspaceId, bytes, { fileCount, folderCount });
  }

  async exportWorkspace(workspaceId: string, workspaceName: string): Promise<WorkspaceExportPayload> {
    const state = await persistence.readState(workspaceId);
    const doc = state ? decodeDoc(state.stateBytes) : new Y.Doc();

    const entries = [...doc.getMap<FileSystemEntryLike>(FILE_SYSTEM_KEY).values()];
    const fileTexts = doc.getMap<Y.Text>(FILE_TEXTS_KEY);
    const fileContents: Record<string, string> = {};
    for (const entry of entries) {
      if (entry.type === "file") {
        fileContents[entry.id] = fileTexts.get(entry.id)?.toString() ?? "";
      }
    }

    const metadataMap = doc.getMap(WORKSPACE_METADATA_KEY);
    const repositoryMap = doc.getMap(REPOSITORY_INFO_KEY);
    const discussions = serializeDiscussionFeed(doc.getArray(DISCUSSION_FEED_KEY));
    const reviews = serializeReviewThreads(doc.getArray(REVIEW_THREADS_KEY));
    const reviewStateMap = doc.getMap<unknown>(REVIEW_STATE_KEY);
    const fileReviewStatus = Array.from(reviewStateMap.values());
    const reviewCommentCount = reviews.reduce((total: number, thread) => {
      const comments = (thread as { comments?: unknown[] }).comments;
      return total + (Array.isArray(comments) ? comments.length : 0);
    }, 0);
    const collaborationPreferences = (metadataMap.get("collaboration") as
      | { cursorPresence: boolean; inlineDiscussions: boolean; sharedNavigation: boolean }
      | undefined) ?? { cursorPresence: true, inlineDiscussions: true, sharedNavigation: false };

    const payload: WorkspaceExportPayload = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      workspace: {
        name: (metadataMap.get("name") as string | undefined) ?? workspaceName,
        description: (metadataMap.get("description") as string | undefined) ?? "",
        collaboration: collaborationPreferences,
      },
      fileSystem: entries,
      fileContents,
      discussions,
      reviews,
      fileReviewStatus,
      repository: repositoryMap.size > 0 ? Object.fromEntries(repositoryMap.entries()) : null,
      sessionHistory: [],
      stats: {
        fileCount: entries.filter((entry) => entry.type === "file").length,
        folderCount: entries.filter((entry) => entry.type === "folder").length,
        discussionCount: discussions.length,
        reviewCommentCount,
      },
    };

    doc.destroy();
    return payload;
  }

  async buildInitialStateFromImport(payload: WorkspaceExportPayload): Promise<{ bytes: Uint8Array; fileCount: number; folderCount: number }> {
    const doc = new Y.Doc();
    const fileSystemMap = doc.getMap<FileSystemEntryLike>(FILE_SYSTEM_KEY);
    const fileTexts = doc.getMap<Y.Text>(FILE_TEXTS_KEY);
    const metadataMap = doc.getMap(WORKSPACE_METADATA_KEY);
    const repositoryMap = doc.getMap(REPOSITORY_INFO_KEY);
    const discussionArray = doc.getArray(DISCUSSION_FEED_KEY);
    const reviewArray = doc.getArray(REVIEW_THREADS_KEY);
    const reviewStateMap = doc.getMap(REVIEW_STATE_KEY);

    doc.transact(() => {
      metadataMap.set("name", payload.workspace.name);
      metadataMap.set("description", payload.workspace.description);
      metadataMap.set("collaboration", payload.workspace.collaboration);

      for (const rawEntry of payload.fileSystem) {
        const entry = rawEntry as FileSystemEntryLike;
        fileSystemMap.set(entry.id, entry);
        if (entry.type === "file") {
          const text = new Y.Text();
          const content = payload.fileContents[entry.id] ?? "";
          if (content.length > 0) {
            text.insert(0, content);
          }
          fileTexts.set(entry.id, text);
        }
      }

      if (payload.repository && typeof payload.repository === "object") {
        for (const [key, value] of Object.entries(payload.repository as Record<string, unknown>)) {
          repositoryMap.set(key, value);
        }
      }

      if (Array.isArray(payload.discussions) && payload.discussions.length > 0) {
        const items = payload.discussions
          .map((raw) => deserializeDiscussionFeedItem(raw))
          .filter((item): item is Y.Map<unknown> | Record<string, unknown> => item !== null);
        if (items.length > 0) {
          discussionArray.insert(0, items);
        }
      }

      if (Array.isArray(payload.reviews) && payload.reviews.length > 0) {
        const items = payload.reviews
          .map((raw) => deserializeReviewThread(raw))
          .filter((item): item is Y.Map<unknown> => item !== null);
        if (items.length > 0) {
          reviewArray.insert(0, items);
        }
      }

      if (Array.isArray(payload.fileReviewStatus) && payload.fileReviewStatus.length > 0) {
        for (const raw of payload.fileReviewStatus) {
          if (typeof raw === "object" && raw !== null && typeof (raw as { fileId?: unknown }).fileId === "string") {
            const record = raw as { fileId: string };
            reviewStateMap.set(record.fileId, record);
          }
        }
      }
    });

    const bytes = Y.encodeStateAsUpdate(doc);
    const summary = summarizeDoc(doc);
    doc.destroy();
    return { bytes, fileCount: summary.fileCount, folderCount: summary.folderCount };
  }
}
