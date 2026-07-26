import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthUserProfile } from "@difflane/shared-types";
import * as AuthService from "../services/AuthService";
import { setAccessToken } from "../lib/auth/tokenStore";
import { readStoredDisplayName, writeStoredDisplayName } from "../services/UserPreferencesService";
import { CurrentUserContext, type AuthStatus, type CurrentUserContextValue } from "../hooks/useCurrentUser";

function deriveInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : trimmed.slice(0, 2);
  return initials.toUpperCase();
}

export function CurrentUserProvider({ children, initialDisplayName = "You" }: { children: ReactNode; initialDisplayName?: string }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestDisplayName, setGuestDisplayName] = useState(() => readStoredDisplayName() ?? initialDisplayName);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await AuthService.refresh();
        if (cancelled) return;
        if (session.identity.kind === "authenticated") {
          setUser(session.identity.user);
          setStatus("authenticated");
          return;
        }
      } catch {
        setAccessToken(null);
      }
      if (cancelled) return;
      try {
        const bootstrap = await AuthService.bootstrapGuest(readStoredDisplayName() ?? initialDisplayName);
        if (cancelled) return;
        setGuestId(bootstrap.identity.guest.id);
        setGuestDisplayName(bootstrap.identity.guest.displayName);
        setStatus("guest");
      } catch {
        if (cancelled) return;
        setStatus("guest");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialDisplayName]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const setDisplayName = useCallback(
    (next: string) => {
      if (status === "authenticated" && user) {
        setUser({ ...user, displayName: next, initials: deriveInitials(next) });
        AuthService.updateProfile({ displayName: next }).catch(() => {});
        return;
      }
      setGuestDisplayName(next);
      writeStoredDisplayName(next);
    },
    [status, user],
  );

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const session = await AuthService.login(email, password);
      if (session.identity.kind === "authenticated") {
        setUser(session.identity.user);
        setStatus("authenticated");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
      throw error;
    }
  }, []);

  const registerAccount = useCallback(async (email: string, username: string, displayName: string, password: string) => {
    setAuthError(null);
    try {
      const session = await AuthService.register(email, username, displayName, password);
      if (session.identity.kind === "authenticated") {
        setUser(session.identity.user);
        setStatus("authenticated");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to create your account.");
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } finally {
      setUser(null);
      setStatus("loading");
      try {
        const bootstrap = await AuthService.bootstrapGuest(initialDisplayName);
        setGuestId(bootstrap.identity.guest.id);
        setGuestDisplayName(bootstrap.identity.guest.displayName);
      } finally {
        setStatus("guest");
      }
    }
  }, [initialDisplayName]);

  const upgradeGuest = useCallback(
    async (email: string, username: string, displayName: string, password: string) => {
      if (!guestId) {
        throw new Error("No active guest session to upgrade.");
      }
      setAuthError(null);
      try {
        const session = await AuthService.upgradeGuest(guestId, email, username, displayName, password);
        if (session.identity.kind === "authenticated") {
          setUser(session.identity.user);
          setGuestId(null);
          setStatus("authenticated");
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Unable to upgrade your guest session.");
        throw error;
      }
    },
    [guestId],
  );

  const beginOAuthFlow = useCallback(
    async (provider: "google" | "github") => {
      setAuthError(null);
      try {
        const url = await AuthService.beginOAuthFlow(provider, status === "authenticated" ? null : guestId);
        window.location.assign(url);
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : `Unable to start ${provider} sign-in.`);
        throw error;
      }
    },
    [status, guestId],
  );

  const completeOAuthLogin = useCallback(async (provider: "google" | "github", code: string, state: string) => {
    setAuthError(null);
    try {
      const session = await AuthService.completeOAuthFlow(provider, code, state);
      if (session.identity.kind === "authenticated") {
        setUser(session.identity.user);
        setGuestId(null);
        setStatus("authenticated");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : `Unable to complete ${provider} sign-in.`);
      throw error;
    }
  }, []);

  const updateAccountProfile = useCallback(
    async (patch: { displayName?: string; username?: string }) => {
      if (status !== "authenticated") {
        return;
      }
      const updated = await AuthService.updateProfile(patch);
      setUser(updated);
    },
    [status],
  );

  const value = useMemo<CurrentUserContextValue>(() => {
    if (status === "authenticated" && user) {
      return {
        status,
        userId: user.id,
        displayName: user.displayName,
        initials: user.initials,
        isAuthenticated: true,
        guestId: null,
        user,
        authError,
        setDisplayName,
        login,
        registerAccount,
        logout,
        upgradeGuest,
        beginOAuthFlow,
        completeOAuthLogin,
        updateAccountProfile,
        clearAuthError,
      };
    }
    return {
      status,
      userId: guestId ?? "pending-guest",
      displayName: guestDisplayName,
      initials: deriveInitials(guestDisplayName),
      isAuthenticated: false,
      guestId,
      user: null,
      authError,
      setDisplayName,
      login,
      registerAccount,
      logout,
      upgradeGuest,
      beginOAuthFlow,
      completeOAuthLogin,
      updateAccountProfile,
      clearAuthError,
    };
  }, [status, user, guestId, guestDisplayName, authError, setDisplayName, login, registerAccount, logout, upgradeGuest, beginOAuthFlow, completeOAuthLogin, updateAccountProfile, clearAuthError]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
