"use client";

import { useEffect, useRef, useState } from "react";
import { usePomodoro } from "@/hooks/usePomodoro";
import { LIMITS, MODES, fmt, fmtDur, stamp, type Mode } from "@/lib/pomodoro";
import { Dial } from "./Dial";
import { MatrixRain } from "./MatrixRain";
import { Stepper } from "./Stepper";
import { Toggle } from "./Toggle";

const BOOT_LINES = 5;

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(stamp());
    const id = window.setInterval(() => setNow(stamp()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="clock">{now ?? "--:--:--"}</span>;
}

export function Pomodoro() {
  const { settings, mode, running, remaining, total, progress, cycle, stats, glitch, flash, log, actions } = usePomodoro();
  const [configOpen, setConfigOpen] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const every = settings.every;
  const shown = Math.min(cycle, every);
  const digits = fmt(remaining);
  const status = running ? "RUNNING" : remaining < total ? "PAUSED" : "READY";

  let caption: React.ReactNode;
  if (mode === "focus") {
    const left = every - shown - 1;
    caption = (
      <>
        session <em>{shown + 1}/{every}</em> · {left <= 0 ? "long break next" : `long break in ${left} more`}
      </>
    );
  } else if (mode === "short") {
    caption = (
      <>
        recharging · next up: session <em>{Math.min(shown + 1, every)}/{every}</em>
      </>
    );
  } else {
    caption = (
      <>
        cycle complete · <em>{every}/{every}</em> sessions shipped
      </>
    );
  }

  return (
    <>
      <MatrixRain running={running} />
      <div className="crt" aria-hidden="true" />
      {flash > 0 && <div key={`flash-${flash}`} className="flash" aria-hidden="true" />}

      <div className="shell">
        <header className="topbar">
          <span className="prompt">
            root@<b>focusd</b>:~$ ./pomodoro<span className="caret" />
          </span>
          <Clock />
        </header>

        <main className="main">
          <nav className="modes" aria-label="Timer mode">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button key={m} type="button" className="mode" aria-pressed={mode === m} onClick={() => actions.pickMode(m)}>
                {MODES[m].label}
              </button>
            ))}
          </nav>

          <Dial progress={progress} running={running}>
            <span className="face-label">{"// "}{MODES[mode].tag}</span>
            <span
              key={glitch}
              className={`digits${glitch ? " glitch" : ""}`}
              data-text={digits}
              role="timer"
              aria-label={`${digits} remaining`}
            >
              {digits}
            </span>
            <span className="face-status">
              <span className="dot" />
              {status} · {Math.round(progress * 100)}%
            </span>
          </Dial>

          <div className="cycle">
            <div className="pips" aria-hidden="true">
              {Array.from({ length: every }, (_, i) => {
                const done = mode === "long" || i < shown;
                const now = mode === "focus" && i === shown;
                return <span key={i} className={`pip${done ? " done" : ""}${now ? " now" : ""}`} />;
              })}
            </div>
            <div className="cycle-cap">{caption}</div>
          </div>

          <div className="controls">
            <button type="button" className="btn" onClick={actions.reset}>
              ↺ reset
            </button>
            <button type="button" className={`btn primary${running ? " pause" : ""}`} onClick={actions.toggle}>
              {running ? "‖ pause" : remaining < total ? "▶ resume" : "▶ start"}
            </button>
            <button type="button" className="btn" onClick={actions.skip}>
              skip ⇥
            </button>
          </div>

          <div className="keys">
            <kbd>space</kbd> start/pause · <kbd>r</kbd> reset · <kbd>s</kbd> skip · <kbd>1</kbd>
            <kbd>2</kbd>
            <kbd>3</kbd> mode
          </div>
        </main>

        <aside className="side">
          <section className={`panel${configOpen ? "" : " collapsed"}`}>
            <button
              type="button"
              className="panel-head"
              aria-expanded={configOpen}
              aria-controls="config-body"
              onClick={() => setConfigOpen((o) => !o)}
            >
              <span className="file">~/.focusd/config.yml</span>
              <span className="chev" aria-hidden="true">
                ▾
              </span>
            </button>
            {configOpen && (
              <div className="config" id="config-body">
                <Stepper id="cfg-focus" name="focus_len" hint="length of each pomodoro" value={settings.focus} limits={LIMITS.focus} unit="min" onChange={(v) => actions.setNumber("focus", v)} />
                <Stepper id="cfg-short" name="short_break" hint="rest between sessions" value={settings.short} limits={LIMITS.short} unit="min" onChange={(v) => actions.setNumber("short", v)} />
                <Stepper id="cfg-long" name="long_break" hint="rest after a full cycle" value={settings.long} limits={LIMITS.long} unit="min" onChange={(v) => actions.setNumber("long", v)} />
                <Stepper id="cfg-every" name="long_every" hint="sessions per cycle" value={settings.every} limits={LIMITS.every} unit="sess" onChange={(v) => actions.setNumber("every", v)} />
                <Toggle name="auto_start" hint="roll into the next timer" on={settings.autoStart} onToggle={() => actions.setFlag("autoStart", !settings.autoStart)} />
                <Toggle name="sound" hint="chiptune alert when time's up" on={settings.sound} onToggle={() => actions.setFlag("sound", !settings.sound)} />
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <span className="file">/var/log/focusd.log</span>
              <span className="stats">
                <span>
                  today <b>{stats.sessions}</b>
                </span>
                <span>
                  focus <b>{fmtDur(stats.focusMs)}</b>
                </span>
              </span>
            </div>
            <div className="log" ref={logRef} aria-live="polite">
              {log.map((l, i) => (
                <div key={l.id} className={`line ${l.kind}`} style={i < BOOT_LINES && l.id <= BOOT_LINES * 2 ? { animationDelay: `${i * 0.18}s` } : undefined}>
                  <span className="t">[{l.t}]</span>
                  <span className="m">{l.msg}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
