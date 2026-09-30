"use client";

import { useEffect, useRef, useState } from "react";
import { usePomodoro } from "@/hooks/usePomodoro";
import { cn } from "@/lib/cn";
import { LIMITS, MODES, fmt, fmtDur, stamp, type LogKind, type Mode } from "@/lib/pomodoro";
import { Dial } from "./Dial";
import { IntentPanel } from "./IntentPanel";
import { MatrixRain } from "./MatrixRain";
import { ParkingLot } from "./ParkingLot";
import { Stepper } from "./Stepper";
import { deskColumn, deskScroll, fileName, panel, panelHead, thinScroll } from "./styles";
import { Toggle } from "./Toggle";

const BOOT_LINES = 5;

const LOG_COLOR: Record<LogKind, string> = {
  sys: "text-ink",
  ok: "text-focus",
  brk: "text-short",
  long: "text-long",
  warn: "text-danger",
};

const btn =
  "focus-ring min-h-[52px] cursor-pointer rounded-xs border px-2.5 leading-none font-medium tracking-[0.06em] uppercase transition active:translate-y-px";

/** A `# section` comment between groups of config rows. */
function ConfigComment({ children }: { children: string }) {
  return <div className="pt-3 pb-0.5 text-[11px] tracking-[0.04em] text-dim"># {children}</div>;
}

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
  const { settings, mode, running, alarming, remaining, total, progress, cycle, next, cued, stats, glitch, flash, log, intent, parked, actions } =
    usePomodoro();
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
  const wrapping = running && cued != null;
  const status = alarming ? "TIME_UP" : wrapping ? "WRAP_UP" : running ? "RUNNING" : paused ? "PAUSED" : "READY";

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
      {settings.motion && <MatrixRain running={running} />}
      {settings.scanlines && <div className="crt pointer-events-none fixed inset-0 z-50" aria-hidden="true" />}
      {flash > 0 && <div key={`flash-${flash}`} className="pointer-events-none fixed inset-0 z-40 animate-flash bg-accent opacity-0" aria-hidden="true" />}

      <div className="relative z-10 mx-auto grid max-w-[520px] gap-[18px] px-4 pt-3.5 pb-10 desk:h-dvh desk:max-w-none desk:grid-rows-[auto_auto_minmax(260px,1fr)] desk:gap-y-6 desk:px-8 desk:pt-5 desk:pb-6">
        <header className="flex items-center justify-between gap-3 border-b border-dashed border-line-2 pb-2.5 text-xs text-dim">
          <span className="truncate text-accent">
            root@<b className="font-medium text-bright">focusd</b>:~$ ./pomodoro
            <span className="ml-0.5 inline-block h-[1.05em] w-[0.6em] animate-blink bg-accent align-[-0.18em]" />
          </span>
          <Clock />
        </header>

        {/* Desktop: the dial on the left, its controls in a column beside it. */}
        <main className="grid min-w-0 content-start gap-[18px] desk:grid-cols-[auto_minmax(0,460px)] desk:justify-center desk:gap-x-14">
          <nav className="grid grid-cols-3 gap-1.5 desk:col-start-2 desk:self-end" aria-label="Timer mode">
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

          <Dial progress={progress} running={running} className="desk:col-start-1 desk:row-span-2 desk:row-start-1">
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
              {status} · {wrapping ? `next: ${MODES[next].label}` : `${Math.round(progress * 100)}%`}
            </span>
          </Dial>

          <div className="grid min-w-0 content-start gap-[18px] desk:col-start-2 desk:self-start">
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

            {mode === "focus" && settings.intention && <IntentPanel intent={intent} onEdit={actions.editIntent} />}

            <div className="grid grid-cols-[1fr_1.6fr_1fr] items-stretch gap-2">
              <button type="button" onClick={actions.reset} className={cn(btn, "border-line-2 bg-panel text-[13px] text-ink hover:border-accent hover:text-bright")}>
                ↺ reset
              </button>
              <button
                type="button"
                onClick={actions.toggle}
                className={cn(
                  btn,
                  "border-accent text-[15px] font-bold shadow-cta hover:shadow-cta-hover",
                  alarming ? "animate-pulse bg-accent text-void" : running ? "bg-transparent text-accent" : "bg-accent text-void",
                )}
              >
                {alarming ? "■ stop alarm" : running ? "‖ pause" : paused ? "▶ resume" : "▶ start"}
              </button>
              <button type="button" onClick={actions.skip} className={cn(btn, "border-line-2 bg-panel text-[13px] text-ink hover:border-accent hover:text-bright")}>
                skip ⇥
              </button>
            </div>

            <div className="text-center text-[11px] tracking-[0.03em] text-dim [@media(hover:none)]:hidden [&_kbd]:rounded-xs [&_kbd]:border [&_kbd]:border-line-2 [&_kbd]:px-[5px] [&_kbd]:py-px [&_kbd]:font-[inherit] [&_kbd]:text-ink">
              <kbd>space</kbd> start/pause · <kbd>esc</kbd> stop alarm · <kbd>r</kbd> reset · <kbd>s</kbd> skip · <kbd>1</kbd>
              <kbd>2</kbd>
              <kbd>3</kbd> mode · <kbd>n</kbd> park a thought
            </div>
          </div>
        </main>

        {/* Desktop: columns that fill the rest of the screen and scroll on their own. Config gets a column to itself; wide screens get three. */}
        <aside className="grid min-w-0 content-start gap-[18px] desk:min-h-0 desk:grid-cols-2 desk:grid-rows-2 desk:content-stretch desk:gap-x-6 xl:grid-cols-3 xl:grid-rows-1">
          <ParkingLot parked={parked} hideList={running && mode === "focus"} onPark={actions.park} onRemove={actions.unpark} onClear={actions.clearParked} />

          <section className={cn(panel, deskColumn, "desk:col-start-2 desk:row-span-2 xl:col-start-auto xl:row-span-1", !configOpen && "desk:self-start")}>
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
              <div id="config-body" className={cn("grid content-start gap-0.5 px-3 pt-0 pb-3", deskScroll)}>
                <ConfigComment>timer</ConfigComment>
                <Stepper id="cfg-focus" name="focus_len" hint="length of each pomodoro" value={settings.focus} limits={LIMITS.focus} unit="min" onChange={(v) => actions.setNumber("focus", v)} />
                <Stepper id="cfg-short" name="short_break" hint="rest between sessions" value={settings.short} limits={LIMITS.short} unit="min" onChange={(v) => actions.setNumber("short", v)} />
                <Stepper id="cfg-long" name="long_break" hint="rest after a full cycle" value={settings.long} limits={LIMITS.long} unit="min" onChange={(v) => actions.setNumber("long", v)} />
                <Stepper id="cfg-every" name="long_every" hint="sessions per cycle" value={settings.every} limits={LIMITS.every} unit="sess" onChange={(v) => actions.setNumber("every", v)} />
                <Toggle name="auto_start" hint="roll into the next timer" on={settings.autoStart} onToggle={() => actions.setFlag("autoStart", !settings.autoStart)} />

                <ConfigComment>alerts</ConfigComment>
                <Toggle name="heads_up" hint="soft cue at 5m and 1m left" on={settings.headsUp} onToggle={() => actions.setFlag("headsUp", !settings.headsUp)} />
                <Toggle name="sound" hint="play a tone when time's up" on={settings.sound} onToggle={() => actions.setFlag("sound", !settings.sound)} />
                <Toggle name="soft_tone" hint="gentle chime, not chiptune" on={settings.softTone} onToggle={() => actions.setFlag("softTone", !settings.softTone)} />
                <Stepper id="cfg-volume" name="volume" hint="alert loudness" value={settings.volume} limits={LIMITS.volume} unit="/10" onChange={(v) => actions.setNumber("volume", v)} />
                <Toggle name="repeat_alert" hint="loop the alert" on={settings.repeatAlert} onToggle={() => actions.setFlag("repeatAlert", !settings.repeatAlert)} />
                {settings.repeatAlert && (
                  <Stepper
                    id="cfg-repeat"
                    name="repeat_count"
                    hint="plays per alert · 0 = until stopped"
                    value={settings.repeatCount}
                    limits={LIMITS.repeatCount}
                    unit={settings.repeatCount === 0 ? "∞" : "x"}
                    onChange={(v) => actions.setNumber("repeatCount", v)}
                  />
                )}
                <Toggle name="vibrate" hint="buzz on alerts (phones)" on={settings.vibrate} onToggle={() => actions.setFlag("vibrate", !settings.vibrate)} />
                <Toggle name="notify" hint="desktop pop-up when time's up" on={settings.notify} onToggle={() => actions.setFlag("notify", !settings.notify)} />

                <ConfigComment>focus aids</ConfigComment>
                <Toggle name="intention" hint="name the task before focusing" on={settings.intention} onToggle={() => actions.setFlag("intention", !settings.intention)} />

                <ConfigComment>sensory</ConfigComment>
                <Toggle name="motion" hint="rain, glitch and blinking" on={settings.motion} onToggle={() => actions.setFlag("motion", !settings.motion)} />
                <Toggle name="scanlines" hint="CRT lines and vignette" on={settings.scanlines} onToggle={() => actions.setFlag("scanlines", !settings.scanlines)} />
                <Toggle name="flash" hint="flash the screen at time up" on={settings.flash} onToggle={() => actions.setFlag("flash", !settings.flash)} />
              </div>
            )}
          </section>

          <section className={cn(panel, deskColumn)}>
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
              className={cn("h-[220px] overflow-y-auto px-3 py-2.5 text-xs leading-[1.7]", thinScroll, deskScroll, "desk:h-auto")}
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
