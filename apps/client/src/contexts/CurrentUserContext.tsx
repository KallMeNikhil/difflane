import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { readStoredDisplayName, writeStoredDisplayName } from "../services/UserPreferencesService";

export interface CurrentUserIdentity {
  userId: string;
  displayName: string;
  initials: string;
}

interface CurrentUserContextValue extends CurrentUserIdentity {
  setDisplayName: (displayName: string) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

function deriveInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : trimmed.slice(0, 2);
  return initials.toUpperCase();
}

function createUserId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `user-${Date.now()}`;
}

export function CurrentUserProvider({ children, initialDisplayName = "You" }: { children: ReactNode; initialDisplayName?: string }) {
  const [userId] = useState(createUserId);
  const [displayName, setDisplayNameState] = useState(() => readStoredDisplayName() ?? initialDisplayName);

  const setDisplayName = useCallback((next: string) => {
    setDisplayNameState(next);
    writeStoredDisplayName(next);
  }, []);

  const value = useMemo<CurrentUserContextValue>(
    () => ({ userId, displayName, initials: deriveInitials(displayName), setDisplayName }),
    [userId, displayName, setDisplayName],
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}
