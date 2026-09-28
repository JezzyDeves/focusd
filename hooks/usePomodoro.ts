"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureAudio, playDone, playStart } from "@/lib/audio";
import {
  DEFAULTS,
  MODES,
  SETTING_NAMES,
  fmt,
  kindFor,
  stamp,
  today,
  type LogKind,
  type LogLine,
  type Mode,
  type NumericSetting,
  type Settings,
  type Stats,
} from "@/lib/pomodoro";
import { freshStats, loadSettings, loadStats, saveSettings, saveStats } from "@/lib/storage";

const TICK_MS = 200;
const MAX_LOG = 60;

/**
 * The Pomodoro engine: timer state, cycle tracking, settings, stats and the event log.
 *
 * Time is tracked against an absolute end timestamp rather than by counting ticks,
 * so the timer stays accurate when the tab is throttled in the background.
 */
export function usePomodoro() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(DEFAULTS.focus * 60_000);
  const [cycle, setCycle] = useState(0);
  const [stats, setStats] = useState<Stats>(freshStats);
  const [glitch, setGlitch] = useState(0);
  const [flash, setFlash] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);

  const endAt = useRef<number | null>(null);
  const runningRef = useRef(false);
  const logId = useRef(0);

  const durOf = useCallback((m: Mode) => settings[MODES[m].key] * 60_000, [settings]);
  const total = durOf(mode);
  const progress = Math.min(1, Math.max(0, 1 - remaining / total));

  const line = useCallback(
    (msg: string, kind: LogKind = "sys"): LogLine => ({ id: ++logId.current, t: stamp(), msg, kind }),
    [],
  );
  const push = useCallback(
    (msg: string, kind?: LogKind) => setLog((l) => [...l.slice(-MAX_LOG), line(msg, kind)]),
    [line],
  );

  // Load saved settings and stats after mount so server and client render the same markup.
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setRemaining(s.focus * 60_000);
    setStats(loadStats());
    setLog([
      line("focusd v2.6.0 :: boot sequence"),
      line("mount /dev/attention ........ ok", "ok"),
      line(`load config.yml :: focus ${s.focus}m · short ${s.short}m · long ${s.long}m · long every ${s.every}`),
      line("distractions.service ....... masked", "ok"),
      line("awaiting input. press START to begin a session."),
    ]);
    setHydrated(true);
  }, [line]);

  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (hydrated) saveStats(stats);
  }, [stats, hydrated]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // The accent color follows the current mode via [data-mode] on <html>.
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  useEffect(() => {
    document.title = `${fmt(remaining)} · ${MODES[mode].label} · focusd`;
  }, [remaining, mode]);

  // Keep the screen awake while a timer runs (ignored where unsupported).
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((s) => {
        if (cancelled) void s.release();
        else sentinel = s;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      void sentinel?.release().catch(() => {});
    };
  }, [running]);

  const switchTo = useCallback(
    (next: Mode, autoRun: boolean) => {
      const d = durOf(next);
      setMode(next);
      setRemaining(d);
      setGlitch((g) => g + 1);
      if (autoRun) {
        endAt.current = Date.now() + d;
        setRunning(true);
      } else {
        endAt.current = null;
        setRunning(false);
      }
    },
    [durOf],
  );

  /** Move to the next timer in the cycle. `skipped` means the user cut the current one short. */
  const advance = useCallback(
    (skipped: boolean) => {
      let next: Mode;
      let nextCycle = cycle;

      if (mode === "focus") {
        nextCycle = cycle + 1;
        next = nextCycle >= settings.every ? "long" : "short";
        if (!skipped) {
          const add = durOf("focus");
          setStats((s) => {
            const base = s.date === today() ? s : freshStats();
            return { ...base, sessions: base.sessions + 1, focusMs: base.focusMs + add };
          });
        }
      } else {
        next = "focus";
        if (mode === "long") nextCycle = 0;
      }
      setCycle(nextCycle);

      const autoRun = settings.autoStart && runningRef.current;

      if (skipped) {
        push(`skip :: ${MODES[mode].label} aborted → ${MODES[next].label}`, "warn");
      } else {
        if (settings.sound) playDone();
        setFlash((f) => f + 1);
        if (mode === "focus") push(`session ${nextCycle}/${settings.every} complete. +${settings.focus}m focus logged`, "ok");
        else push(`${MODES[mode].label} finished. back to work.`, kindFor(mode));
        if (next === "long") push(`cycle complete :: long_break unlocked (${settings.long}m)`, "long");
        else if (next === "short") push(`short_break queued (${settings.short}m)`, "brk");
      }
      if (autoRun) push(`auto_start :: ${MODES[next].label} running`);

      switchTo(next, autoRun);
    },
    [cycle, mode, settings, durOf, push, switchTo],
  );

  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  // Ticking engine.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (endAt.current == null) return;
      const left = endAt.current - Date.now();
      if (left <= 0) {
        endAt.current = null;
        setRemaining(0);
        advanceRef.current(false);
      } else {
        setRemaining(left);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    ensureAudio();
    if (settings.sound) playStart();
    endAt.current = Date.now() + remaining;
    setRunning(true);
    setGlitch((g) => g + 1);
    const verb = remaining < total ? "resume" : "exec";
    push(`${verb} ${MODES[mode].label} :: ${fmt(remaining)} on the clock`, kindFor(mode));
  }, [settings.sound, remaining, total, mode, push]);

  const pause = useCallback(() => {
    const left = endAt.current ? Math.max(0, endAt.current - Date.now()) : remaining;
    endAt.current = null;
    setRemaining(left);
    setRunning(false);
    push(`SIGSTOP :: paused at ${fmt(left)}`, "warn");
  }, [remaining, push]);

  const toggle = useCallback(() => (running ? pause() : start()), [running, pause, start]);

  const reset = useCallback(() => {
    endAt.current = null;
    setRunning(false);
    setRemaining(total);
    setGlitch((g) => g + 1);
    push(`reset ${MODES[mode].label} → ${fmt(total)}`);
  }, [total, mode, push]);

  const skip = useCallback(() => {
    ensureAudio();
    endAt.current = null;
    advance(true);
  }, [advance]);

  const pickMode = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      push(`switch → ${MODES[m].label} (${settings[MODES[m].key]}m)`, kindFor(m));
      switchTo(m, false);
    },
    [mode, settings, push, switchTo],
  );

  const setNumber = useCallback(
    (key: NumericSetting, val: number) => {
      if (settings[key] === val) return;
      setSettings((s) => ({ ...s, [key]: val }));
      const unit = key === "every" ? " sessions" : "m";
      const msg = `config :: ${SETTING_NAMES[key]} = ${val}${unit}`;
      if (MODES[mode].key === key) {
        if (running) {
          push(`${msg} (applies next session)`);
        } else {
          setRemaining(val * 60_000);
          push(msg);
        }
      } else {
        push(msg);
      }
    },
    [settings, mode, running, push],
  );

  const setFlag = useCallback(
    (key: "autoStart" | "sound", val: boolean) => {
      setSettings((s) => ({ ...s, [key]: val }));
      push(`config :: ${key === "autoStart" ? "auto_start" : key} = ${val}`);
    },
    [push],
  );

  // Keyboard shortcuts: space start/pause, r reset, s skip, 1/2/3 mode.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? "";
      if (tag === "input" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space" && tag !== "button") {
        e.preventDefault();
        toggle();
      } else if (e.key === "r") reset();
      else if (e.key === "s") skip();
      else if (e.key === "1") pickMode("focus");
      else if (e.key === "2") pickMode("short");
      else if (e.key === "3") pickMode("long");
    };
  }, [toggle, reset, skip, pickMode]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return {
    settings,
    mode,
    running,
    remaining,
    total,
    progress,
    cycle,
    stats,
    glitch,
    flash,
    log,
    actions: { start, pause, toggle, reset, skip, pickMode, setNumber, setFlag },
  };
}
