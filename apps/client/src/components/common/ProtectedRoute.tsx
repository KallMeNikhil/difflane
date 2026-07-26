import type { ReactNode } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { PlaceholderNotice } from "./PlaceholderNotice";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useCurrentUser();

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <PlaceholderNotice icon="sync" title="Loading" description="Preparing your workspace…" />
      </div>
    );
  }

  return <>{children}</>;
}
