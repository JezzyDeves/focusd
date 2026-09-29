import type { RealtimeChannel, RealtimeClient } from "@supabase/realtime-js";
import { isMode } from "./rooms";
import type { Mode } from "./pomodoro";

// Inlined at build time, so they must be referenced by their full names.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** The one global channel every client joins while `focus_room` is on. */
export const GLOBAL_TOPIC = "focusd:global";
export const roomTopic = (id: string) => `focusd:room:${id}`;

/** Everything a client sends to the global channel. Nothing else is tracked there. */
export type GlobalMeta = { mode: Mode; running: boolean };

/** Whether the Supabase env vars are set, so channels can connect at all. */
export const presenceConfigured = Boolean(URL && KEY);

/** A random id per channel join. Presence needs some key per client; this one identifies nothing. */
export const randomKey = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export type Joined = { client: RealtimeClient; channel: RealtimeChannel };

/**
 * Set up a presence channel (not yet subscribed) on its own socket. The client library is loaded on demand,
 * so nothing is downloaded or connected until a channel is opened.
 *
 * Each channel gets its own client: realtime-js hands back an existing channel for a topic that's still
 * closing, so a quick leave-and-rejoin on a shared client could pick up the dying one.
 */
export async function openChannel(topic: string, key: string): Promise<Joined> {
  if (!URL || !KEY) throw new Error("realtime is not configured");
  const { RealtimeClient } = await import("@supabase/realtime-js");
  const client = new RealtimeClient(`${URL.replace(/^http/i, "ws").replace(/\/$/, "")}/realtime/v1`, {
    params: { apikey: KEY },
  });
  const channel = client.channel(topic, { config: { presence: { key, enabled: true }, broadcast: { self: false } } });
  return { client, channel };
}

export function closeChannel({ client, channel }: Joined) {
  void client.removeChannel(channel).finally(() => client.disconnect());
}

/** Every peer other than `self`, with its payload checked by `parse`. Malformed payloads are dropped. */
export function peersOf<P>(channel: RealtimeChannel, self: string, parse: (raw: unknown) => P | null) {
  const peers: { key: string; meta: P }[] = [];
  for (const [key, metas] of Object.entries(channel.presenceState())) {
    if (key === self) continue;
    const meta = parse(metas[metas.length - 1]);
    if (meta) peers.push({ key, meta });
  }
  return peers;
}

export const parseGlobalMeta = (raw: unknown): GlobalMeta | null => {
  const r = raw as Partial<GlobalMeta> | null;
  return r && isMode(r.mode) && typeof r.running === "boolean" ? { mode: r.mode, running: r.running } : null;
};
