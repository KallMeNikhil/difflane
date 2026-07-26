import type { OAuthProvider } from "@difflane/shared-types";
import { env } from "../config/env.js";
import { AuthError } from "./AuthError.js";

export interface OAuthIdentity {
  providerAccountId: string;
  email: string;
  displayName: string;
}

function providerConfig(provider: OAuthProvider) {
  return provider === "google" ? env.oauth.google : env.oauth.github;
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  const config = providerConfig(provider);
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export function buildAuthorizationUrl(provider: OAuthProvider, state: string): string {
  const config = providerConfig(provider);
  if (!isProviderConfigured(provider)) {
    throw new AuthError("provider_unavailable", `${provider} sign-in is not configured in this environment.`, 503);
  }
  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForIdentity(provider: OAuthProvider, code: string): Promise<OAuthIdentity> {
  if (!isProviderConfigured(provider)) {
    throw new AuthError("provider_unavailable", `${provider} sign-in is not configured in this environment.`, 503);
  }

  const config = providerConfig(provider);
  try {
    if (provider === "google") {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: "authorization_code",
          code,
        }),
      });
      if (!tokenResponse.ok) {
        throw new AuthError("provider_error", "Google rejected the authorization code.", 502);
      }
      const tokenBody = (await tokenResponse.json()) as { access_token: string };
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      });
      if (!profileResponse.ok) {
        throw new AuthError("provider_error", "Unable to load your Google profile.", 502);
      }
      const profile = (await profileResponse.json()) as { sub: string; email: string; name?: string };
      return { providerAccountId: profile.sub, email: profile.email, displayName: profile.name ?? profile.email };
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
      }),
    });
    if (!tokenResponse.ok) {
      throw new AuthError("provider_error", "GitHub rejected the authorization code.", 502);
    }
    const tokenBody = (await tokenResponse.json()) as { access_token: string };
    const profileResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    if (!profileResponse.ok) {
      throw new AuthError("provider_error", "Unable to load your GitHub profile.", 502);
    }
    const profile = (await profileResponse.json()) as { id: number; login: string; name?: string; email?: string | null };
    const email = profile.email ?? `${profile.login}@users.noreply.github.com`;
    return { providerAccountId: String(profile.id), email, displayName: profile.name ?? profile.login };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError("network_error", "Unable to reach the authentication provider.", 502);
  }
}
