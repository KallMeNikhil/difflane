import { Router, type Request, type Response } from "express";
import type {
  CreateSnapshotRequest,
  ImportWorkspaceRequest,
  ImportWorkspaceResponse,
  RenameSnapshotRequest,
  WorkspaceExportPayload,
  WorkspaceRecoveryStatusResponse,
  WorkspaceSnapshotSummary,
} from "@difflane/shared-types";
import { toRoomId } from "../rooms/RoomRegistry.js";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";
import { resolveIdentity } from "../middleware/resolveIdentity.js";
import { AuthError } from "../auth/AuthError.js";
import { createWorkspace, getWorkspaceByCode, requireMembership } from "../workspaces/workspaceService.js";
import type { Identity } from "../workspaces/workspaceService.js";
import { identityStore } from "../db/index.js";
import type { WorkspaceSnapshotRecord } from "../db/models.js";

function handleError(error: unknown, res: Response): void {
  if (error instanceof AuthError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }
  res.status(500).json({ code: "unknown_error", message: "Something went wrong. Please try again." });
}

function toIdentity(req: Request): Identity {
  if (!req.identity) {
    throw new AuthError("invalid_token", "Identity could not be resolved.", 401);
  }
  return req.identity;
}

function toPersistenceIdentity(identity: Identity): { userId: string } | { guestId: string } {
  return identity.type === "user" ? { userId: identity.id } : { guestId: identity.id };
}

async function toSnapshotSummary(record: WorkspaceSnapshotRecord, workspaceCode: string): Promise<WorkspaceSnapshotSummary> {
  let createdBy: WorkspaceSnapshotSummary["createdBy"] = null;
  if (record.createdByUserId) {
    const user = await identityStore.findUserById(record.createdByUserId);
    createdBy = user ? { identityType: "user", displayName: user.displayName } : null;
  } else if (record.createdByGuestId) {
    const guest = await identityStore.findGuestSession(record.createdByGuestId);
    createdBy = guest ? { identityType: "guest", displayName: guest.displayName } : null;
  }
  return {
    id: record.id,
    workspaceCode,
    label: record.label,
    trigger: record.trigger,
    fileCount: record.fileCount,
    folderCount: record.folderCount,
    createdAt: record.createdAt.toISOString(),
    createdBy,
  };
}

async function resolveWorkspaceForMember(req: Request, code: string) {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  await requireMembership(toIdentity(req), workspace.id);
  return workspace;
}

export function createPersistenceRouter(lifecycleManager: WorkspaceLifecycleManager): Router {
  const router = Router();

  router.get("/api/workspaces/:code/snapshots", resolveIdentity, async (req: Request, res: Response) => {
    try {
      const workspace = await resolveWorkspaceForMember(req, req.params.code);
      const snapshots = await lifecycleManager.listSnapshots(workspace.id);
      const summaries = await Promise.all(snapshots.map((snapshot) => toSnapshotSummary(snapshot, workspace.code)));
      res.json({ snapshots: summaries });
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post("/api/workspaces/:code/snapshots", resolveIdentity, async (req: Request, res: Response) => {
    try {
      const workspace = await resolveWorkspaceForMember(req, req.params.code);
      const { label } = req.body as CreateSnapshotRequest;
      const snapshot = await lifecycleManager.createManualSnapshot(
        workspace.id,
        (label ?? "").trim() || "Untitled Snapshot",
        toPersistenceIdentity(toIdentity(req)),
      );
      res.status(201).json(await toSnapshotSummary(snapshot, workspace.code));
    } catch (error) {
      handleError(error, res);
    }
  });

  router.patch("/api/workspaces/:code/snapshots/:snapshotId", resolveIdentity, async (req: Request, res: Response) => {
    try {
      const workspace = await resolveWorkspaceForMember(req, req.params.code);
      const { label } = req.body as RenameSnapshotRequest;
      if (!label || !label.trim()) {
        res.status(400).json({ code: "unknown_error", message: "Snapshot name is required." });
        return;
      }
      const snapshot = await lifecycleManager.renameSnapshot(workspace.id, req.params.snapshotId, label.trim());
      res.json(await toSnapshotSummary(snapshot, workspace.code));
    } catch (error) {
      handleError(error, res);
    }
  });

  router.delete("/api/workspaces/:code/snapshots/:snapshotId", resolveIdentity, async (req: Request, res: Response) => {
    try {
      const workspace = await resolveWorkspaceForMember(req, req.params.code);
      await lifecycleManager.deleteSnapshot(workspace.id, req.params.snapshotId);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post("/api/workspaces/:code/snapshots/:snapshotId/restore", resolveIdentity, async (req: Request, res: Response) => {
    try {
      const workspace = await resolveWorkspaceForMember(req, req.params.code);
      const roomId = toRoomId(workspace.code);
      const snapshot = await lifecycleManager.restoreSnapshot(
        roomId,
        workspace.id,
        req.params.snapshotId,
        toPersistenceIdentity(toIdentity(req)),
      );
      res.json(await toSnapshotSummary(snapshot, workspace.code));
    } catch (error) {
      handleError(error, res);
    }
  });

  router.get("/api/workspaces/:code/export", resolveIdentity, async (req: Request, res: Response) => {
    try {
      const workspace = await resolveWorkspaceForMember(req, req.params.code);
      const payload = await lifecycleManager.exportWorkspace(workspace.id, workspace.name);
      res.json(payload);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post("/api/workspaces/import", resolveIdentity, async (req: Request, res: Response) => {
    try {
      const identity = toIdentity(req);
      const { name, payload } = req.body as ImportWorkspaceRequest;
      if (!payload || payload.formatVersion !== 1) {
        res.status(400).json({ code: "unknown_error", message: "Unsupported or invalid workspace package." });
        return;
      }
      const workspace = await createWorkspace(identity, (name ?? payload.workspace.name ?? "Imported Workspace").trim());
      const initial = await lifecycleManager.buildInitialStateFromImport(payload as WorkspaceExportPayload);
      await lifecycleManager.finalizeImportedState(workspace.id, initial.bytes, initial.fileCount, initial.folderCount);
      await lifecycleManager.createAutomaticSnapshot(workspace.id, "before_import", toPersistenceIdentity(identity));
      const response: ImportWorkspaceResponse = { workspaceCode: workspace.code, name: workspace.name };
      res.status(201).json(response);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.get("/api/workspaces/:code/recovery-status", resolveIdentity, async (req: Request, res: Response) => {
    try {
      const workspace = await resolveWorkspaceForMember(req, req.params.code);
      const state = await lifecycleManager.getPersistedState(workspace.id);
      const response: WorkspaceRecoveryStatusResponse = state
        ? {
            hasPersistedState: true,
            lastPersistedAt: state.updatedAt.toISOString(),
            fileCount: state.fileCount,
            folderCount: state.folderCount,
            unsyncedEditorCount: 0,
            repository: null,
          }
        : {
            hasPersistedState: false,
            lastPersistedAt: null,
            fileCount: 0,
            folderCount: 0,
            unsyncedEditorCount: 0,
            repository: null,
          };
      res.json(response);
    } catch (error) {
      handleError(error, res);
    }
  });

  return router;
}
