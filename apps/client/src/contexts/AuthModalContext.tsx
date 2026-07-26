import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AuthModalContext, type AuthModalContextValue } from "../hooks/useAuthModal";

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isGuestUpgradeOpen, setGuestUpgradeOpen] = useState(false);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isSignUpOpen, setSignUpOpen] = useState(false);

  const openGuestUpgrade = useCallback(() => setGuestUpgradeOpen(true), []);
  const closeGuestUpgrade = useCallback(() => setGuestUpgradeOpen(false), []);
  const openSignIn = useCallback(() => setSignInOpen(true), []);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);
  const openSignUp = useCallback(() => setSignUpOpen(true), []);
  const closeSignUp = useCallback(() => setSignUpOpen(false), []);

  const value = useMemo<AuthModalContextValue>(
    () => ({
      isGuestUpgradeOpen,
      openGuestUpgrade,
      closeGuestUpgrade,
      isSignInOpen,
      openSignIn,
      closeSignIn,
      isSignUpOpen,
      openSignUp,
      closeSignUp,
    }),
    [isGuestUpgradeOpen, openGuestUpgrade, closeGuestUpgrade, isSignInOpen, openSignIn, closeSignIn, isSignUpOpen, openSignUp, closeSignUp],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}
