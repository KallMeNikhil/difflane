import { Router, type Request, type Response } from "express";
import type { TransferOwnershipRequest, UpdateMemberRoleRequest } from "@difflane/shared-types";
import { resolveIdentity } from "../middleware/resolveIdentity.js";
import { moderateRateLimit, relaxedRateLimit } from "../middleware/rateLimit.js";
import { handleRouteError, requireIdentity } from "../middleware/routeHelpers.js";
import {
  createWorkspace,
  deleteWorkspace,
  getDashboard,
  getWorkspaceByCode,
  isAssignableRole,
  isValidIdentityType,
  isValidUuid,
  isValidWorkspaceCode,
  requireMembership,
  setWorkspaceFlag,
  transferOwnership,
  updateMemberRole,
} from "../workspaces/workspaceService.js";

export const workspaceRouter = Router();

const WORKSPACE_NAME_MAX_LENGTH = 100;
const handleError = handleRouteError;
const toIdentity = requireIdentity;

function requireValidCode(req: Request, res: Response): string | null {
  const code = req.params.code;
  if (!isValidWorkspaceCode(code)) {
    res.status(400).json({ code: "unknown_error", message: "Invalid workspace code." });
    return null;
  }
  return code;
}

workspaceRouter.post("/api/workspaces", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    if (name !== undefined && (typeof name !== "string" || name.length > WORKSPACE_NAME_MAX_LENGTH)) {
      res.status(400).json({ code: "unknown_error", message: `Name must be ${WORKSPACE_NAME_MAX_LENGTH} characters or fewer.` });
      return;
    }
    const workspace = await createWorkspace(toIdentity(req), name ?? "Untitled Workspace");
    res.status(201).json({ workspaceCode: workspace.code, name: workspace.name });
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.get("/api/workspaces/dashboard", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
  try {
    const dashboard = await getDashboard(toIdentity(req));
    res.json(dashboard);
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.get("/api/workspaces/:code", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
  try {
    const code = requireValidCode(req, res);
    if (!code) return;
    const workspace = await getWorkspaceByCode(code);
    if (!workspace) {
      res.status(404).json({ code: "unknown_error", message: "Workspace not found." });
      return;
    }
    const membership = await requireMembership(toIdentity(req), workspace.id);
    res.json({ workspaceCode: workspace.code, name: workspace.name, role: membership.role.toLowerCase() });
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.delete("/api/workspaces/:code", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
  try {
    const code = requireValidCode(req, res);
    if (!code) return;
    await deleteWorkspace(toIdentity(req), code);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.patch("/api/workspaces/:code/pin", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
  try {
    const code = requireValidCode(req, res);
    if (!code) return;
    const { pinned } = req.body as { pinned?: boolean };
    await setWorkspaceFlag(toIdentity(req), code, { pinned: Boolean(pinned) });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.patch("/api/workspaces/:code/archive", resolveIdentity, relaxedRateLimit, async (req: Request, res: Response) => {
  try {
    const code = requireValidCode(req, res);
    if (!code) return;
    const { archived } = req.body as { archived?: boolean };
    await setWorkspaceFlag(toIdentity(req), code, { archived: Boolean(archived) });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.post("/api/workspaces/:code/transfer-ownership", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
  try {
    const code = requireValidCode(req, res);
    if (!code) return;
    const { targetIdentityId, targetIdentityType } = req.body as TransferOwnershipRequest;
    if (!targetIdentityId || !targetIdentityType || !isValidUuid(targetIdentityId) || !isValidIdentityType(targetIdentityType)) {
      res.status(400).json({ code: "unknown_error", message: "A valid target member is required." });
      return;
    }
    await transferOwnership(toIdentity(req), code, { type: targetIdentityType, id: targetIdentityId });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.patch("/api/workspaces/:code/members/role", resolveIdentity, moderateRateLimit, async (req: Request, res: Response) => {
  try {
    const code = requireValidCode(req, res);
    if (!code) return;
    const { targetIdentityId, targetIdentityType, role } = req.body as UpdateMemberRoleRequest;
    if (
      !targetIdentityId ||
      !targetIdentityType ||
      !role ||
      !isValidUuid(targetIdentityId) ||
      !isValidIdentityType(targetIdentityType) ||
      !isAssignableRole(role)
    ) {
      res.status(400).json({ code: "unknown_error", message: "A valid target member and role are required." });
      return;
    }
    await updateMemberRole(toIdentity(req), code, { type: targetIdentityType, id: targetIdentityId }, role);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});
