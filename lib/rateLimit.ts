import { createHmac, randomBytes } from "node:crypto";
import { db } from "./db";

export type Limit = { name: string; max: number; windowMs: number };

/** Per-client request budgets for the rooms API. */
export const LIMITS = {
  create: { name: "create", max: 10, windowMs: 60 * 60_000 },
  read: { name: "read", max: 120, windowMs: 60_000 },
  host: { name: "host", max: 20, windowMs: 60_000 },
} satisfies Record<string, Limit>;

let secret = process.env.RATE_LIMIT_SECRET;
if (!secret) {
  // Without a configured secret, limits still work but reset whenever the server restarts.
  secret = randomBytes(32).toString("hex");
  console.warn("rate limit: RATE_LIMIT_SECRET is not set; using a per-process secret");
}

/** The client's address as the host platform reports it. Only trustworthy behind a proxy that sets it (e.g. Vercel). */
function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Count one request against `limit`, in a fixed window. Returns 0 when allowed, otherwise the seconds until
 * the window resets. Keys are keyed hashes of the address, so raw IPs are never stored.
 */
export async function hit(req: Request, limit: Limit): Promise<number> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / limit.windowMs) * limit.windowMs);
  const key = createHmac("sha256", secret!).update(`${limit.name}:${clientIp(req)}`).digest("hex").slice(0, 32);
  const rows = await db().$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start = EXCLUDED.window_start THEN rate_limits.count + 1 ELSE 1 END,
      window_start = EXCLUDED.window_start
    RETURNING count`;
  const count = rows[0]?.count ?? 0;
  return count > limit.max ? Math.ceil((windowStart.getTime() + limit.windowMs - now) / 1000) : 0;
}
