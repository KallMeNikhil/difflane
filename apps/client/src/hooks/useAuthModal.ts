import { createContext, useContext } from "react";

export interface AuthModalContextValue {
  isGuestUpgradeOpen: boolean;
  openGuestUpgrade: () => void;
  closeGuestUpgrade: () => void;
  isSignInOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
  isSignUpOpen: boolean;
  openSignUp: () => void;
  closeSignUp: () => void;
}

export const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

export function useAuthModal(): AuthModalContextValue {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
