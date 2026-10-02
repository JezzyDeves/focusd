"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { clamp } from "@/lib/pomodoro";
import { ConfigRow } from "./ConfigRow";

type StepperProps = {
  id: string;
  name: string;
  hint: string;
  value: number;
  limits: [number, number];
  unit: string;
  onChange: (value: number) => void;
};

const stepBtn =
  "focus-ring inline-flex size-10 cursor-pointer items-center justify-center bg-panel-2 text-ink transition-colors enabled:hover:bg-accent enabled:hover:text-void disabled:cursor-default disabled:text-line-2";

/** A labelled number input with − / + buttons, clamped to `limits`. */
export function Stepper({ id, name, hint, value, limits, unit, onChange }: StepperProps) {
  // Local draft so the field can be empty or out of range mid-edit.
  const [draft, setDraft] = useState<string | null>(null);
  const [min, max] = limits;

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) onChange(clamp(n, limits));
    setDraft(null);
  };

  return (
    <ConfigRow name={name} hint={hint} htmlFor={id}>
      <div className="flex items-center overflow-hidden rounded-xs border border-line-2">
        <button type="button" className={stepBtn} aria-label={`Decrease ${name}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1, limits))}>
          <Minus size={16} />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft ?? String(value)}
          className="focus-ring h-10 w-12 border-x border-line-2 bg-void text-center text-base leading-none font-bold text-bright tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <button type="button" className={stepBtn} aria-label={`Increase ${name}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1, limits))}>
          <Plus size={16} />
        </button>
      </div>
      <span className="text-xs text-dim">{unit}</span>
    </ConfigRow>
  );
}
