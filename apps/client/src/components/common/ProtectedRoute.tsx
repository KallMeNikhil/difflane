import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { PlaceholderNotice } from "./PlaceholderNotice";
import { ROUTES } from "../../constants/routes";

interface LoadingCopy {
  title: string;
  description: string;
}

const DEFAULT_LOADING_COPY: LoadingCopy = { title: "Loading", description: "Loading…" };

const ROUTE_LOADING_COPY: Array<[string, LoadingCopy]> = [
  [ROUTES.workspaceRoot, { title: "Connecting", description: "Preparing your workspace…" }],
  [ROUTES.createRoom, { title: "Connecting", description: "Preparing to create your workspace…" }],
  [ROUTES.joinRoom, { title: "Connecting", description: "Preparing to join your workspace…" }],
  [ROUTES.history, { title: "Loading", description: "Loading session history…" }],
  [ROUTES.dashboard, { title: "Loading", description: "Loading your dashboard…" }],
  [ROUTES.settings, { title: "Loading", description: "Loading settings…" }],
  [ROUTES.profile, { title: "Loading", description: "Loading your profile…" }],
];

function resolveLoadingCopy(pathname: string): LoadingCopy {
  const match = ROUTE_LOADING_COPY.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : DEFAULT_LOADING_COPY;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useCurrentUser();
  const { pathname } = useLocation();

  if (status === "loading") {
    const { title, description } = resolveLoadingCopy(pathname);
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <PlaceholderNotice icon="sync" title={title} description={description} />
      </div>
    );
  }

  return <>{children}</>;
}
