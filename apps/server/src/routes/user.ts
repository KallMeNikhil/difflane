import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { handleRouteError as handleAuthError } from "../middleware/routeHelpers.js";
import { changePassword, deleteAccount, toPublicUser, updateProfile } from "../auth/authService.js";
import { identityStore } from "../db/index.js";

export const userRouter = Router();

userRouter.get(
  "/api/user/me",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await identityStore.findUserById(req.authUser!.sub);
    if (!user) {
      res.status(404).json({ code: "unknown_error", message: "User not found." });
      return;
    }
    res.json(await toPublicUser(user));
  }),
);

userRouter.patch("/api/user/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const { displayName, username } = req.body as { displayName?: string; username?: string };
    const user = await updateProfile(req.authUser!.sub, { displayName, username });
    res.json(await toPublicUser(user));
  } catch (error) {
    handleAuthError(error, res);
  }
});

userRouter.post("/api/user/password", requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ code: "unknown_error", message: "Current and new password are required." });
      return;
    }
    await changePassword(req.authUser!.sub, currentPassword, newPassword);
    res.status(204).send();
  } catch (error) {
    handleAuthError(error, res);
  }
});

userRouter.delete(
  "/api/user/me",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await deleteAccount(req.authUser!.sub);
    res.status(204).send();
  }),
);
