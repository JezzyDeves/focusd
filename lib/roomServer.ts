import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Room } from "./generated/prisma/client";
import type { RoomInfo } from "./rooms";

/** Rooms nobody has opened for this long are deleted. */
export const IDLE_MS = 30 * 24 * 60 * 60_000;

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

export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Run a handler, turning a missing or unreachable database into a 503 instead of a crash. */
export async function guarded(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (e) {
    console.error("rooms api:", e);
    return fail(503, "rooms are unavailable right now");
  }
}
