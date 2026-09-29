"use client";

import { useEffect, useState } from "react";
import type { Room } from "@/hooks/useRoom";
import { cn } from "@/lib/cn";
import { HANDLE_MAX, type RoomMeta } from "@/lib/rooms";
import { MODES, TEXT_MAX, fmt, type Mode, type Settings } from "@/lib/pomodoro";
import { fileName, panel, panelHead, promptInput } from "./styles";

type RoomPanelProps = {
  room: Room;
  settings: Settings;
  mode: Mode;
  /** Prefills the check-in. */
  task: string;
};

const MODE_COLOR: Record<Mode, string> = { focus: "text-focus", short: "text-short", long: "text-long" };

const smallBtn =
  "focus-ring min-h-10 cursor-pointer rounded-xs border border-line-2 px-2.5 text-xs leading-none text-ink transition-colors hover:border-accent hover:text-bright disabled:cursor-default disabled:opacity-50";

const STATUS_TEXT = { off: "", connecting: "connecting…", offline: "offline", online: "" };

/** One person in the room: mode, time left from their shared end time, and anything they chose to share. */
function PeerRow({ meta, name, now }: { meta: RoomMeta; name: string; now: number }) {
  const left = meta.running && meta.endAt != null ? Math.max(0, meta.endAt - now) : meta.left;
  const notes = [
    meta.task && `task: ${meta.task}`,
    meta.checkin && meta.checkin !== meta.task && `in: ${meta.checkin}`,
    meta.checkout && `out: ${meta.checkout}`,
  ].filter((n): n is string => !!n);
  return (
    <li className="py-0.5">
      <div className="flex items-baseline gap-2.5">
        <span className={cn("flex-none", meta.running ? MODE_COLOR[meta.mode] : "text-dim")} aria-hidden="true">
          {meta.running ? "●" : "○"}
        </span>
        <span className="min-w-0 flex-1 truncate text-ink">{name}</span>
        <span className={cn("flex-none", MODE_COLOR[meta.mode])}>{MODES[meta.mode].label}</span>
        <span className={cn("w-[5ch] flex-none text-right tabular-nums", meta.running ? "text-bright" : "text-dim")}>{fmt(left)}</span>
      </div>
      {notes.map((n) => (
        <p key={n} className="pl-5 break-words text-dim">
          {n}
        </p>
      ))}
    </li>
  );
}

/** A handle field that saves on blur or enter, so peers aren't sent every keystroke. */
function HandleInput({ handle, onSave }: { handle: string; onSave: (h: string) => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-dashed border-line px-3 py-0.5 text-xs">
      <label htmlFor="room-handle" className="flex-none cursor-pointer text-accent">
        &gt; handle:
      </label>
      <input
        key={handle}
        id="room-handle"
        type="text"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={HANDLE_MAX}
        defaultValue={handle}
        placeholder="optional"
        className={promptInput}
        onBlur={(e) => onSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
        }}
      />
    </div>
  );
}

/** A private room shared by link: who's in it, and the host's "start together" controls. */
export function RoomPanel({ room, settings, mode, task }: RoomPanelProps) {
  const { id, joined, busy, isHost, handle, status, peers, self, prompt, checkins, actions } = room;
  const [now, setNow] = useState(() => Date.now());

  // Peers' timers tick here even while ours is stopped.
  useEffect(() => {
    if (!joined) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [joined]);

  const minutes = settings[MODES[mode].key];

  return (
    <section className={panel}>
      <div className={cn(panelHead, "border-line")}>
        <span className={fileName}>{joined ? `~/room/${id}` : "~/room"}</span>
        {joined && (
          <span className="tabular-nums">
            {STATUS_TEXT[status] || (
              <>
                <b className="font-medium text-bright">{peers.length + 1}</b> here
              </>
            )}
          </span>
        )}
      </div>

      {!id && (
        <div className="grid gap-2.5 px-3 py-2.5 text-xs">
          <p className="text-dim">work alongside friends: open a private room and share its link. only people with the link can join.</p>
          <button type="button" disabled={busy} onClick={actions.create} className={cn(smallBtn, "justify-self-start")}>
            + create room
          </button>
        </div>
      )}

      {id && !joined && (
        <>
          <p className="px-3 pt-2.5 text-xs text-dim">
            you&apos;re invited to room <b className="font-medium text-bright">{id}</b>. pick a handle if you like, then join.
          </p>
          <HandleInput handle={handle} onSave={actions.setHandle} />
          <div className="flex gap-2 px-3 py-2.5">
            <button type="button" disabled={busy} onClick={actions.join} className={cn(smallBtn, "border-accent text-accent")}>
              ▶ join
            </button>
            <button type="button" onClick={() => actions.leave(true)} className={smallBtn}>
              dismiss
            </button>
          </div>
        </>
      )}

      {joined && (
        <>
          <HandleInput handle={handle} onSave={actions.setHandle} />

          <ul className="max-h-[220px] overflow-y-auto px-3 py-1.5 text-xs leading-[1.6] [scrollbar-color:var(--color-line-2)_transparent] [scrollbar-width:thin]">
            <PeerRow meta={self} name={handle ? `${handle} (you)` : "you"} now={now} />
            {peers.map((p) => (
              <PeerRow key={p.key} meta={p.meta} name={p.meta.handle || "anon"} now={now} />
            ))}
          </ul>
          {peers.length === 0 && status === "online" && (
            <p className="px-3 pb-2 text-xs text-dim">nobody else here yet. copy the link and send it to someone.</p>
          )}

          {prompt && (
            <form
              key={prompt}
              className="flex flex-wrap items-center gap-x-2 border-t border-dashed border-line px-3 py-1 text-xs"
              onSubmit={(e) => {
                e.preventDefault();
                actions.answer(new FormData(e.currentTarget).get("answer")?.toString() ?? "");
              }}
            >
              <label htmlFor="room-answer" className="basis-full pt-1.5 text-accent">
                &gt; {prompt === "checkin" ? "checking in: what are you working on?" : "checking out: how did it go?"}
              </label>
              <input
                id="room-answer"
                name="answer"
                type="text"
                autoComplete="off"
                enterKeyHint="send"
                maxLength={TEXT_MAX}
                defaultValue={prompt === "checkin" ? task : ""}
                placeholder="shared with this room · optional"
                className={promptInput}
              />
              <div className="flex gap-2 py-1">
                <button type="submit" className={smallBtn}>
                  share
                </button>
                <button type="button" onClick={() => actions.answer("")} className={smallBtn}>
                  not now
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line px-3 py-2.5 text-xs">
            {isHost ? (
              <>
                <button
                  type="button"
                  disabled={busy || status !== "online"}
                  onClick={actions.startTogether}
                  className={cn(smallBtn, "border-accent text-accent")}
                >
                  ▶ start {MODES[mode].label} together · {minutes}m
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checkins}
                  onClick={() => actions.setCheckins(!checkins)}
                  className={cn(smallBtn, checkins && "text-accent")}
                >
                  {checkins ? "[x]" : "[ ]"} check-ins
                </button>
              </>
            ) : (
              <span className="text-dim">the host can start a session for everyone.</span>
            )}
            <span className="flex-1" />
            <button type="button" onClick={actions.copyLink} className={smallBtn}>
              copy link
            </button>
            <button type="button" onClick={() => actions.leave()} className={smallBtn}>
              leave
            </button>
          </div>
        </>
      )}
    </section>
  );
}
