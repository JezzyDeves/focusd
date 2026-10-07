"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Parked } from "@/lib/pomodoro";
import { thinScroll } from "./styles";

type ParkedPickerProps = {
  id: string;
  parked: Parked[];
  /** The parked thought that is currently the task, if any. */
  picked?: Parked;
  onPick: (text: string) => void;
};

/** A themed stand-in for <select>: native option lists can't be styled to match the terminal. */
export function ParkedPicker({ id, parked, picked, onPick }: ParkedPickerProps) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optId = (i: number) => `${listId}-opt-${i}`;

  const show = () => {
    setHi(Math.max(0, parked.findIndex((p) => p.id === picked?.id)));
    setOpen(true);
  };

  const choose = (i: number) => {
    const p = parked[i];
    if (p) onPick(p.text);
    setOpen(false);
  };

  // Close on a click or tap anywhere else.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, hi]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = parked.length - 1;
    const keys: Record<string, () => void> = open
      ? {
          ArrowDown: () => setHi((i) => Math.min(last, i + 1)),
          ArrowUp: () => setHi((i) => Math.max(0, i - 1)),
          Home: () => setHi(0),
          End: () => setHi(last),
          Enter: () => choose(hi),
          " ": () => choose(hi),
          Escape: () => setOpen(false),
        }
      : { ArrowDown: show, ArrowUp: show, Enter: show, " ": show };
    if (e.key === "Tab") return setOpen(false);
    // Keep picker keys away from the global timer shortcuts.
    e.stopPropagation();
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 basis-48">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optId(hi) : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className="focus-ring group flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-xs px-1 text-left text-base desk:text-[13px]"
      >
        <span className={cn("min-w-0 flex-1 truncate", picked ? "text-bright" : "text-dim")}>{picked ? picked.text : `from parking lot (${parked.length})`}</span>
        <ChevronDown size={14} className={cn("flex-none text-dim transition group-hover:text-accent", open && "rotate-180 text-accent")} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Parked thoughts"
          className={cn(
            "absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xs border border-line-2 bg-panel-2 py-1 text-xs shadow-[0_10px_30px_rgb(0_0_0/0.6)]",
            thinScroll,
          )}
        >
          {parked.map((p, i) => {
            const selected = p.id === picked?.id;
            return (
              <li
                key={p.id}
                id={optId(i)}
                data-i={i}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setHi(i)}
                onClick={() => choose(i)}
                className={cn(
                  "flex cursor-pointer items-start gap-2 border-l-2 px-2.5 py-1.5 leading-[1.5]",
                  i === hi ? "border-accent bg-accent/10 text-bright" : "border-transparent text-ink",
                  selected && "text-accent",
                )}
              >
                <span className="flex-none text-dim tabular-nums">[{p.t.slice(0, 5)}]</span>
                <span className="min-w-0 flex-1 break-words">{p.text}</span>
                {selected && <span className="flex-none text-[11px] tracking-[0.04em]">[focus]</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
