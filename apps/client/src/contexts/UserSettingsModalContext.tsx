import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface UserSettingsModalContextValue {
  isOpen: boolean;
  openUserSettings: () => void;
  closeUserSettings: () => void;
}

const UserSettingsModalContext = createContext<UserSettingsModalContextValue | undefined>(undefined);

export function UserSettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  const openUserSettings = useCallback(() => setOpen(true), []);
  const closeUserSettings = useCallback(() => setOpen(false), []);

  const value = useMemo<UserSettingsModalContextValue>(
    () => ({ isOpen, openUserSettings, closeUserSettings }),
    [isOpen, openUserSettings, closeUserSettings],
  );

  return <UserSettingsModalContext.Provider value={value}>{children}</UserSettingsModalContext.Provider>;
}

export function useUserSettingsModal(): UserSettingsModalContextValue {
  const context = useContext(UserSettingsModalContext);
  if (!context) {
    throw new Error("useUserSettingsModal must be used within a UserSettingsModalProvider");
  }
  return context;
}
