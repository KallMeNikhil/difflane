import type { WhiteboardAuthor } from "./whiteboardSync";

export const WHITEBOARD_OPEN_FIELD = "whiteboardOpen";
export const WHITEBOARD_POINTER_FIELD = "whiteboardPointer";

export interface WhiteboardPointerState {
  x: number;
  y: number;
  tool?: "pointer" | "laser";
  button: "up" | "down";
  selectedElementIds: Record<string, true>;
}

export interface WhiteboardPeer {
  clientId: number;
  userId: string;
  name: string;
  initials: string;
  color: string;
  pointer: WhiteboardPointerState | null;
}

interface PeerAwarenessState {
  userId?: string;
  displayName?: string;
  initials?: string;
  color?: string;
  [WHITEBOARD_OPEN_FIELD]?: boolean;
  [WHITEBOARD_POINTER_FIELD]?: WhiteboardPointerState | null;
}

const FALLBACK_COLOR = "#8d90a0";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function readWhiteboardPeers(states: Map<number, unknown>, selfClientId: number, selfUserId: string | null): WhiteboardPeer[] {
  const byUser = new Map<string, WhiteboardPeer>();
  states.forEach((rawState, clientId) => {
    const state = rawState as PeerAwarenessState | null;
    if (clientId === selfClientId || !state?.[WHITEBOARD_OPEN_FIELD]) {
      return;
    }
    const userId = state.userId ?? `client-${clientId}`;
    if (selfUserId && userId === selfUserId) {
      return;
    }
    const name = state.displayName?.trim() || "Collaborator";
    const peer: WhiteboardPeer = {
      clientId,
      userId,
      name,
      initials: state.initials?.trim() || initialsOf(name),
      color: state.color ?? FALLBACK_COLOR,
      pointer: state[WHITEBOARD_POINTER_FIELD] ?? null,
    };
    const existing = byUser.get(userId);
    if (!existing || (!existing.pointer && peer.pointer)) {
      byUser.set(userId, peer);
    }
  });
  return Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function readLocalAuthor(state: unknown): WhiteboardAuthor | undefined {
  const local = state as PeerAwarenessState | null;
  if (!local?.userId) {
    return undefined;
  }
  return { userId: local.userId, name: local.displayName?.trim() || "Someone", color: local.color ?? FALLBACK_COLOR };
}
