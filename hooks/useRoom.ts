"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MODES, TEXT_MAX, type LogKind, type Mode, type Settings } from "@/lib/pomodoro";
import { presenceConfigured, roomTopic } from "@/lib/presence";
import { HANDLE_MAX, ROOM_ID, parseRoomMeta, type CreatedRoom, type RoomInfo, type RoomMeta, type SyncSession } from "@/lib/rooms";
import { loadHandle, loadHostToken, saveHandle, saveHostToken } from "@/lib/storage";
import { usePresence } from "./usePresence";

type RoomDeps = {
  settings: Settings;
  mode: Mode;
  running: boolean;
  endsAt: number | null;
  remaining: number;
  /** The intent task, shared only when `share_task` is on. */
  task: string;
  syncStart: (m: Mode, end: number, length: number, note: string) => void;
  log: (msg: string, kind?: LogKind) => void;
};

export type RoomPrompt = "checkin" | "checkout" | null;

/** Coalesce bursts of "sync" pokes into one fetch. */
const POKE_DELAY_MS = 250;

/** Put the room id in the address bar, or take it out, without reloading. */
function setRoomParam(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("room", id);
  else url.searchParams.delete("room");
  window.history.replaceState(null, "", url);
}

/**
 * A private room shared by link: who's in it (presence), and the host's "start together" sessions.
 *
 * The room row lives in Postgres (via the API routes), so only the host can start a session and everyone
 * reads it from the server. A "sync" broadcast just tells peers to fetch it again, so a spoofed one does nothing.
 */
export function useRoom({ settings, mode, running, endsAt, remaining, task, syncStart, log }: RoomDeps) {
  const [id, setId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [handle, setHandleState] = useState("");
  /** The host's choice for the next "start together". */
  const [checkins, setCheckins] = useState(false);
  /** The session this client joined, with its end on the local clock. */
  const [synced, setSynced] = useState<(SyncSession & { end: number }) | null>(null);
  const [prompt, setPrompt] = useState<RoomPrompt>(null);
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const applied = useRef<number | null>(null);
  const poke = useRef<number | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("room");
    if (q && ROOM_ID.test(q)) {
      setId(q);
      setHostToken(loadHostToken(q));
    }
    setHandleState(loadHandle());
  }, []);

  /** Join the room's session if it's new to this client and still running. */
  const apply = useCallback(
    (info: RoomInfo, sentAt: number, note: string) => {
      const s = info.session;
      if (!s || s.startAt === applied.current) return;
      // The server's clock minus ours, measured at the middle of the request.
      const offset = info.now - (sentAt + Date.now()) / 2;
      const end = s.endAt - offset;
      if (end - Date.now() < 1000) return;
      applied.current = s.startAt;
      setSynced({ ...s, end });
      setCheckin("");
      setCheckout("");
      setPrompt(s.checkins ? "checkin" : null);
      syncStart(s.mode, end, s.endAt - s.startAt, note);
    },
    [syncStart],
  );

  const fetchRoom = useCallback(
    async (roomId: string, note: string) => {
      const sentAt = Date.now();
      const res = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`rooms api ${res.status}`);
      apply((await res.json()) as RoomInfo, sentAt, note);
      return true;
    },
    [apply],
  );

  const leave = useCallback(
    (quiet = false) => {
      if (poke.current) window.clearTimeout(poke.current);
      setJoined(false);
      setId(null);
      setHostToken(null);
      setSynced(null);
      setPrompt(null);
      setCheckin("");
      setCheckout("");
      applied.current = null;
      setRoomParam(null);
      if (!quiet) log("room :: left");
    },
    [log],
  );

  const join = useCallback(async () => {
    if (!id || busy) return;
    setBusy(true);
    try {
      if (await fetchRoom(id, "room :: joined the host's session · synced")) setJoined(true);
      else {
        log(`room :: ${id} not found. rooms expire after 30 idle days.`, "warn");
        leave(true);
      }
    } catch {
      log("room :: couldn't reach the server. try again in a moment.", "warn");
    } finally {
      setBusy(false);
    }
  }, [id, busy, fetchRoom, leave, log]);

  const create = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      if (!res.ok) throw new Error(`rooms api ${res.status}`);
      const room = (await res.json()) as CreatedRoom;
      saveHostToken(room.id, room.hostToken);
      setId(room.id);
      setHostToken(room.hostToken);
      setRoomParam(room.id);
      setJoined(true);
      log(`room :: created ${room.id} · share the link to invite people`, "ok");
    } catch {
      log("room :: couldn't create a room right now. try again in a moment.", "warn");
    } finally {
      setBusy(false);
    }
  }, [busy, log]);

  const onBroadcast = useCallback(
    (event: string) => {
      if (event !== "sync" || !id || poke.current) return;
      poke.current = window.setTimeout(() => {
        poke.current = null;
        fetchRoom(id, "room :: host started a session · synced").catch(() => {});
      }, POKE_DELAY_MS);
    },
    [id, fetchRoom],
  );

  const meta: RoomMeta = {
    handle: handle.trim(),
    mode,
    running,
    endAt: running ? endsAt : null,
    left: running ? 0 : remaining,
    task: settings.shareTask ? task.trim() || undefined : undefined,
    checkin: checkin || undefined,
    checkout: checkout || undefined,
  };

  const presence = usePresence({
    topic: joined && id ? roomTopic(id) : null,
    label: "room",
    meta,
    parse: parseRoomMeta,
    log,
    onBroadcast,
  });
  const { send } = presence;

  const startTogether = useCallback(async () => {
    if (!id || !hostToken || busy) return;
    setBusy(true);
    try {
      const sentAt = Date.now();
      const res = await fetch(`/api/rooms/${id}/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hostToken, mode, minutes: settings[MODES[mode].key], checkins }),
      });
      if (res.status === 403) return log("room :: only the host can start a session", "warn");
      if (!res.ok) throw new Error(`rooms api ${res.status}`);
      apply((await res.json()) as RoomInfo, sentAt, `room :: ${MODES[mode].label} started for everyone`);
      send("sync");
    } catch {
      log("room :: couldn't start the session. try again in a moment.", "warn");
    } finally {
      setBusy(false);
    }
  }, [id, hostToken, busy, mode, settings, checkins, apply, send, log]);

  // Ask how it went once a session with check-ins ends.
  useEffect(() => {
    if (!synced?.checkins) return;
    const t = window.setTimeout(() => setPrompt("checkout"), Math.max(0, synced.end - Date.now()));
    return () => window.clearTimeout(t);
  }, [synced]);

  useEffect(() => () => {
    if (poke.current) window.clearTimeout(poke.current);
  }, []);

  const setHandle = useCallback((raw: string) => {
    const h = raw.trim().slice(0, HANDLE_MAX);
    setHandleState(h);
    saveHandle(h);
  }, []);

  /** Answer the open check-in or check-out prompt. An empty answer just closes it. */
  const answer = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, TEXT_MAX);
      if (prompt === "checkin") setCheckin(text);
      else if (prompt === "checkout") setCheckout(text);
      if (text) log(`room :: ${prompt === "checkin" ? "checked in" : "checked out"}`, "ok");
      setPrompt(null);
    },
    [prompt, log],
  );

  const copyLink = useCallback(() => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => log("room :: link copied"))
      .catch(() => log("room :: couldn't copy. the link is in the address bar.", "warn"));
  }, [log]);

  return {
    configured: presenceConfigured,
    id,
    joined,
    busy,
    isHost: hostToken != null,
    handle,
    status: presence.status,
    peers: presence.peers,
    self: meta,
    synced,
    prompt,
    checkins,
    actions: { create, join, leave, startTogether, setHandle, setCheckins, answer, copyLink },
  };
}

export type Room = ReturnType<typeof useRoom>;
