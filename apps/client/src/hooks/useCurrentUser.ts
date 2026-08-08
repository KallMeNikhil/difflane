import { createContext, useContext } from "react";
import type { AuthUserProfile } from "@difflane/shared-types";

export type AuthStatus = "loading" | "guest" | "authenticated";

export interface CurrentUserIdentity {
  userId: string;
  displayName: string;
  initials: string;
}

export interface CurrentUserContextValue extends CurrentUserIdentity {
  status: AuthStatus;
  isAuthenticated: boolean;
  guestId: string | null;
  user: AuthUserProfile | null;
  authError: string | null;
  setDisplayName: (displayName: string) => void;
  login: (identifier: string, password: string) => Promise<void>;
  registerAccount: (email: string, username: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeGuest: (email: string, username: string, displayName: string, password: string) => Promise<void>;
  beginOAuthFlow: (provider: "google" | "github") => Promise<void>;
  completeOAuthLogin: (provider: "google" | "github", code: string, state: string) => Promise<void>;
  updateAccountProfile: (patch: { displayName?: string; username?: string }) => Promise<void>;
  clearAuthError: () => void;
  ensureGuestSession: () => Promise<string>;
}

export const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}
