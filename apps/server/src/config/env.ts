try {
  process.loadEnvFile();
} catch {
}

const isProduction = process.env.NODE_ENV === "production";

const DISALLOWED_JUDGE0_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const DEFAULT_JUDGE0_BASE_URL = "https://ce.judge0.com";

function readBaseUrl(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  return (raw && raw.length > 0 ? raw : fallback).replace(/\/+$/, "");
}

function parseUrlSafely(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const INSECURE_DEV_ACCESS_SECRET = "difflane-dev-access-secret";
const INSECURE_DEV_REFRESH_SECRET = "difflane-dev-refresh-secret";
const MIN_SECRET_LENGTH = 32;

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

function readSecret(name: string, devFallback: string): string {
  const raw = process.env[name];
  if (raw && raw.length > 0) {
    return raw;
  }
  if (isProduction) {
    return "";
  }
  return devFallback;
}

export const env = {
  port: readPort(),
  corsOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:7777",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction,
  auth: {
    accessTokenSecret: readSecret("JWT_ACCESS_SECRET", INSECURE_DEV_ACCESS_SECRET),
    refreshTokenSecret: readSecret("JWT_REFRESH_SECRET", INSECURE_DEV_REFRESH_SECRET),
    accessTokenTtlSeconds: readNumber("JWT_ACCESS_TTL_SECONDS", 15 * 60),
    refreshTokenTtlSeconds: readNumber("JWT_REFRESH_TTL_SECONDS", 30 * 24 * 60 * 60),
    refreshCookieName: "difflane_refresh_token",
    refreshCookiePath: "/api/auth",
    guestCookieName: "difflane_guest_id",
    guestCookiePath: "/",
    bcryptRounds: readNumber("BCRYPT_ROUNDS", 10),
    oauthStateTtlMinutes: readNumber("OAUTH_STATE_TTL_MINUTES", 10),
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
  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "",
  },
  githubApi: {
    token: process.env.GITHUB_API_TOKEN ?? "",
  },
  rateLimit: {
    strict: {
      windowMs: readNumber("RATE_LIMIT_STRICT_WINDOW_MS", 15 * 60 * 1000),
      max: readNumber("RATE_LIMIT_STRICT_MAX", 10),
    },
    moderate: {
      windowMs: readNumber("RATE_LIMIT_MODERATE_WINDOW_MS", 15 * 60 * 1000),
      max: readNumber("RATE_LIMIT_MODERATE_MAX", 60),
    },
    relaxed: {
      windowMs: readNumber("RATE_LIMIT_RELAXED_WINDOW_MS", 15 * 60 * 1000),
      max: readNumber("RATE_LIMIT_RELAXED_MAX", 300),
    },
  },
  socketRateLimit: {
    windowMs: readNumber("SOCKET_RATE_LIMIT_WINDOW_MS", 10 * 1000),
    roomJoinMax: readNumber("SOCKET_RATE_LIMIT_ROOM_JOIN_MAX", 10),
    docUpdateMax: readNumber("SOCKET_RATE_LIMIT_DOC_UPDATE_MAX", 120),
    awarenessUpdateMax: readNumber("SOCKET_RATE_LIMIT_AWARENESS_UPDATE_MAX", 240),
    attentionRequestMax: readNumber("SOCKET_RATE_LIMIT_ATTENTION_REQUEST_MAX", 6),
  },
  judge0: {
    baseUrl: readBaseUrl("JUDGE0_BASE_URL", DEFAULT_JUDGE0_BASE_URL),
    authHeader: process.env.JUDGE0_AUTH_HEADER?.trim() || "X-Auth-Token",
    authToken: process.env.JUDGE0_AUTH_TOKEN ?? "",
    requestTimeoutMs: readNumber("JUDGE0_REQUEST_TIMEOUT_MS", 15_000),
    pollIntervalMs: readNumber("JUDGE0_POLL_INTERVAL_MS", 1_000),
    pollTimeoutMs: readNumber("JUDGE0_POLL_TIMEOUT_MS", 45_000),
  },
  execution: {
    maxConcurrentPerUser: readNumber("EXECUTION_MAX_CONCURRENT_PER_USER", 2),
    maxConcurrentPerWorkspace: readNumber("EXECUTION_MAX_CONCURRENT_PER_WORKSPACE", 4),
    dailyLimitPerUser: readNumber("EXECUTION_DAILY_LIMIT_PER_USER", 40),
  },
};

export function assertProductionSecurityConfig(): void {
  if (!isProduction) {
    return;
  }
  const problems: string[] = [];
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET === INSECURE_DEV_ACCESS_SECRET) {
    problems.push("JWT_ACCESS_SECRET must be set to a unique production secret.");
  } else if (process.env.JWT_ACCESS_SECRET.length < MIN_SECRET_LENGTH) {
    problems.push(`JWT_ACCESS_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === INSECURE_DEV_REFRESH_SECRET) {
    problems.push("JWT_REFRESH_SECRET must be set to a unique production secret.");
  } else if (process.env.JWT_REFRESH_SECRET.length < MIN_SECRET_LENGTH) {
    problems.push(`JWT_REFRESH_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
  if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    problems.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must not be equal.");
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length === 0) {
    problems.push("DATABASE_URL must be set to a production database connection string.");
  }
  const parsedJudge0Url = parseUrlSafely(env.judge0.baseUrl);
  if (!parsedJudge0Url) {
    problems.push("JUDGE0_BASE_URL must be a valid URL.");
  } else if (DISALLOWED_JUDGE0_HOSTS.has(parsedJudge0Url.hostname.toLowerCase())) {
    problems.push("JUDGE0_BASE_URL must not point to localhost or a loopback address in production.");
  } else if (parsedJudge0Url.protocol !== "https:") {
    problems.push("JUDGE0_BASE_URL must use https in production.");
  }
  if (problems.length > 0) {
    throw new Error(`Refusing to start in production with insecure configuration:\n- ${problems.join("\n- ")}`);
  }
}
