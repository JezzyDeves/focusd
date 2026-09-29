import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, guarded, toInfo, tokenMatches } from "@/lib/roomServer";
import { ROOM_ID, clampMinutes, isMode, type StartRequest } from "@/lib/rooms";

/** Host only: start a timer for everyone in the room. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ROOM_ID.test(id)) return fail(404, "room not found");
  const body = (await req.json().catch(() => null)) as Partial<StartRequest> | null;
  if (!body || typeof body.hostToken !== "string" || !isMode(body.mode) || typeof body.minutes !== "number") {
    return fail(400, "expected { hostToken, mode, minutes, checkins }");
  }
  const { hostToken, mode } = body;
  const minutes = clampMinutes(mode, body.minutes);
  return guarded(async () => {
    const rooms = db().room;
    const room = await rooms.findUnique({ where: { id } });
    if (!room) return fail(404, "room not found");
    if (!tokenMatches(hostToken, room.hostHash)) return fail(403, "only the host can start a session");
    const startAt = new Date();
    const updated = await rooms.update({
      where: { id },
      data: {
        syncMode: mode,
        syncStartAt: startAt,
        syncEndAt: new Date(startAt.getTime() + minutes * 60_000),
        syncCheckins: body.checkins === true,
      },
    });
    return NextResponse.json(toInfo(updated));
  });
}
