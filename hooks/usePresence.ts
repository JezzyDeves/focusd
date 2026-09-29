"use client";

import { useEffect, useRef, useState } from "react";
import type { LogKind, Mode } from "@/lib/pomodoro";
import { closeRoom, countPeers, openRoom, presenceConfigured, type PresenceMeta, type Room } from "@/lib/presence";

export type PresenceStatus = "off" | "connecting" | "online" | "offline";

const s = (n: number) => (n === 1 ? "" : "s");

/**
 * The `focus_room`: joins one global presence channel and counts the other clients in a running focus session.
 *
 * Nothing connects while `enabled` is false. While on, the only thing sent is `{ mode, running }`, and only
 * when one of them changes, never per tick. A dropped connection shows as `offline` and never touches the timer.
 */
export function usePresence(enabled: boolean, mode: Mode, running: boolean, log: (msg: string, kind?: LogKind) => void) {
  const [status, setStatus] = useState<PresenceStatus>("off");
  const [focusing, setFocusing] = useState(0);
  const room = useRef<Room | null>(null);
  const online = useRef(false);
  const meta = useRef<PresenceMeta>({ mode, running });
  const logRef = useRef(log);

  useEffect(() => {
    logRef.current = log;
  }, [log]);

  useEffect(() => {
    if (!enabled) {
      setStatus("off");
      return;
    }
    if (!presenceConfigured) {
      setStatus("offline");
      logRef.current("focus_room :: not configured (set the NEXT_PUBLIC_SUPABASE_* env vars)", "warn");
      return;
    }

    let cancelled = false;
    let joined = false;
    let lastStatus: PresenceStatus = "connecting";
    const set = (next: PresenceStatus) => {
      lastStatus = next;
      online.current = next === "online";
      setStatus(next);
    };
    set("connecting");

    openRoom()
      .then((r) => {
        if (cancelled) return closeRoom(r);
        room.current = r;
        r.channel
          .on("presence", { event: "sync" }, () => {
            const peers = countPeers(r.channel, r.key);
            setFocusing(peers.focusing);
            if (!joined) {
              joined = true;
              logRef.current(`focus_room :: joined · ${peers.online} other${s(peers.online)} online`, "ok");
            }
          })
          .subscribe((state) => {
            if (cancelled) return;
            if (state === "SUBSCRIBED") {
              if (lastStatus === "offline") logRef.current("focus_room :: reconnected", "ok");
              set("online");
              void r.channel.track(meta.current);
            } else if (lastStatus !== "offline") {
              // CHANNEL_ERROR, TIMED_OUT or CLOSED. The client keeps retrying on its own.
              set("offline");
              logRef.current("focus_room :: offline · timer unaffected", "warn");
            }
          });
      })
      .catch(() => {
        if (cancelled) return;
        set("offline");
        logRef.current("focus_room :: offline · timer unaffected", "warn");
      });

    return () => {
      cancelled = true;
      if (room.current) closeRoom(room.current);
      room.current = null;
      online.current = false;
      setFocusing(0);
    };
  }, [enabled]);

  // Publish only on a real change (start, pause, mode switch). Joining tracks the latest value itself.
  useEffect(() => {
    meta.current = { mode, running };
    if (online.current) void room.current?.channel.track(meta.current);
  }, [mode, running]);

  return { status, focusing };
}
