import { createContext, useContext } from "react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import type { MemberRole, RoomParticipant } from "@difflane/shared-types";
import type { Collaborator } from "../types/workspace";
import type { YjsSocketProviderStatus } from "../lib/yjs/YjsSocketProvider";

export type RoomConnectionStatus = "joining" | "ready" | "error";
export type WorkspacePersistenceStatus = "pending" | "saved" | "failed";

export interface IncomingAttentionRequest {
  id: string;
  fromConnectionId: string;
  fromUserId: string;
  fromDisplayName: string;
  fromInitials: string;
  fileId: string | null;
  fileLabel: string | null;
  receivedAt: string;
  expiresAt: string;
}

export interface RoomContextValue {
  status: RoomConnectionStatus;
  errorMessage: string | null;
  roomCode: string;
  connectionStatus: YjsSocketProviderStatus | null;
  participants: RoomParticipant[];
  collaborators: Collaborator[];
  selfRole: MemberRole;
  selfConnectionId: string | null;
  doc: Y.Doc | null;
  awareness: Awareness | null;
  setActiveFileId: (fileId: string | null) => void;
  markTyping: () => void;
  persistenceStatus: WorkspacePersistenceStatus;
  lastPersistedAt: string | null;
  persistenceErrorMessage: string | null;
  followedUserId: string | null;
  followUser: (userId: string) => void;
  unfollowUser: () => void;
  requestAttention: (targetConnectionId: string, context: { fileId: string | null; fileLabel: string | null }) => void;
  attentionCooldownIds: string[];
  incomingAttention: IncomingAttentionRequest | null;
  dismissIncomingAttention: () => void;
}

export const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export function useRoom(): RoomContextValue {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}
