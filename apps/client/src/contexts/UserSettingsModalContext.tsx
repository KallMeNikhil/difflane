import { useCallback, useMemo, useState, type ReactNode } from "react";
import { UserSettingsModalContext, type UserSettingsModalContextValue } from "../hooks/useUserSettingsModal";

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
