export const ROUTES = {
  landing: "/",
  dashboard: "/dashboard",
  createRoom: "/create-room",
  joinRoom: "/join-room",
  workspace: "/workspace",
  history: "/history",
  settings: "/settings",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
