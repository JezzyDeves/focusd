import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LIMITS } from "@/lib/rateLimit";
import { IDLE_MS, MAX_ROOMS, fail, guarded, hashToken, newHostToken, newRoomId } from "@/lib/roomServer";
import type { CreatedRoom } from "@/lib/rooms";

const DAY_MS = 24 * 60 * 60_000;

/** Create a room. The caller becomes its host by keeping the returned token. */
export async function POST(req: Request) {
  return guarded(req, LIMITS.create, async () => {
    const { room, rateLimit } = db();
    await room.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - IDLE_MS) } } });
    await rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - DAY_MS) } } });
    if ((await room.count()) >= MAX_ROOMS) return fail(503, "no new rooms can be created right now");
    const id = newRoomId();
    const hostToken = newHostToken();
    await room.create({ data: { id, hostHash: hashToken(hostToken) } });
    return NextResponse.json({ id, hostToken } satisfies CreatedRoom, { status: 201 });
  });
}
