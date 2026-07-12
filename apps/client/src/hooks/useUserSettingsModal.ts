import { createContext, useContext } from "react";

export interface UserSettingsModalContextValue {
  isOpen: boolean;
  openUserSettings: () => void;
  closeUserSettings: () => void;
}

export const UserSettingsModalContext = createContext<UserSettingsModalContextValue | undefined>(undefined);

export function useUserSettingsModal(): UserSettingsModalContextValue {
  const context = useContext(UserSettingsModalContext);
  if (!context) {
    throw new Error("useUserSettingsModal must be used within a UserSettingsModalProvider");
  }
  return context;
}
