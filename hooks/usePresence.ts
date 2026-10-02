"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LogKind } from "@/lib/pomodoro";
import { closeChannel, openChannel, peersOf, presenceConfigured, randomKey, type Joined } from "@/lib/presence";

export type PresenceStatus = "off" | "connecting" | "online" | "offline";

type Options<M, P> = {
  /** The channel to join, or null to stay disconnected. */
  topic: string | null;
  /** Prefix for log lines, e.g. `focus_room`. */
  label: string;
  /** What this client shares. Sent on join and again only when it changes. */
  meta: M;
  /** Validates a peer's payload. */
  parse: (raw: unknown) => P | null;
  log: (msg: string, kind?: LogKind) => void;
  onBroadcast?: (event: string, payload: unknown) => void;
};

const s = (n: number) => (n === 1 ? "" : "s");

/**
 * Join a Supabase Realtime presence channel while `topic` is set, and list the other clients in it.
 *
 * Nothing connects while `topic` is null. `meta` is tracked when joining and whenever it changes, never per tick.
 * A dropped connection shows as `offline` and never touches the timer; the client keeps retrying on its own.
 */
export function usePresence<M extends object, P>({ topic, label, meta, parse, log, onBroadcast }: Options<M, P>) {
  const [status, setStatus] = useState<PresenceStatus>("off");
  const [peers, setPeers] = useState<{ key: string; meta: P }[]>([]);
  const joinedRef = useRef<Joined | null>(null);
  const online = useRef(false);
  const metaJson = JSON.stringify(meta);
  const latest = useRef({ metaJson, parse, log, onBroadcast });

  useEffect(() => {
    latest.current = { metaJson, parse, log, onBroadcast };
  });

  useEffect(() => {
    if (!topic) {
      setStatus("off");
      return;
    }
    if (!presenceConfigured) {
      setStatus("offline");
      latest.current.log(`${label} :: not configured (set the NEXT_PUBLIC_SUPABASE_* env vars)`, "warn");
      return;
    }

    let cancelled = false;
    let joined = false;
    let last: PresenceStatus = "connecting";
    const set = (next: PresenceStatus) => {
      last = next;
      online.current = next === "online";
      setStatus(next);
    };
    const offline = () => {
      if (last === "offline") return;
      set("offline");
      latest.current.log(`${label} :: offline · timer unaffected`, "warn");
    };
    set("connecting");

    const key = randomKey();
    openChannel(topic, key)
      .then((j) => {
        if (cancelled) return closeChannel(j);
        joinedRef.current = j;
        const ch = j.channel;
        ch.on("presence", { event: "sync" }, () => {
          const list = peersOf(ch, key, latest.current.parse);
          setPeers(list);
          if (!joined) {
            joined = true;
            latest.current.log(`${label} :: joined · ${list.length} other${s(list.length)} online`, "ok");
          }
        })
          .on("broadcast", { event: "*" }, ({ event, payload }) => latest.current.onBroadcast?.(event, payload))
          .subscribe((state) => {
            if (cancelled) return;
            if (state === "SUBSCRIBED") {
              if (last === "offline") latest.current.log(`${label} :: reconnected`, "ok");
              set("online");
              void ch.track(JSON.parse(latest.current.metaJson));
            } else {
              // CHANNEL_ERROR, TIMED_OUT or CLOSED.
              offline();
            }
          });
      })
      .catch(() => {
        if (!cancelled) offline();
      });

    return () => {
      cancelled = true;
      if (joinedRef.current) closeChannel(joinedRef.current);
      joinedRef.current = null;
      online.current = false;
      setPeers([]);
    };
  }, [topic, label]);

  // Publish only on a real change. Joining tracks the latest value itself.
  useEffect(() => {
    if (online.current) void joinedRef.current?.channel.track(JSON.parse(metaJson));
  }, [metaJson]);

  /** Broadcast a message to everyone else in the channel. */
  const send = useCallback((event: string, payload: object = {}) => {
    if (online.current) void joinedRef.current?.channel.send({ type: "broadcast", event, payload });
  }, []);

  return { status, peers, send };
}
