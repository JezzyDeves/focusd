"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Brain,
  CheckCheck,
  ChevronDown,
  Clock as ClockIcon,
  Coffee,
  Eye,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  Settings,
  SkipForward,
  Sofa,
  Target,
  Timer,
  Users,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { usePomodoro } from "@/hooks/usePomodoro";
import { usePresence } from "@/hooks/usePresence";
import { useRoom } from "@/hooks/useRoom";
import { playTyping } from "@/lib/audio";
import { cn } from "@/lib/cn";
import { LIMITS, MODES, fmt, fmtDur, stamp, type LogKind, type Mode } from "@/lib/pomodoro";
import { GLOBAL_TOPIC, parseGlobalMeta } from "@/lib/presence";
import { Dial } from "./Dial";
import { IntentPanel } from "./IntentPanel";
import { MatrixRain } from "./MatrixRain";
import { ParkingLot } from "./ParkingLot";
import { RoomPanel } from "./RoomPanel";
import { Stepper } from "./Stepper";
import { deskColumn, deskScroll, fileName, panel, panelHead, thinScroll } from "./styles";
import { Toggle } from "./Toggle";

const BOOT_LINES = 5;
/** Seconds a log line takes to type itself out: matches --animate-type in globals.css. */
const TYPE_S = 0.5;

const LOG_COLOR: Record<LogKind, string> = {
  sys: "text-ink",
  ok: "text-focus",
  brk: "text-short",
  long: "text-long",
  warn: "text-danger",
};

const MODE_ICON: Record<Mode, LucideIcon> = {
  focus: Brain,
  short: Coffee,
  long: Sofa,
};

const btn =
  "focus-ring inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-1.5 rounded-xs border px-2.5 leading-none font-medium tracking-[0.06em] uppercase transition active:translate-y-px";

/** A `# section` comment between groups of config rows. */
function ConfigComment({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <div className="flex items-center gap-1.5 pt-3 pb-0.5 text-[11px] tracking-[0.04em] text-dim">
      <Icon size={12} className="flex-none" />
      {"# "}
      {children}
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(stamp());
    const id = window.setInterval(() => setNow(stamp()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
      <ClockIcon size={12} className="flex-none" />
      {now ?? "--:--:--"}
    </span>
  );
}

export function Pomodoro() {
  const { settings, mode, running, endsAt, alarming, remaining, total, progress, cycle, next, cued, stats, glitch, flash, log, intent, parked, actions } =
    usePomodoro();
  const everyone = usePresence({
    topic: settings.focusRoom ? GLOBAL_TOPIC : null,
    label: "focus_room",
    meta: { mode, running },
    parse: parseGlobalMeta,
    log: actions.log,
  });
  const focusing = everyone.peers.filter((p) => p.meta.mode === "focus" && p.meta.running).length;
  const room = useRoom({ settings, mode, running, endsAt, remaining, task: intent.task, syncStart: actions.syncStart, log: actions.log });
  const [configOpen, setConfigOpen] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  /** Id of the newest log line already typed, so only new lines make a sound. */
  const typedId = useRef(0);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  // Type new log lines out loud. The boot lines are skipped: there's been no click to allow audio yet.
  useEffect(() => {
    const last = log.at(-1)?.id ?? 0;
    const fresh = typedId.current > 0 && last > typedId.current;
    typedId.current = last;
    if (!fresh || !settings.sound || !settings.logSound) return;
    // With motion off a line appears at once, so it gets a single keystroke.
    const stilled = !settings.motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    playTyping(stilled ? 0 : TYPE_S);
  }, [log, settings.sound, settings.logSound, settings.motion]);

  const every = settings.every;
  const shown = Math.min(cycle, every);
  const digits = fmt(remaining);
  const paused = !running && remaining < total;
  const wrapping = running && cued != null;
  /** The task can be named (typed or picked from the parking lot) before a focus session. */
  const canPickTask = mode === "focus" && settings.intention;
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

  const everyoneLine =
    everyone.status === "online"
      ? `▲ ${focusing} other${focusing === 1 ? "" : "s"} focusing`
      : everyone.status === "connecting"
        ? "▲ connecting…"
        : "▲ offline";

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
            {(Object.keys(MODES) as Mode[]).map((m) => {
              const Icon = MODE_ICON[m];
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  data-sfx
                  onClick={() => actions.pickMode(m)}
                  className="focus-ring inline-flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border border-line bg-transparent px-1.5 py-1.5 text-xs leading-none font-medium tracking-[0.04em] text-dim transition hover:border-line-2 hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-void aria-pressed:shadow-glow sm:flex-row sm:gap-1.5"
                >
                  <Icon size={14} className="flex-none" />
                  <span className="truncate">{MODES[m].label}</span>
                </button>
              );
            })}
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
              {everyone.status !== "off" && <div className="text-center text-[11px] tracking-[0.04em] text-dim tabular-nums">{everyoneLine}</div>}
            </div>

            {canPickTask && <IntentPanel task={intent.task} parked={parked} onTask={actions.setTask} />}

            <div className="grid grid-cols-[1fr_1.6fr_1fr] items-stretch gap-2">
              <button type="button" data-sfx onClick={actions.reset} className={cn(btn, "border-line-2 bg-panel text-[13px] text-ink hover:border-accent hover:text-bright")}>
                <RotateCcw size={15} className="flex-none" />
                reset
              </button>
              <button
                type="button"
                data-sfx
                onClick={actions.toggle}
                className={cn(
                  btn,
                  "border-accent text-[15px] font-bold shadow-cta hover:shadow-cta-hover",
                  alarming ? "animate-pulse bg-accent text-void" : running ? "bg-transparent text-accent" : "bg-accent text-void",
                )}
              >
                {alarming ? (
                  <>
                    <BellOff size={17} className="flex-none" />
                    stop alarm
                  </>
                ) : running ? (
                  <>
                    <Pause size={17} className="flex-none" />
                    pause
                  </>
                ) : (
                  <>
                    <Play size={17} className="flex-none" />
                    {paused ? "resume" : "start"}
                  </>
                )}
              </button>
              <button type="button" data-sfx onClick={actions.skip} className={cn(btn, "border-line-2 bg-panel text-[13px] text-ink hover:border-accent hover:text-bright")}>
                skip
                <SkipForward size={15} className="flex-none" />
              </button>
            </div>

            <div className="text-center text-[11px] tracking-[0.03em] text-dim [@media(hover:none)]:hidden [&_kbd]:rounded-xs [&_kbd]:border [&_kbd]:border-line-2 [&_kbd]:px-[5px] [&_kbd]:py-px [&_kbd]:font-[inherit] [&_kbd]:text-ink">
              <Keyboard size={13} className="mr-1 inline align-[-0.2em]" />
              <kbd>space</kbd> start/pause · <kbd>esc</kbd> stop alarm · <kbd>r</kbd> reset · <kbd>s</kbd> skip · <kbd>1</kbd>
              <kbd>2</kbd>
              <kbd>3</kbd> mode · <kbd>n</kbd> park a thought
            </div>

            {room.configured && <RoomPanel room={room} settings={settings} mode={mode} task={intent.task} />}
          </div>
        </main>

        {/* Desktop: columns that fill the rest of the screen and scroll on their own. Config gets a column to itself; wide screens get three. */}
        <aside className="grid min-w-0 content-start gap-[18px] desk:min-h-0 desk:grid-cols-2 desk:grid-rows-2 desk:content-stretch desk:gap-x-6 xl:grid-cols-3 xl:grid-rows-1">
          <ParkingLot
            parked={parked}
            hideList={running && mode === "focus"}
            active={canPickTask ? intent.task : ""}
            onFocus={canPickTask ? actions.setTask : undefined}
            onPark={actions.park}
            onRemove={actions.unpark}
            onClear={actions.clearParked}
          />

          <section className={cn(panel, deskColumn, "desk:col-start-2 desk:row-span-2 xl:col-start-auto xl:row-span-1", !configOpen && "desk:self-start")}>
            <button
              type="button"
              aria-expanded={configOpen}
              aria-controls="config-body"
              onClick={() => setConfigOpen((o) => !o)}
              className={cn(panelHead, "focus-ring cursor-pointer hover:text-ink", configOpen ? "border-line" : "border-transparent")}
            >
              <span className={fileName}>
                <Settings size={13} />
                ~/.focusd/config.yml
              </span>
              <ChevronDown size={15} className={cn("flex-none transition-transform duration-200", !configOpen && "-rotate-90")} />
            </button>
            {configOpen && (
              <div id="config-body" className={cn("grid content-start gap-0.5 px-3 pt-0 pb-3", deskScroll)}>
                <ConfigComment icon={Timer}>timer</ConfigComment>
                <Stepper id="cfg-focus" name="focus_len" hint="length of each pomodoro" value={settings.focus} limits={LIMITS.focus} unit="min" onChange={(v) => actions.setNumber("focus", v)} />
                <Stepper id="cfg-short" name="short_break" hint="rest between sessions" value={settings.short} limits={LIMITS.short} unit="min" onChange={(v) => actions.setNumber("short", v)} />
                <Stepper id="cfg-long" name="long_break" hint="rest after a full cycle" value={settings.long} limits={LIMITS.long} unit="min" onChange={(v) => actions.setNumber("long", v)} />
                <Stepper id="cfg-every" name="long_every" hint="sessions per cycle" value={settings.every} limits={LIMITS.every} unit="sess" onChange={(v) => actions.setNumber("every", v)} />
                <Toggle name="auto_start" hint="roll into the next timer" on={settings.autoStart} onToggle={() => actions.setFlag("autoStart", !settings.autoStart)} />

                <ConfigComment icon={Bell}>alerts</ConfigComment>
                <Toggle name="heads_up" hint="soft cue at 5m and 1m left" on={settings.headsUp} onToggle={() => actions.setFlag("headsUp", !settings.headsUp)} />
                <Toggle name="sound" hint="clicks, typing and alerts" on={settings.sound} onToggle={() => actions.setFlag("sound", !settings.sound)} />
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

                <ConfigComment icon={Target}>focus aids</ConfigComment>
                <Toggle name="intention" hint="name the task before focusing" on={settings.intention} onToggle={() => actions.setFlag("intention", !settings.intention)} />

                <ConfigComment icon={Users}>together</ConfigComment>
                <Toggle name="focus_room" hint="see how many others are focusing" on={settings.focusRoom} onToggle={() => actions.setFlag("focusRoom", !settings.focusRoom)} />
                <Toggle name="share_task" hint="show your task to your room" on={settings.shareTask} onToggle={() => actions.setFlag("shareTask", !settings.shareTask)} />

                <ConfigComment icon={Eye}>sensory</ConfigComment>
                <Toggle name="motion" hint="rain, glitch and blinking" on={settings.motion} onToggle={() => actions.setFlag("motion", !settings.motion)} />
                <Toggle name="scanlines" hint="CRT lines and vignette" on={settings.scanlines} onToggle={() => actions.setFlag("scanlines", !settings.scanlines)} />
                <Toggle name="flash" hint="flash the screen at time up" on={settings.flash} onToggle={() => actions.setFlag("flash", !settings.flash)} />
              </div>
            )}
          </section>

          <section className={cn(panel, deskColumn)}>
            <div className={cn(panelHead, "border-line")}>
              <span className={fileName}>
                <ScrollText size={13} />
                /var/log/focusd.log
              </span>
              <span className="flex gap-3.5 tabular-nums [&_b]:font-medium [&_b]:text-bright [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1">
                <span>
                  <CheckCheck size={13} className="flex-none" />
                  today <b>{stats.sessions}</b>
                </span>
                <span>
                  <Timer size={13} className="flex-none" />
                  focus <b>{fmtDur(stats.focusMs)}</b>
                </span>
                <button
                  type="button"
                  aria-pressed={settings.logSound}
                  aria-label="Log typing sound"
                  title={settings.logSound ? "mute log typing" : "unmute log typing"}
                  onClick={() => actions.setFlag("logSound", !settings.logSound)}
                  className="focus-ring -my-1.5 -mr-1.5 inline-flex min-h-8 cursor-pointer items-center rounded-xs px-1.5 text-dim hover:text-bright aria-pressed:text-accent"
                >
                  {settings.logSound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
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
