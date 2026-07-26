import { Router, type Request, type Response } from "express";
import type { TransferOwnershipRequest, UpdateMemberRoleRequest } from "@difflane/shared-types";
import { resolveIdentity } from "../middleware/resolveIdentity.js";
import { AuthError } from "../auth/AuthError.js";
import {
  createWorkspace,
  deleteWorkspace,
  getDashboard,
  getWorkspaceByCode,
  requireMembership,
  setWorkspaceFlag,
  transferOwnership,
  updateMemberRole,
} from "../workspaces/workspaceService.js";
import type { Identity } from "../workspaces/workspaceService.js";

export const workspaceRouter = Router();

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

workspaceRouter.post("/api/workspaces", resolveIdentity, async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    const workspace = await createWorkspace(toIdentity(req), name ?? "Untitled Workspace");
    res.status(201).json({ workspaceCode: workspace.code, name: workspace.name });
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.get("/api/workspaces/dashboard", resolveIdentity, async (req: Request, res: Response) => {
  try {
    const dashboard = await getDashboard(toIdentity(req));
    res.json(dashboard);
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.get("/api/workspaces/:code", resolveIdentity, async (req: Request, res: Response) => {
  try {
    const workspace = await getWorkspaceByCode(req.params.code);
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

workspaceRouter.delete("/api/workspaces/:code", resolveIdentity, async (req: Request, res: Response) => {
  try {
    await deleteWorkspace(toIdentity(req), req.params.code);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.patch("/api/workspaces/:code/pin", resolveIdentity, async (req: Request, res: Response) => {
  try {
    const { pinned } = req.body as { pinned?: boolean };
    await setWorkspaceFlag(toIdentity(req), req.params.code, { pinned: Boolean(pinned) });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.patch("/api/workspaces/:code/archive", resolveIdentity, async (req: Request, res: Response) => {
  try {
    const { archived } = req.body as { archived?: boolean };
    await setWorkspaceFlag(toIdentity(req), req.params.code, { archived: Boolean(archived) });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.post("/api/workspaces/:code/transfer-ownership", resolveIdentity, async (req: Request, res: Response) => {
  try {
    const { targetIdentityId, targetIdentityType } = req.body as TransferOwnershipRequest;
    if (!targetIdentityId || !targetIdentityType) {
      res.status(400).json({ code: "unknown_error", message: "Target member is required." });
      return;
    }
    await transferOwnership(toIdentity(req), req.params.code, { type: targetIdentityType, id: targetIdentityId });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

workspaceRouter.patch("/api/workspaces/:code/members/role", resolveIdentity, async (req: Request, res: Response) => {
  try {
    const { targetIdentityId, targetIdentityType, role } = req.body as UpdateMemberRoleRequest;
    if (!targetIdentityId || !targetIdentityType || !role) {
      res.status(400).json({ code: "unknown_error", message: "Target member and role are required." });
      return;
    }
    await updateMemberRole(toIdentity(req), req.params.code, { type: targetIdentityType, id: targetIdentityId }, role);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});
