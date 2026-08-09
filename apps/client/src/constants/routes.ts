export const ROUTES = {
  landing: "/",
  dashboard: "/dashboard",
  createRoom: "/create-room",
  joinRoom: "/join-room",
  workspace: "/workspace/:roomCode?",
  workspaceRoot: "/workspace",
  history: "/history",
  settings: "/settings",
  profile: "/profile",
  signIn: "/sign-in",
  createAccount: "/create-account",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  oauthCallback: "/auth/callback/:provider",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export function buildWorkspacePath(roomCode: string): string {
  return `/workspace/${roomCode}`;
}
