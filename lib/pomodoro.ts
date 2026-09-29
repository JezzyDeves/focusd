export type Mode = "focus" | "short" | "long";

export type Settings = {
  /** Minutes per focus session (a "pomodoro"). */
  focus: number;
  /** Minutes per short break. */
  short: number;
  /** Minutes per long break. */
  long: number;
  /** Number of focus sessions before a long break. */
  every: number;
  /** Roll straight into the next timer when one ends. */
  autoStart: boolean;
  /** Play the chiptune alert. */
  sound: boolean;
  /** Keep repeating the alert until it's stopped. */
  repeatAlert: boolean;
  /** Alert volume, 1–10. */
  volume: number;
  /** Use a gentle sine chime instead of the square-wave chiptune. */
  softTone: boolean;
  /** Vibrate on alerts, where the device supports it. */
  vibrate: boolean;
  /** Pop up a desktop notification when time's up. Needs browser permission. */
  notify: boolean;
  /** Give a soft heads-up at each of HEADS_UP_MIN before a timer ends. */
  headsUp: boolean;
  /** Ask what each focus session is for, plus an if-then plan for distractions. */
  intention: boolean;
  /** Show how many others are focusing right now. Connects to the presence server only while on. */
  focusRoom: boolean;
  /** Show your intent task to the people in your room. */
  shareTask: boolean;
  /** Matrix rain, glitching digits, blinking and other animation. */
  motion: boolean;
  /** CRT scanlines and vignette over the screen. */
  scanlines: boolean;
  /** Flash the screen when a timer ends. */
  flash: boolean;
};

export type FlagSetting =
  | "autoStart"
  | "sound"
  | "repeatAlert"
  | "softTone"
  | "vibrate"
  | "notify"
  | "headsUp"
  | "intention"
  | "focusRoom"
  | "shareTask"
  | "motion"
  | "scanlines"
  | "flash";

export type NumericSetting = "focus" | "short" | "long" | "every" | "volume";

/** What the next focus session is for, and what to do when distracted. */
export type Intent = { task: string; then: string };

/** A stray thought set aside mid-session to deal with later. */
export type Parked = { id: number; t: string; text: string };

export type Stats = { date: string; sessions: number; focusMs: number };

export type LogKind = "sys" | "ok" | "brk" | "long" | "warn";
export type LogLine = { id: number; t: string; msg: string; kind: LogKind };

export const DEFAULTS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  every: 4,
  autoStart: false,
  sound: true,
  repeatAlert: false,
  volume: 6,
  softTone: false,
  vibrate: false,
  notify: false,
  headsUp: true,
  intention: true,
  focusRoom: false,
  shareTask: false,
  motion: true,
  scanlines: true,
  flash: true,
};

/** Minutes before the end of a timer at which the heads-up cue fires. Cues that don't fit inside a timer are skipped. */
export const HEADS_UP_MIN = [5, 1];

/** Max length of an intent field or a parked thought. */
export const TEXT_MAX = 140;

/** The parking-lot input, focused by the `n` shortcut. */
export const PARK_INPUT_ID = "park-input";

export const LIMITS: Record<NumericSetting, [number, number]> = {
  focus: [1, 99],
  short: [1, 30],
  long: [1, 60],
  every: [2, 8],
  volume: [1, 10],
};

export const MODES: Record<Mode, { label: string; tag: string; key: NumericSetting }> = {
  focus: { label: "focus", tag: "FOCUS_SESSION", key: "focus" },
  short: { label: "short_break", tag: "SHORT_BREAK", key: "short" },
  long: { label: "long_break", tag: "LONG_BREAK", key: "long" },
};

export const SETTING_NAMES: Record<NumericSetting, string> = {
  focus: "focus_len",
  short: "short_break_len",
  long: "long_break_len",
  every: "long_break_every",
  volume: "volume",
};

/** Unit suffix used when a numeric setting is logged. */
export const SETTING_UNITS: Record<NumericSetting, string> = {
  focus: "m",
  short: "m",
  long: "m",
  every: " sessions",
  volume: "/10",
};

export const FLAG_NAMES: Record<FlagSetting, string> = {
  autoStart: "auto_start",
  sound: "sound",
  repeatAlert: "repeat_alert",
  softTone: "soft_tone",
  vibrate: "vibrate",
  notify: "notify",
  headsUp: "heads_up",
  intention: "intention",
  focusRoom: "focus_room",
  shareTask: "share_task",
  motion: "motion",
  scanlines: "scanlines",
  flash: "flash",
};

/** The timer that follows `mode` when `cycle` focus sessions of the current round are done. */
export const nextMode = (mode: Mode, cycle: number, every: number): Mode =>
  mode === "focus" ? (cycle + 1 >= every ? "long" : "short") : "focus";

/** Log color for a given mode. */
export const kindFor = (m: Mode): LogKind => (m === "focus" ? "ok" : m === "long" ? "long" : "brk");

export const clamp = (v: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, v));
export const pad = (n: number) => String(n).padStart(2, "0");

/** Milliseconds → MM:SS, rounding up so the display never shows 00:00 early. */
export const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

/** Wall-clock HH:MM:SS. */
export const stamp = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Local calendar date as YYYY-MM-DD, used to reset daily stats. */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Milliseconds → "45m" or "1h15m". */
export const fmtDur = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h${pad(m % 60)}m` : `${m}m`;
};
