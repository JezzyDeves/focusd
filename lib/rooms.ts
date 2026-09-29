import { LIMITS, MODES, TEXT_MAX, type Mode } from "./pomodoro";

/** Room ids are 12 lowercase base-36 characters: unguessable, and short enough to share. */
export const ROOM_ID = /^[a-z0-9]{12}$/;

export const HANDLE_MAX = 24;

/** The room panel lists at most this many peers, so a flood of fake presences can't swamp the page. */
export const MAX_PEERS_SHOWN = 50;

/**
 * Tidy free text before it's shared or shown: drop control and invisible formatting characters (bidi overrides,
 * zero-width spaces and joiners) that could disguise a name, collapse whitespace and cap the length.
 */
export const cleanText = (s: string, max: number) =>
  s.replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);

/** A "start together" session, as absolute epoch-ms timestamps on the server's clock. */
export type SyncSession = { mode: Mode; startAt: number; endAt: number; checkins: boolean };

/** GET /api/rooms/[id]. `now` is the server's clock, so clients can correct for their own skew. */
export type RoomInfo = { id: string; session: SyncSession | null; now: number };

/** POST /api/rooms. The host token is shown once; only its hash is stored. */
export type CreatedRoom = { id: string; hostToken: string };

/** POST /api/rooms/[id]/session */
export type StartRequest = { hostToken: string; mode: Mode; minutes: number; checkins: boolean };

/** What each client shares with its room over presence. */
export type RoomMeta = {
  handle: string;
  mode: Mode;
  running: boolean;
  /** When the running timer ends (sender's clock), or null when stopped. */
  endAt: number | null;
  /** Time left when stopped, in ms. */
  left: number;
  /** The intent task, only when `share_task` is on. */
  task?: string;
  checkin?: string;
  checkout?: string;
};

export const isMode = (m: unknown): m is Mode => typeof m === "string" && m in MODES;

/** Clamp a synced session's length to the same limits as the local settings. */
export const clampMinutes = (mode: Mode, minutes: number) => {
  const [min, max] = LIMITS[MODES[mode].key];
  return Math.min(max, Math.max(min, Math.round(minutes)));
};

const text = (v: unknown, max: number) => (typeof v === "string" ? cleanText(v, max) || undefined : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Presence payloads come from other clients: keep only well-formed fields, capped in length. */
export function parseRoomMeta(raw: unknown): RoomMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isMode(r.mode) || typeof r.running !== "boolean") return null;
  return {
    handle: text(r.handle, HANDLE_MAX) ?? "",
    mode: r.mode,
    running: r.running,
    endAt: r.running ? num(r.endAt) : null,
    left: Math.max(0, num(r.left) ?? 0),
    task: text(r.task, TEXT_MAX),
    checkin: text(r.checkin, TEXT_MAX),
    checkout: text(r.checkout, TEXT_MAX),
  };
}
