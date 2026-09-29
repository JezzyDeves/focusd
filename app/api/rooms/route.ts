import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IDLE_MS, guarded, hashToken, newHostToken, newRoomId } from "@/lib/roomServer";
import type { CreatedRoom } from "@/lib/rooms";

/** Create a room. The caller becomes its host by keeping the returned token. */
export async function POST() {
  return guarded(async () => {
    const rooms = db().room;
    await rooms.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - IDLE_MS) } } });
    const id = newRoomId();
    const hostToken = newHostToken();
    await rooms.create({ data: { id, hostHash: hashToken(hostToken) } });
    return NextResponse.json({ id, hostToken } satisfies CreatedRoom, { status: 201 });
  });
}
