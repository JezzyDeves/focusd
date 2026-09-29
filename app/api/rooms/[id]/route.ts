import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, guarded, toInfo } from "@/lib/roomServer";
import { ROOM_ID } from "@/lib/rooms";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60_000;

/** Check a room exists and get its current synced session. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ROOM_ID.test(id)) return fail(404, "room not found");
  return guarded(async () => {
    const rooms = db().room;
    const room = await rooms.findUnique({ where: { id } });
    if (!room) return fail(404, "room not found");
    // Keep rooms in use from expiring, writing at most once a day.
    await rooms.updateMany({ where: { id, updatedAt: { lt: new Date(Date.now() - DAY_MS) } }, data: { updatedAt: new Date() } });
    return NextResponse.json(toInfo(room));
  });
}
