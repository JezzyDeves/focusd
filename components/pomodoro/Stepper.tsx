"use client";

import { useState } from "react";
import { clamp } from "@/lib/pomodoro";

type StepperProps = {
  id: string;
  name: string;
  hint: string;
  value: number;
  limits: [number, number];
  unit: string;
  onChange: (value: number) => void;
};

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
    <div className="row">
      <label htmlFor={id}>
        <span className="key">{name}</span>:<span className="hint">{hint}</span>
      </label>
      <div className="step">
        <button type="button" aria-label={`Decrease ${name}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1, limits))}>
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft ?? String(value)}
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
        <button type="button" aria-label={`Increase ${name}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1, limits))}>
          +
        </button>
      </div>
      <span className="unit">{unit}</span>
    </div>
  );
}
