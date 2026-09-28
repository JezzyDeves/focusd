"use client";

import { useEffect, useRef, useState } from "react";
import { usePomodoro } from "@/hooks/usePomodoro";
import { cn } from "@/lib/cn";
import { LIMITS, MODES, fmt, fmtDur, stamp, type LogKind, type Mode } from "@/lib/pomodoro";
import { Dial } from "./Dial";
import { MatrixRain } from "./MatrixRain";
import { Stepper } from "./Stepper";
import { Toggle } from "./Toggle";

const BOOT_LINES = 5;

const LOG_COLOR: Record<LogKind, string> = {
  sys: "text-ink",
  ok: "text-focus",
  brk: "text-short",
  long: "text-long",
  warn: "text-danger",
};

const panel = "rounded-xs border border-line bg-panel/90 backdrop-blur-[2px]";
const panelHead =
  "flex w-full items-center justify-between gap-3 border-b bg-panel-2 px-3 py-2.5 text-left text-xs leading-tight font-medium tracking-[0.04em] text-dim";
const fileName = "text-ink before:text-accent before:content-['■_']";
const btn =
  "focus-ring min-h-[52px] cursor-pointer rounded-xs border px-2.5 leading-none font-medium tracking-[0.06em] uppercase transition active:translate-y-px";

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(stamp());
    const id = window.setInterval(() => setNow(stamp()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="whitespace-nowrap tabular-nums">{now ?? "--:--:--"}</span>;
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
  const paused = !running && remaining < total;
  const status = running ? "RUNNING" : paused ? "PAUSED" : "READY";

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
      <div className="crt pointer-events-none fixed inset-0 z-50" aria-hidden="true" />
      {flash > 0 && <div key={`flash-${flash}`} className="pointer-events-none fixed inset-0 z-40 animate-flash bg-accent opacity-0" aria-hidden="true" />}

      <div className="relative z-10 mx-auto grid max-w-[520px] gap-[18px] px-4 pt-3.5 pb-10 desk:max-w-[1040px] desk:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] desk:gap-x-10 desk:pt-7 desk:pb-12">
        <header className="flex items-center justify-between gap-3 border-b border-dashed border-line-2 pb-2.5 text-xs text-dim desk:col-span-full">
          <span className="truncate text-accent">
            root@<b className="font-medium text-bright">focusd</b>:~$ ./pomodoro
            <span className="ml-0.5 inline-block h-[1.05em] w-[0.6em] animate-blink bg-accent align-[-0.18em]" />
          </span>
          <Clock />
        </header>

        <main className="grid min-w-0 content-start gap-[18px]">
          <nav className="grid grid-cols-3 gap-1.5" aria-label="Timer mode">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => actions.pickMode(m)}
                className="focus-ring min-h-11 cursor-pointer rounded-xs border border-line bg-transparent px-1.5 text-xs leading-none font-medium tracking-[0.04em] text-dim transition hover:border-line-2 hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-void aria-pressed:shadow-glow"
              >
                {MODES[m].label}
              </button>
            ))}
          </nav>

          <Dial progress={progress} running={running}>
            <span className="text-[max(11px,3.4cqi)] tracking-[0.14em] text-accent uppercase">
              {"// "}
              {MODES[mode].tag}
            </span>
            <span
              key={glitch}
              role="timer"
              aria-label={`${digits} remaining`}
              data-text={digits}
              className={cn(
                "relative font-pixel text-[31cqi] leading-[0.8] tracking-[0.02em] text-bright tabular-nums text-shadow-glow",
                glitch > 0 && "glitch",
              )}
            >
              {digits}
            </span>
            <span className={cn("text-[max(11px,3.2cqi)] tracking-[0.06em]", running ? "text-ink" : "text-dim")}>
              <span className={cn("mr-[0.45em] inline-block size-[0.55em] align-[0.05em]", running ? "animate-blink bg-accent" : "bg-dim")} />
              {status} · {Math.round(progress * 100)}%
            </span>
          </Dial>

          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2" aria-hidden="true">
              {Array.from({ length: every }, (_, i) => {
                const done = mode === "long" || i < shown;
                const current = mode === "focus" && i === shown;
                return (
                  <span
                    key={i}
                    className={cn(
                      "h-2 w-[22px] border transition-colors duration-300",
                      done ? "border-focus bg-focus shadow-pip" : current ? "animate-pip border-focus" : "border-line-2",
                    )}
                  />
                );
              })}
            </div>
            <div className="text-center text-xs text-dim [&_em]:text-accent [&_em]:not-italic">{caption}</div>
          </div>

          <div className="grid grid-cols-[1fr_1.6fr_1fr] items-stretch gap-2">
            <button type="button" onClick={actions.reset} className={cn(btn, "border-line-2 bg-panel text-[13px] text-ink hover:border-accent hover:text-bright")}>
              ↺ reset
            </button>
            <button
              type="button"
              onClick={actions.toggle}
              className={cn(btn, "border-accent text-[15px] font-bold shadow-cta hover:shadow-cta-hover", running ? "bg-transparent text-accent" : "bg-accent text-void")}
            >
              {running ? "‖ pause" : paused ? "▶ resume" : "▶ start"}
            </button>
            <button type="button" onClick={actions.skip} className={cn(btn, "border-line-2 bg-panel text-[13px] text-ink hover:border-accent hover:text-bright")}>
              skip ⇥
            </button>
          </div>

          <div className="text-center text-[11px] tracking-[0.03em] text-dim [@media(hover:none)]:hidden [&_kbd]:rounded-xs [&_kbd]:border [&_kbd]:border-line-2 [&_kbd]:px-[5px] [&_kbd]:py-px [&_kbd]:font-[inherit] [&_kbd]:text-ink">
            <kbd>space</kbd> start/pause · <kbd>r</kbd> reset · <kbd>s</kbd> skip · <kbd>1</kbd>
            <kbd>2</kbd>
            <kbd>3</kbd> mode
          </div>
        </main>

        <aside className="grid min-w-0 content-start gap-[18px]">
          <section className={panel}>
            <button
              type="button"
              aria-expanded={configOpen}
              aria-controls="config-body"
              onClick={() => setConfigOpen((o) => !o)}
              className={cn(panelHead, "focus-ring cursor-pointer hover:text-ink", configOpen ? "border-line" : "border-transparent")}
            >
              <span className={fileName}>~/.focusd/config.yml</span>
              <span className={cn("transition-transform duration-200", !configOpen && "-rotate-90")} aria-hidden="true">
                ▾
              </span>
            </button>
            {configOpen && (
              <div id="config-body" className="grid gap-0.5 px-3 pt-1.5 pb-3">
                <Stepper id="cfg-focus" name="focus_len" hint="length of each pomodoro" value={settings.focus} limits={LIMITS.focus} unit="min" onChange={(v) => actions.setNumber("focus", v)} />
                <Stepper id="cfg-short" name="short_break" hint="rest between sessions" value={settings.short} limits={LIMITS.short} unit="min" onChange={(v) => actions.setNumber("short", v)} />
                <Stepper id="cfg-long" name="long_break" hint="rest after a full cycle" value={settings.long} limits={LIMITS.long} unit="min" onChange={(v) => actions.setNumber("long", v)} />
                <Stepper id="cfg-every" name="long_every" hint="sessions per cycle" value={settings.every} limits={LIMITS.every} unit="sess" onChange={(v) => actions.setNumber("every", v)} />
                <Toggle name="auto_start" hint="roll into the next timer" on={settings.autoStart} onToggle={() => actions.setFlag("autoStart", !settings.autoStart)} />
                <Toggle name="sound" hint="chiptune alert when time's up" on={settings.sound} onToggle={() => actions.setFlag("sound", !settings.sound)} />
              </div>
            )}
          </section>

          <section className={panel}>
            <div className={cn(panelHead, "border-line")}>
              <span className={fileName}>/var/log/focusd.log</span>
              <span className="flex gap-3.5 tabular-nums [&_b]:font-medium [&_b]:text-bright">
                <span>
                  today <b>{stats.sessions}</b>
                </span>
                <span>
                  focus <b>{fmtDur(stats.focusMs)}</b>
                </span>
              </span>
            </div>
            <div
              ref={logRef}
              aria-live="polite"
              className="h-[220px] overflow-y-auto px-3 py-2.5 text-xs leading-[1.7] [scrollbar-color:var(--color-line-2)_transparent] [scrollbar-width:thin] desk:h-[300px]"
            >
              {log.map((l, i) => (
                <div
                  key={l.id}
                  className="flex animate-type gap-2.5 whitespace-nowrap"
                  style={i < BOOT_LINES && l.id <= BOOT_LINES * 2 ? { animationDelay: `${i * 0.18}s` } : undefined}
                >
                  <span className="flex-none text-dim tabular-nums">[{l.t}]</span>
                  <span className={cn("min-w-0 whitespace-normal", LOG_COLOR[l.kind])}>{l.msg}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
