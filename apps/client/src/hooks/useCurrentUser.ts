import { createContext, useContext } from "react";

export interface CurrentUserIdentity {
  userId: string;
  displayName: string;
  initials: string;
}

export interface CurrentUserContextValue extends CurrentUserIdentity {
  setDisplayName: (displayName: string) => void;
}

export const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}
