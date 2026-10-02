"use client";

import { useRef } from "react";
import { StickyNote, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PARK_INPUT_ID, TEXT_MAX, type Parked } from "@/lib/pomodoro";
import { deskColumn, deskScroll, fileName, panel, panelHead, promptInput, thinScroll } from "./styles";

type ParkingLotProps = {
  parked: Parked[];
  /** Keep the list out of sight during a running focus session, so it doesn't pull attention back. */
  hideList: boolean;
  onPark: (text: string) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
};

/** Somewhere to drop a stray thought mid-session and pick it up on the break. */
export function ParkingLot({ parked, hideList, onPark, onRemove, onClear }: ParkingLotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const count = parked.length;

  return (
    <section className={cn(panel, deskColumn)}>
      <div className={cn(panelHead, "border-line")}>
        <span className={fileName}>
          <StickyNote size={13} />
          ~/parking_lot.txt
        </span>
        {count > 0 && !hideList ? (
          <button type="button" onClick={onClear} className="focus-ring -my-1 inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-xs px-1.5 text-dim hover:text-bright">
            <Trash2 size={13} className="flex-none" />
            clear all
          </button>
        ) : (
          <span className="tabular-nums">
            <b className="font-medium text-bright">{count}</b> parked
          </span>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-b border-dashed border-line px-3 py-0.5 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          const el = inputRef.current;
          if (!el) return;
          onPark(el.value);
          el.value = "";
          // Hand focus back to the page so the shortcuts work again straight away.
          el.blur();
        }}
      >
        <label htmlFor={PARK_INPUT_ID} className="flex-none text-accent">
          &gt;<span className="sr-only">Park a thought</span>
        </label>
        <input
          ref={inputRef}
          id={PARK_INPUT_ID}
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={TEXT_MAX}
          placeholder="stray thought? park it here"
          className={promptInput}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.blur();
          }}
        />
      </form>

      {hideList ? (
        <p className="px-3 py-2.5 text-xs text-dim">
          {count > 0 ? `${count} parked · review on your break.` : "nothing parked. press n to jot a thought."}
        </p>
      ) : count === 0 ? (
        <p className="px-3 py-2.5 text-xs text-dim">nothing parked. press n mid-session to jot a thought and keep going.</p>
      ) : (
        <ul className={cn("max-h-[180px] overflow-y-auto px-3 py-1.5 text-xs leading-[1.6]", thinScroll, deskScroll, "desk:max-h-none")}>
          {parked.map((p) => (
            <li key={p.id} className="flex items-start gap-2.5 py-0.5">
              <span className="flex-none pt-1 text-dim tabular-nums">[{p.t.slice(0, 5)}]</span>
              <span className="min-w-0 flex-1 pt-1 break-words text-ink">{p.text}</span>
              <button
                type="button"
                aria-label={`Remove: ${p.text}`}
                onClick={() => onRemove(p.id)}
                className="focus-ring inline-flex min-h-8 flex-none cursor-pointer items-center rounded-xs px-1.5 text-dim hover:text-bright"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
