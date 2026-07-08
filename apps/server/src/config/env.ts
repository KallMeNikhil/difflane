function readPort(): number {
  const raw = process.env.PORT;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 4000;
}

export const env = {
  port: readPort(),
  corsOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:7777",
};
