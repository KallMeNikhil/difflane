import { createContext, useContext } from "react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import type { MemberRole, RoomParticipant } from "@difflane/shared-types";
import type { Collaborator } from "../types/workspace";
import type { YjsSocketProviderStatus } from "../lib/yjs/YjsSocketProvider";

export type RoomConnectionStatus = "joining" | "ready" | "error";
export type WorkspacePersistenceStatus = "pending" | "saved" | "failed";

export interface RoomContextValue {
  status: RoomConnectionStatus;
  errorMessage: string | null;
  roomCode: string;
  connectionStatus: YjsSocketProviderStatus | null;
  participants: RoomParticipant[];
  collaborators: Collaborator[];
  selfRole: MemberRole;
  doc: Y.Doc | null;
  awareness: Awareness | null;
  setActiveFileId: (fileId: string | null) => void;
  persistenceStatus: WorkspacePersistenceStatus;
  lastPersistedAt: string | null;
  persistenceErrorMessage: string | null;
}

export const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export function useRoom(): RoomContextValue {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}
