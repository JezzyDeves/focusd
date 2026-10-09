import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LIMITS } from "@/lib/rateLimit";
import { fail, guarded, readJson, toInfo, tokenMatches } from "@/lib/roomServer";
import { ROOM_ID } from "@/lib/rooms";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60_000;

type Params = { params: Promise<{ id: string }> };

/** Check a room exists and get its current synced session. */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  if (!ROOM_ID.test(id)) return fail(404, "room not found");
  return guarded(req, LIMITS.read, async () => {
    const rooms = db().room;
    const room = await rooms.findUnique({ where: { id } });
    if (!room) return fail(404, "room not found");
    // Keep rooms in use from expiring, writing at most once a day.
    await rooms.updateMany({ where: { id, updatedAt: { lt: new Date(Date.now() - DAY_MS) } }, data: { updatedAt: new Date() } });
    return NextResponse.json(toInfo(room));
  });
}

/** Host only: close the room for good. Members are told to fetch it again, get a 404 and leave. */
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  if (!ROOM_ID.test(id)) return fail(404, "room not found");
  return guarded(req, LIMITS.host, async () => {
    const body = await readJson<{ hostToken: string }>(req);
    if (!body || typeof body.hostToken !== "string") return fail(400, "expected { hostToken }");
    const rooms = db().room;
    const room = await rooms.findUnique({ where: { id } });
    if (!room) return fail(404, "room not found");
    if (!tokenMatches(body.hostToken, room.hostHash)) return fail(403, "only the host can close the room");
    await rooms.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  });
}
