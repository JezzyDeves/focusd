"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureAudio, playCue, playDone, playStart, setAudioPrefs, startAlarm, stopAlarm } from "@/lib/audio";
import { buzzCue, buzzDone } from "@/lib/haptics";
import {
  DEFAULTS,
  FLAG_NAMES,
  HEADS_UP_MIN,
  MODES,
  PARK_INPUT_ID,
  SETTING_NAMES,
  SETTING_UNITS,
  TEXT_MAX,
  fmt,
  kindFor,
  nextMode,
  stamp,
  today,
  type FlagSetting,
  type Intent,
  type LogKind,
  type LogLine,
  type Mode,
  type NumericSetting,
  type Parked,
  type Settings,
  type Stats,
} from "@/lib/pomodoro";
import {
  freshStats,
  loadIntent,
  loadParked,
  loadSettings,
  loadStats,
  saveIntent,
  saveParked,
  saveSettings,
  saveStats,
} from "@/lib/storage";

const TICK_MS = 200;
const MAX_LOG = 60;

/**
 * The Pomodoro engine: timer state, cycle tracking, settings, stats, the event log,
 * the session intent and the parking lot for stray thoughts.
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
  /** The alert is looping and waiting to be stopped. */
  const [alarming, setAlarming] = useState(false);
  /** Minutes-left mark of the last heads-up for the current timer, or null before the first. */
  const [cued, setCued] = useState<number | null>(null);
  const [intent, setIntent] = useState<Intent>({ task: "", then: "" });
  const [parked, setParked] = useState<Parked[]>([]);

  const endAt = useRef<number | null>(null);
  const runningRef = useRef(false);
  const logId = useRef(0);
  const parkId = useRef(0);
  /** Time left at the previous tick, so heads-up cues fire once, when a mark is crossed. */
  const prevLeft = useRef(0);

  const durOf = useCallback((m: Mode) => settings[MODES[m].key] * 60_000, [settings]);
  const total = durOf(mode);
  const progress = Math.min(1, Math.max(0, 1 - remaining / total));
  const next = nextMode(mode, cycle, settings.every);

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
    setIntent(loadIntent());
    const p = loadParked();
    setParked(p);
    parkId.current = p.reduce((max, x) => Math.max(max, x.id), 0);
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
    if (hydrated) saveIntent(intent);
  }, [intent, hydrated]);

  useEffect(() => {
    if (hydrated) saveParked(parked);
  }, [parked, hydrated]);

  useEffect(() => {
    setAudioPrefs(settings.volume, settings.softTone);
  }, [settings.volume, settings.softTone]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // The accent color follows the current mode via [data-mode] on <html>.
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  // Sensory switches, read by CSS: [data-motion="off"] stills animation like prefers-reduced-motion.
  useEffect(() => {
    document.documentElement.dataset.motion = settings.motion ? "on" : "off";
  }, [settings.motion]);

  useEffect(() => {
    document.title = `${fmt(remaining)} · ${MODES[mode].label} · focusd`;
  }, [remaining, mode]);

  useEffect(() => {
    if (!alarming) return;
    void startAlarm();
    return stopAlarm;
  }, [alarming]);

  /** Stop a looping alert. Returns whether one was ringing. */
  const silence = useCallback(() => {
    if (!alarming) return false;
    setAlarming(false);
    push("alarm acknowledged");
    return true;
  }, [alarming, push]);

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
      setCued(null);
      setGlitch((g) => g + 1);
      if (autoRun) {
        endAt.current = Date.now() + d;
        prevLeft.current = d;
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
      const to = nextMode(mode, cycle, settings.every);
      let nextCycle = cycle;

      if (mode === "focus") {
        nextCycle = cycle + 1;
        if (!skipped) {
          const add = durOf("focus");
          setStats((s) => {
            const base = s.date === today() ? s : freshStats();
            return { ...base, sessions: base.sessions + 1, focusMs: base.focusMs + add };
          });
        }
      } else if (mode === "long") {
        nextCycle = 0;
      }
      setCycle(nextCycle);

      const autoRun = settings.autoStart && runningRef.current;

      if (skipped) {
        push(`skip :: ${MODES[mode].label} aborted → ${MODES[to].label}`, "warn");
      } else {
        if (settings.sound && settings.repeatAlert) setAlarming(true);
        else if (settings.sound) playDone();
        if (settings.vibrate) buzzDone();
        if (settings.flash) setFlash((f) => f + 1);
        if (mode === "focus") push(`session ${nextCycle}/${settings.every} complete. +${settings.focus}m focus logged`, "ok");
        else push(`${MODES[mode].label} finished. back to work.`, kindFor(mode));
        if (to === "long") push(`cycle complete :: long_break unlocked (${settings.long}m)`, "long");
        else if (to === "short") push(`short_break queued (${settings.short}m)`, "brk");
      }
      if (mode === "focus" && parked.length > 0) {
        push(`parking_lot :: ${parked.length} thought${parked.length === 1 ? "" : "s"} to review on your break`, "brk");
      }
      if (autoRun) push(`auto_start :: ${MODES[to].label} running`);

      switchTo(to, autoRun);
    },
    [cycle, mode, settings, parked.length, durOf, push, switchTo],
  );

  /** Fire a heads-up when the time left crosses one of the HEADS_UP_MIN marks. */
  const cue = useCallback(
    (before: number, left: number) => {
      if (!settings.headsUp) return;
      // A throttled background tab can jump past several marks in one tick; only the nearest one matters.
      const crossed = HEADS_UP_MIN.filter((m) => {
        const at = m * 60_000;
        return at < total && before > at && left <= at;
      });
      if (crossed.length === 0) return;
      const m = Math.min(...crossed);
      setCued(m);
      if (settings.sound) playCue();
      if (settings.vibrate) buzzCue();
      push(`heads_up :: ${m}m left in ${MODES[mode].label} · next up: ${MODES[next].label}`, kindFor(next));
    },
    [settings.headsUp, settings.sound, settings.vibrate, total, mode, next, push],
  );

  const advanceRef = useRef(advance);
  const cueRef = useRef(cue);
  useEffect(() => {
    advanceRef.current = advance;
    cueRef.current = cue;
  }, [advance, cue]);

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
        cueRef.current(prevLeft.current, left);
        prevLeft.current = left;
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    ensureAudio();
    silence();
    if (settings.sound) playStart();
    endAt.current = Date.now() + remaining;
    prevLeft.current = remaining;
    setRunning(true);
    setGlitch((g) => g + 1);
    const fresh = remaining >= total;
    push(`${fresh ? "exec" : "resume"} ${MODES[mode].label} :: ${fmt(remaining)} on the clock`, kindFor(mode));
    if (fresh && mode === "focus" && settings.intention) {
      const task = intent.task.trim();
      const then = intent.then.trim();
      if (task) push(`task :: ${task}`, "ok");
      if (then) push(`if distracted → ${then}`);
    }
  }, [settings.sound, settings.intention, intent, remaining, total, mode, push, silence]);

  const pause = useCallback(() => {
    silence();
    const left = endAt.current ? Math.max(0, endAt.current - Date.now()) : remaining;
    endAt.current = null;
    setRemaining(left);
    setRunning(false);
    push(`SIGSTOP :: paused at ${fmt(left)}`, "warn");
  }, [remaining, push, silence]);

  /** The main button: stops a ringing alert first, otherwise starts or pauses. */
  const toggle = useCallback(() => {
    if (silence()) return;
    if (running) pause();
    else start();
  }, [silence, running, pause, start]);

  const reset = useCallback(() => {
    silence();
    endAt.current = null;
    setRunning(false);
    setRemaining(total);
    setCued(null);
    setGlitch((g) => g + 1);
    push(`reset ${MODES[mode].label} → ${fmt(total)}`);
  }, [total, mode, push, silence]);

  const skip = useCallback(() => {
    ensureAudio();
    silence();
    endAt.current = null;
    advance(true);
  }, [advance, silence]);

  const pickMode = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      silence();
      push(`switch → ${MODES[m].label} (${settings[MODES[m].key]}m)`, kindFor(m));
      switchTo(m, false);
    },
    [mode, settings, push, switchTo, silence],
  );

  const setNumber = useCallback(
    (key: NumericSetting, val: number) => {
      if (settings[key] === val) return;
      setSettings((s) => ({ ...s, [key]: val }));
      const msg = `config :: ${SETTING_NAMES[key]} = ${val}${SETTING_UNITS[key]}`;
      if (MODES[mode].key === key) {
        if (running) {
          push(`${msg} (applies next session)`);
        } else {
          setRemaining(val * 60_000);
          setCued(null);
          push(msg);
        }
      } else {
        push(msg);
      }
    },
    [settings, mode, running, push],
  );

  const setFlag = useCallback(
    (key: FlagSetting, val: boolean) => {
      setSettings((s) => ({ ...s, [key]: val }));
      push(`config :: ${FLAG_NAMES[key]} = ${val}`);
      if (!val && (key === "sound" || key === "repeatAlert")) silence();
    },
    [push, silence],
  );

  const editIntent = useCallback((field: keyof Intent, val: string) => {
    setIntent((i) => ({ ...i, [field]: val.slice(0, TEXT_MAX) }));
  }, []);

  /** Set a stray thought aside without leaving the session. */
  const park = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, TEXT_MAX);
      if (!text) return;
      setParked((p) => [...p, { id: ++parkId.current, t: stamp(), text }]);
      push("parking_lot :: thought parked. back to it.");
    },
    [push],
  );

  const unpark = useCallback((id: number) => setParked((p) => p.filter((x) => x.id !== id)), []);

  const clearParked = useCallback(() => {
    setParked([]);
    push("parking_lot :: cleared");
  }, [push]);

  // Keyboard shortcuts: space start/pause (or stop alarm), esc stop alarm, r reset, s skip, 1/2/3 mode, n park a thought.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? "";
      if (tag === "input" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space" && tag !== "button") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape") silence();
      else if (e.key === "r") reset();
      else if (e.key === "s") skip();
      else if (e.key === "1") pickMode("focus");
      else if (e.key === "2") pickMode("short");
      else if (e.key === "3") pickMode("long");
      else if (e.key === "n") {
        // Keep the "n" from landing in the input it focuses.
        e.preventDefault();
        document.getElementById(PARK_INPUT_ID)?.focus();
      }
    };
  }, [toggle, silence, reset, skip, pickMode]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return {
    settings,
    mode,
    running,
    alarming,
    remaining,
    total,
    progress,
    cycle,
    next,
    cued,
    stats,
    glitch,
    flash,
    log,
    intent,
    parked,
    actions: { start, pause, toggle, silence, reset, skip, pickMode, setNumber, setFlag, editIntent, park, unpark, clearParked, log: push },
  };
}
