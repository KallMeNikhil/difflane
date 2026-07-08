export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface AwarenessState {
  userId: string;
  displayName: string;
  initials: string;
  color: string;
  activeFileId: string | null;
}
