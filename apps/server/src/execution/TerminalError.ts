import { AuthError } from "../auth/AuthError.js";

export class TerminalError extends Error {}

export const TERMINAL_SAFE_MESSAGES = {
  authRequired: "A signed-in or guest session is required to open a terminal.",
  sessionExpired: "Your session has expired. Please refresh and try again.",
  invalidWorkspace: "Invalid workspace.",
  workspaceNotFound: "Workspace not found.",
  rateLimited: "You're opening terminals too frequently. Please wait a moment.",
  tooManySessions: "You've reached the maximum number of open terminal sessions.",
  sandboxUnavailable: "A terminal session could not be started right now. Please try again shortly.",
  generic: "Unable to start a terminal session.",
} as const;

export function toSafeTerminalMessage(error: unknown, fallback: string = TERMINAL_SAFE_MESSAGES.generic): string {
  if (error instanceof TerminalError || error instanceof AuthError) {
    return error.message;
  }
  return fallback;
}
