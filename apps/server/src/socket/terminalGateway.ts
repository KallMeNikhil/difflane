import type { Server, Socket } from "socket.io";
import { parseCookie } from "cookie";
import {
  TERMINAL_SOCKET_EVENTS,
  TERMINAL_LIMITS,
  type TerminalCreatePayload,
  type TerminalDataPayload,
  type TerminalErrorPayload,
  type TerminalExitPayload,
  type TerminalReadyPayload,
  type TerminalResizePayload,
} from "@difflane/shared-types";
import { env } from "../config/env.js";
import { verifyAccessTokenClaims } from "../auth/authService.js";
import { identityStore } from "../db/index.js";
import { getWorkspaceByCode, isValidWorkspaceCode, requireRole, MUTATING_ROLES } from "../workspaces/workspaceService.js";
import type { Identity } from "../workspaces/workspaceService.js";
import { TerminalSandboxSession } from "../execution/terminalSandbox.js";

interface RateState {
  count: number;
  windowStart: number;
}

const terminalCreateRate = new Map<string, RateState>();
const terminalInputRate = new Map<string, RateState>();

function isRateLimited(map: Map<string, RateState>, key: string, max: number): boolean {
  const now = Date.now();
  const state = map.get(key);
  if (!state || now - state.windowStart > env.socketRateLimit.windowMs) {
    map.set(key, { count: 1, windowStart: now });
    return false;
  }
  state.count += 1;
  return state.count > max;
}

async function resolveTerminalIdentity(socket: Socket, payload: TerminalCreatePayload): Promise<Identity> {
  if (payload.accessToken) {
    const claims = verifyAccessTokenClaims(payload.accessToken);
    if (!claims) {
      throw new Error("Your session has expired. Please refresh and try again.");
    }
    const user = await identityStore.findUserById(claims.sub);
    if (!user) {
      throw new Error("Your session has expired. Please refresh and try again.");
    }
    return { type: "user", id: user.id };
  }

  const rawCookie = socket.handshake.headers.cookie;
  const cookieGuestId = rawCookie ? parseCookie(rawCookie)[env.auth.guestCookieName] : undefined;
  const guestId = cookieGuestId ?? payload.guestId;
  if (guestId) {
    const guest = await identityStore.findGuestSession(guestId);
    if (guest) {
      return { type: "guest", id: guest.id };
    }
  }

  throw new Error("A signed-in or guest session is required to open a terminal.");
}

export function registerTerminalGateway(_io: Server, socket: Socket): void {
  const sessions = new Map<string, TerminalSandboxSession>();

  socket.on(TERMINAL_SOCKET_EVENTS.CREATE, (payload: TerminalCreatePayload) => {
    void (async () => {
      const errorPayload: TerminalErrorPayload = { sessionId: null, message: "" };
      try {
        if (isRateLimited(terminalCreateRate, socket.id, env.socketRateLimit.terminalCreateMax)) {
          errorPayload.message = "You're opening terminals too frequently. Please wait a moment.";
          socket.emit(TERMINAL_SOCKET_EVENTS.ERROR, errorPayload);
          return;
        }
        if (sessions.size >= TERMINAL_LIMITS.maxSessionsPerConnection) {
          errorPayload.message = "You've reached the maximum number of open terminal sessions.";
          socket.emit(TERMINAL_SOCKET_EVENTS.ERROR, errorPayload);
          return;
        }
        if (!isValidWorkspaceCode(payload.workspaceCode)) {
          errorPayload.message = "Invalid workspace.";
          socket.emit(TERMINAL_SOCKET_EVENTS.ERROR, errorPayload);
          return;
        }

        const workspace = await getWorkspaceByCode(payload.workspaceCode);
        if (!workspace) {
          errorPayload.message = "Workspace not found.";
          socket.emit(TERMINAL_SOCKET_EVENTS.ERROR, errorPayload);
          return;
        }

        const identity = await resolveTerminalIdentity(socket, payload);
        await requireRole(identity, workspace.id, MUTATING_ROLES);

        const session = new TerminalSandboxSession();
        session.onDataEvent((data) => {
          const dataPayload: TerminalDataPayload = { sessionId: session.sessionId, data };
          socket.emit(TERMINAL_SOCKET_EVENTS.DATA, dataPayload);
        });
        session.onExitEvent((exitCode, reason) => {
          const exitPayload: TerminalExitPayload = { sessionId: session.sessionId, exitCode, reason };
          socket.emit(TERMINAL_SOCKET_EVENTS.EXIT, exitPayload);
          sessions.delete(session.sessionId);
        });

        await session.start();
        sessions.set(session.sessionId, session);

        const readyPayload: TerminalReadyPayload = { sessionId: session.sessionId };
        socket.emit(TERMINAL_SOCKET_EVENTS.READY, readyPayload);
      } catch (error) {
        errorPayload.message = error instanceof Error ? error.message : "Unable to start a terminal session.";
        socket.emit(TERMINAL_SOCKET_EVENTS.ERROR, errorPayload);
      }
    })();
  });

  socket.on(TERMINAL_SOCKET_EVENTS.INPUT, (payload: TerminalDataPayload) => {
    void (async () => {
      if (isRateLimited(terminalInputRate, socket.id, env.socketRateLimit.terminalInputMax)) {
        return;
      }
      const session = sessions.get(payload.sessionId);
      if (!session || typeof payload.data !== "string") {
        return;
      }
      await session.handleLine(payload.data);
    })();
  });

  socket.on(TERMINAL_SOCKET_EVENTS.RESIZE, (_payload: TerminalResizePayload) => {
    // Cols/rows are advisory only for the line-buffered sandbox shell; no-op is intentional.
  });

  socket.on(TERMINAL_SOCKET_EVENTS.CLOSE, (payload: { sessionId: string }) => {
    const session = sessions.get(payload.sessionId);
    if (session) {
      void session.destroy("closed");
      sessions.delete(payload.sessionId);
    }
  });

  socket.on("disconnect", () => {
    for (const session of sessions.values()) {
      void session.destroy("closed");
    }
    sessions.clear();
    terminalCreateRate.delete(socket.id);
    terminalInputRate.delete(socket.id);
  });
}
