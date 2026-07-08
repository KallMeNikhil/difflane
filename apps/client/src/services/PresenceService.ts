import type { Awareness } from "y-protocols/awareness";
import type { AwarenessState, ConnectionStatus } from "@difflane/shared-types";
import type { Collaborator } from "../types/workspace";

export interface LocalIdentity {
  userId: string;
  displayName: string;
  initials: string;
  color: string;
}

const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
};

export function buildLocalAwarenessState(identity: LocalIdentity, activeFileId: string | null): AwarenessState {
  return {
    userId: identity.userId,
    displayName: identity.displayName,
    initials: identity.initials,
    color: identity.color,
    activeFileId,
  };
}

export function readRemoteCollaborators(awareness: Awareness): Collaborator[] {
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
      initials: awarenessState.initials ?? "?",
      name: awarenessState.displayName ?? "Guest",
      role: "Collaborator",
      presence: "online",
    });
  });
  return collaborators;
}

export function describeConnectionStatus(status: ConnectionStatus): string {
  return CONNECTION_STATUS_LABELS[status];
}
