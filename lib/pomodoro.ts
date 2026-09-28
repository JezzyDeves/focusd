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
};

export type NumericSetting = "focus" | "short" | "long" | "every";

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
};

export const LIMITS: Record<NumericSetting, [number, number]> = {
  focus: [1, 99],
  short: [1, 30],
  long: [1, 60],
  every: [2, 8],
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
};

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
