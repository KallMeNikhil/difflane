try {
  process.loadEnvFile();
} catch {
  // ignored
}

function readPort(): number {
  const raw = process.env.PORT;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 4000;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: readPort(),
  corsOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:7777",
  databaseUrl: process.env.DATABASE_URL ?? "",
  auth: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET ?? "difflane-dev-access-secret",
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET ?? "difflane-dev-refresh-secret",
    accessTokenTtlSeconds: readNumber("JWT_ACCESS_TTL_SECONDS", 15 * 60),
    refreshTokenTtlSeconds: readNumber("JWT_REFRESH_TTL_SECONDS", 30 * 24 * 60 * 60),
    refreshCookieName: "difflane_refresh_token",
    guestCookieName: "difflane_guest_id",
    bcryptRounds: readNumber("BCRYPT_ROUNDS", 10),
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
    },
    github: {
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "",
      redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI ?? "",
    },
  },
};
