import type { Awareness } from "y-protocols/awareness";
import type { ActivityState, AwarenessState, ConnectionStatus, MemberRole, ParticipantIdentityType } from "@difflane/shared-types";
import type { Collaborator } from "../types/workspace";

export interface LocalIdentity {
  userId: string;
  identityType: ParticipantIdentityType;
  displayName: string;
  initials: string;
  color: string;
  role: MemberRole;
}

export interface LocalPresenceSignals {
  activeFileId: string | null;
  isTyping: boolean;
  lastEditedAt: string | null;
  lastActiveAt: string;
}

export const TYPING_CLEAR_MS = 1500;
export const EDITING_WINDOW_MS = 10_000;
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
export const HEARTBEAT_MIN_INTERVAL_MS = 15_000;
export const PRESENCE_TICK_MS = 5000;

const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
};

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export function buildLocalAwarenessState(identity: LocalIdentity, signals: LocalPresenceSignals): AwarenessState {
  return {
    userId: identity.userId,
    identityType: identity.identityType,
    displayName: identity.displayName,
    initials: identity.initials,
    color: identity.color,
    role: identity.role,
    activeFileId: signals.activeFileId,
    isTyping: signals.isTyping,
    lastEditedAt: signals.lastEditedAt,
    lastActiveAt: signals.lastActiveAt,
  };
}

export function deriveActivityState(state: Partial<AwarenessState>, now: number): ActivityState {
  if (state.isTyping) {
    return "typing";
  }
  if (state.lastEditedAt && now - new Date(state.lastEditedAt).getTime() <= EDITING_WINDOW_MS) {
    return "editing";
  }
  const lastActiveAt = state.lastActiveAt ? new Date(state.lastActiveAt).getTime() : now;
  if (now - lastActiveAt > IDLE_THRESHOLD_MS) {
    return "idle";
  }
  return "viewing";
}

export function readRemoteCollaborators(awareness: Awareness, now: number = Date.now()): Collaborator[] {
  const collaborators: Collaborator[] = [];
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.doc.clientID) {
      return;
    }
    const awarenessState = state as Partial<AwarenessState>;
    if (!awarenessState.userId) {
      return;
    }
    collaborators.push({
      id: awarenessState.userId,
      connectionClientId: clientId,
      initials: awarenessState.initials ?? "?",
      name: awarenessState.displayName ?? "Guest",
      role: awarenessState.role ? ROLE_LABELS[awarenessState.role] : "Collaborator",
      roleValue: awarenessState.role ?? "viewer",
      presence: "online",
      activeFileId: awarenessState.activeFileId ?? null,
      activityState: deriveActivityState(awarenessState, now),
      lastActiveAt: awarenessState.lastActiveAt ?? new Date(now).toISOString(),
      color: awarenessState.color ?? "#8d90a0",
    });
  });
  return collaborators;
}

export function describeConnectionStatus(status: ConnectionStatus): string {
  return CONNECTION_STATUS_LABELS[status];
}

export function describeActivityState(state: ActivityState, activeFileName: string | null): string {
  switch (state) {
    case "typing":
      return "Typing...";
    case "editing":
      return activeFileName ? `Editing ${activeFileName}` : "Editing";
    case "viewing":
      return activeFileName ? `Viewing ${activeFileName}` : "Viewing Workspace";
    case "idle":
    default:
      return "Idle";
  }
}

export function formatLastActiveLabel(iso: string, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 10) {
    return "Last active just now";
  }
  if (seconds < 60) {
    return `Last active ${seconds} sec ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `Last active ${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  return `Last active ${hours} hr ago`;
}
