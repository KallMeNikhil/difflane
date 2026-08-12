import { Router, type Request, type Response } from "express";
import type { CreateExecutionRequest } from "@difflane/shared-types";
import type { WorkspaceLifecycleManager } from "../workspaces/WorkspaceLifecycleManager.js";
import { resolveIdentity } from "../middleware/resolveIdentity.js";
import { moderateRateLimit, relaxedRateLimit } from "../middleware/rateLimit.js";
import { handleRouteError, requireIdentity } from "../middleware/routeHelpers.js";
import { getWorkspaceByCode, isValidUuid, isValidWorkspaceCode, requireRole, MUTATING_ROLES } from "../workspaces/workspaceService.js";
import type { Identity } from "../workspaces/workspaceService.js";
import { identityStore } from "../db/index.js";
import { createExecution, getExecutionResult, listRecentExecutions, stopExecution } from "../execution/executionService.js";

const ENTRY_PATH_MAX_LENGTH = 300;

function requireValidCode(req: Request, res: Response): string | null {
  const code = req.params.code;
  if (!isValidWorkspaceCode(code)) {
    res.status(400).json({ code: "unknown_error", message: "Invalid workspace code." });
    return null;
  }
  return code;
}

function requireValidExecutionId(req: Request, res: Response): string | null {
  const executionId = req.params.executionId;
  if (!isValidUuid(executionId)) {
    res.status(400).json({ code: "unknown_error", message: "Invalid execution identifier." });
    return null;
  }
  return executionId;
}

async function resolveDisplayName(identity: Identity): Promise<string> {
  if (identity.type === "user") {
    const user = await identityStore.findUserById(identity.id);
    return user?.displayName ?? "User";
  }
  const guest = await identityStore.findGuestSession(identity.id);
  return guest?.displayName ?? "Guest";
}

export function createExecutionRouter(lifecycleManager: WorkspaceLifecycleManager): Router {
  const router = Router();

  router.post("/api/workspaces/:code/executions", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const workspace = await getWorkspaceByCode(code);
      if (!workspace) {
        res.status(404).json({ code: "unknown_error", message: "Workspace not found." });
        return;
      }
      const identity = requireIdentity(req);
      await requireRole(identity, workspace.id, MUTATING_ROLES);

      const body = req.body as CreateExecutionRequest;
      const entryPath = typeof body.entryPath === "string" ? body.entryPath.slice(0, ENTRY_PATH_MAX_LENGTH) : "";
      if (!entryPath || !body.languageId) {
        res.status(400).json({ code: "unknown_error", message: "An entry file and language are required." });
        return;
      }

      const displayName = await resolveDisplayName(identity);
      const result = await createExecution(
        lifecycleManager,
        workspace.id,
        workspace.code,
        body.languageId,
        entryPath,
        { identity, displayName },
        typeof body.stdin === "string" ? body.stdin.slice(0, 8_000) : undefined,
      );
      res.status(202).json(result);
    } catch (error) {
      handleRouteError(error, res);
    }
  });

  router.get("/api/workspaces/:code/executions/:executionId", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const executionId = requireValidExecutionId(req, res);
      if (!executionId) return;
      const workspace = await getWorkspaceByCode(code);
      if (!workspace) {
        res.status(404).json({ code: "unknown_error", message: "Workspace not found." });
        return;
      }
      const identity = requireIdentity(req);
      await requireRole(identity, workspace.id, MUTATING_ROLES);
      const displayName = await resolveDisplayName(identity);
      const result = getExecutionResult(executionId, { identity, displayName });
      res.json(result);
    } catch (error) {
      handleRouteError(error, res);
    }
  });

  router.post("/api/workspaces/:code/executions/:executionId/stop", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const executionId = requireValidExecutionId(req, res);
      if (!executionId) return;
      const workspace = await getWorkspaceByCode(code);
      if (!workspace) {
        res.status(404).json({ code: "unknown_error", message: "Workspace not found." });
        return;
      }
      const identity = requireIdentity(req);
      await requireRole(identity, workspace.id, MUTATING_ROLES);
      const displayName = await resolveDisplayName(identity);
      stopExecution(executionId, { identity, displayName });
      res.status(204).end();
    } catch (error) {
      handleRouteError(error, res);
    }
  });

  router.get("/api/workspaces/:code/executions", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
    try {
      const code = requireValidCode(req, res);
      if (!code) return;
      const workspace = await getWorkspaceByCode(code);
      if (!workspace) {
        res.status(404).json({ code: "unknown_error", message: "Workspace not found." });
        return;
      }
      const identity = requireIdentity(req);
      await requireRole(identity, workspace.id, MUTATING_ROLES);
      const displayName = await resolveDisplayName(identity);
      res.json({ executions: listRecentExecutions(workspace.id, { identity, displayName }) });
    } catch (error) {
      handleRouteError(error, res);
    }
  });

  return router;
}
