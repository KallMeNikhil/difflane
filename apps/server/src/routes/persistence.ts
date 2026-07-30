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
import { moderateRateLimit, relaxedRateLimit } from "../middleware/rateLimit.js";
import { handleRouteError, requireIdentity } from "../middleware/routeHelpers.js";
import { AuthError } from "../auth/AuthError.js";
import { createWorkspace, getWorkspaceByCode, isValidUuid, isValidWorkspaceCode, requireMembership, requireRole, MUTATING_ROLES } from "../workspaces/workspaceService.js";
import type { Identity } from "../workspaces/workspaceService.js";
import { identityStore } from "../db/index.js";
import type { WorkspaceRecord, WorkspaceSnapshotRecord } from "../db/models.js";

const SNAPSHOT_LABEL_MAX_LENGTH = 120;
const WORKSPACE_NAME_MAX_LENGTH = 100;
const handleError = handleRouteError;
const toIdentity = requireIdentity;

function toPersistenceIdentity(identity: Identity): { userId: string } | { guestId: string } {
  return identity.type === "user" ? { userId: identity.id } : { guestId: identity.id };
}

function requireValidCode(req: Request, res: Response): string | null {
  const code = req.params.code;
  if (!isValidWorkspaceCode(code)) {
    res.status(400).json({ code: "unknown_error", message: "Invalid workspace code." });
    return null;
  }
  return code;
}

function requireValidSnapshotId(req: Request, res: Response): string | null {
  const snapshotId = req.params.snapshotId;
  if (!isValidUuid(snapshotId)) {
    res.status(400).json({ code: "unknown_error", message: "Invalid snapshot identifier." });
    return null;
  }
  return snapshotId;
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

async function resolveWorkspaceForMember(req: Request, code: string): Promise<WorkspaceRecord> {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  await requireMembership(toIdentity(req), workspace.id);
  return workspace;
}

async function resolveWorkspaceForMutation(req: Request, code: string): Promise<WorkspaceRecord> {
  const workspace = await getWorkspaceByCode(code);
  if (!workspace) {
    throw new AuthError("unknown_error", "Workspace not found.", 404);
  }
  await requireRole(toIdentity(req), workspace.id, MUTATING_ROLES);
  return workspace;
}

export function createPersistenceRouter(lifecycleManager: WorkspaceLifecycleManager): Router {
  const router = Router();

  router.get("/api/workspaces/:code/snapshots", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const workspace = await resolveWorkspaceForMember(req, code);
      const snapshots = await lifecycleManager.listSnapshots(workspace.id);
      const summaries = await Promise.all(snapshots.map((snapshot) => toSnapshotSummary(snapshot, workspace.code)));
      res.json({ snapshots: summaries });
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post("/api/workspaces/:code/snapshots", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const { label } = req.body as CreateSnapshotRequest;
      if (label !== undefined && (typeof label !== "string" || label.length > SNAPSHOT_LABEL_MAX_LENGTH)) {
        res.status(400).json({ code: "unknown_error", message: `Label must be ${SNAPSHOT_LABEL_MAX_LENGTH} characters or fewer.` });
        return;
      }
      const workspace = await resolveWorkspaceForMutation(req, code);
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

  router.patch("/api/workspaces/:code/snapshots/:snapshotId", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const snapshotId = requireValidSnapshotId(req, res);
      if (!snapshotId) return;
      const { label } = req.body as RenameSnapshotRequest;
      if (!label || !label.trim() || label.length > SNAPSHOT_LABEL_MAX_LENGTH) {
        res.status(400).json({ code: "unknown_error", message: `Snapshot name is required and must be ${SNAPSHOT_LABEL_MAX_LENGTH} characters or fewer.` });
        return;
      }
      const workspace = await resolveWorkspaceForMutation(req, code);
      const snapshot = await lifecycleManager.renameSnapshot(workspace.id, snapshotId, label.trim());
      res.json(await toSnapshotSummary(snapshot, workspace.code));
    } catch (error) {
      handleError(error, res);
    }
  });

  router.delete("/api/workspaces/:code/snapshots/:snapshotId", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const snapshotId = requireValidSnapshotId(req, res);
      if (!snapshotId) return;
      const workspace = await resolveWorkspaceForMutation(req, code);
      await lifecycleManager.deleteSnapshot(workspace.id, snapshotId);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post("/api/workspaces/:code/snapshots/:snapshotId/restore", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const snapshotId = requireValidSnapshotId(req, res);
      if (!snapshotId) return;
      const workspace = await resolveWorkspaceForMutation(req, code);
      const roomId = toRoomId(workspace.code);
      const snapshot = await lifecycleManager.restoreSnapshot(roomId, workspace.id, snapshotId, toPersistenceIdentity(toIdentity(req)));
      res.json(await toSnapshotSummary(snapshot, workspace.code));
    } catch (error) {
      handleError(error, res);
    }
  });

  router.get("/api/workspaces/:code/export", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const workspace = await resolveWorkspaceForMember(req, code);
      const payload = await lifecycleManager.exportWorkspace(workspace.id, workspace.name);
      res.json(payload);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post("/api/workspaces/import", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
    try {
      const identity = toIdentity(req);
      const { name, payload } = req.body as ImportWorkspaceRequest;
      if (!payload || payload.formatVersion !== 1) {
        res.status(400).json({ code: "unknown_error", message: "Unsupported or invalid workspace package." });
        return;
      }
      if (name !== undefined && (typeof name !== "string" || name.length > WORKSPACE_NAME_MAX_LENGTH)) {
        res.status(400).json({ code: "unknown_error", message: `Name must be ${WORKSPACE_NAME_MAX_LENGTH} characters or fewer.` });
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

  router.get("/api/workspaces/:code/recovery-status", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const workspace = await resolveWorkspaceForMember(req, code);
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
