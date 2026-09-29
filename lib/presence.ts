import type { RealtimeChannel, RealtimeClient } from "@supabase/realtime-js";
import type { Mode } from "./pomodoro";

// Inlined at build time, so they must be referenced by their full names.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** The one global room every client joins while `focus_room` is on. */
const TOPIC = "focusd:global";

/** Everything a client sends about itself. Nothing else is tracked. */
export type PresenceMeta = { mode: Mode; running: boolean };

/** Whether the Supabase env vars are set, so the room can connect at all. */
export const presenceConfigured = Boolean(URL && KEY);

/** A random per-page-load id. Presence needs some key per client; this one identifies nothing. */
const randomKey = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export type Room = { client: RealtimeClient; channel: RealtimeChannel; key: string };

/**
 * Open a socket to Supabase Realtime and set up the presence channel (not yet subscribed).
 * The client library is loaded on demand, so nothing is downloaded or connected until the room is turned on.
 */
export async function openRoom(): Promise<Room> {
  if (!URL || !KEY) throw new Error("focus_room is not configured");
  const { RealtimeClient } = await import("@supabase/realtime-js");
  const client = new RealtimeClient(`${URL.replace(/^http/i, "ws").replace(/\/$/, "")}/realtime/v1`, {
    params: { apikey: KEY },
  });
  const key = randomKey();
  const channel = client.channel(TOPIC, { config: { presence: { key, enabled: true } } });
  return { client, channel, key };
}

export function closeRoom({ client, channel }: Room) {
  void client.removeChannel(channel).finally(() => client.disconnect());
}

/** Peers other than `self`, and how many of them are in a running focus session. */
export function countPeers(channel: RealtimeChannel, self: string) {
  let online = 0;
  let focusing = 0;
  for (const [key, metas] of Object.entries(channel.presenceState<PresenceMeta>())) {
    if (key === self) continue;
    online++;
    // Payloads come from other clients, so check the shape rather than trust it.
    if (metas.some((m) => m.mode === "focus" && m.running === true)) focusing++;
  }
  return { online, focusing };
}
