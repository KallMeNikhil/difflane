export const ROUTES = {
  landing: "/",
  dashboard: "/dashboard",
  createRoom: "/create-room",
  joinRoom: "/join-room",
  workspace: "/workspace/:roomCode?",
  workspaceRoot: "/workspace",
  history: "/history",
  settings: "/settings",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export function buildWorkspacePath(roomCode: string): string {
  return `/workspace/${roomCode}`;
}
