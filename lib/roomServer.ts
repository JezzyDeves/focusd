import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Room } from "./generated/prisma/client";
import { hit, type Limit } from "./rateLimit";
import type { RoomInfo } from "./rooms";

/** Rooms nobody has opened for this long are deleted. */
export const IDLE_MS = 30 * 24 * 60 * 60_000;

/** No more rooms are created past this many, so a flood of requests can't grow the table without bound. */
export const MAX_ROOMS = 10_000;

/** Request bodies are a token and a few small fields; anything bigger is refused unread. */
const MAX_BODY_BYTES = 2048;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export const newRoomId = () => Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const newHostToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const tokenMatches = (token: string, hash: string) => {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
};

export function toInfo(room: Room): RoomInfo {
  const { syncMode, syncStartAt, syncEndAt } = room;
  return {
    id: room.id,
    session:
      syncMode && syncStartAt && syncEndAt
        ? { mode: syncMode, startAt: syncStartAt.getTime(), endAt: syncEndAt.getTime(), checkins: room.syncCheckins }
        : null,
    now: Date.now(),
  };
}

export const fail = (status: number, error: string, headers?: HeadersInit) => NextResponse.json({ error }, { status, headers });

/** Keep credentials in connection strings out of the logs. */
const redact = (s: string) => s.replace(/\/\/[^/\s@]*@/g, "//<redacted>@");

/**
 * Run a handler after counting the request against `limit`. A client over its budget gets a 429, and a missing
 * or unreachable database becomes a 503 instead of a crash.
 */
export async function guarded(req: Request, limit: Limit, run: () => Promise<Response>) {
  try {
    const wait = await hit(req, limit);
    if (wait > 0) return fail(429, "too many requests, slow down", { "retry-after": String(wait) });
    return await run();
  } catch (e) {
    console.error("rooms api:", e instanceof Error ? redact(`${e.name}: ${e.message}`) : "unknown error");
    return fail(503, "rooms are unavailable right now");
  }
}

/** Parse a small JSON body, or null when it's missing, too big or not JSON. */
export async function readJson<T>(req: Request): Promise<Partial<T> | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return null;
  const text = await req.text().catch(() => "");
  if (!text || text.length > MAX_BODY_BYTES) return null;
  try {
    const body: unknown = JSON.parse(text);
    return body && typeof body === "object" ? (body as Partial<T>) : null;
  } catch {
    return null;
  }
}
