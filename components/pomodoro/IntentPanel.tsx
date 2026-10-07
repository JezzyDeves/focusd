import { Fragment } from "react";
import { TEXT_MAX, type Intent, type Parked } from "@/lib/pomodoro";
import { panel, promptInput } from "./styles";

type IntentPanelProps = {
  intent: Intent;
  /** Parked thoughts the task can be picked from instead of typed. */
  parked: Parked[];
  onEdit: (field: keyof Intent, value: string) => void;
};

const FIELDS: { field: keyof Intent; label: string; placeholder: string }[] = [
  { field: "task", label: "task", placeholder: "what is this session for?" },
  { field: "then", label: "if distracted, then", placeholder: "park it (n) and get back to it" },
];

const row = "flex flex-wrap items-center gap-x-2 border-b border-dashed border-line py-0.5 last:border-b-0";

/**
 * The session's intention: what it's for, plus an if-then plan for distractions.
 * If-then plans ("implementation intentions") help with response inhibition in ADHD.
 */
export function IntentPanel({ intent, parked, onEdit }: IntentPanelProps) {
  const task = intent.task.trim();
  const picked = parked.find((p) => p.text === task);

  return (
    <div className={`${panel} px-3 py-1 text-xs`}>
      {FIELDS.map(({ field, label, placeholder }) => (
        <Fragment key={field}>
          <div className={row}>
            <label htmlFor={`intent-${field}`} className="flex-none cursor-pointer text-accent">
              &gt; {label}:
            </label>
            <input
              id={`intent-${field}`}
              type="text"
              autoComplete="off"
              maxLength={TEXT_MAX}
              value={intent[field]}
              placeholder={placeholder}
              className={promptInput}
              onChange={(e) => onEdit(field, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
              }}
            />
          </div>

          {field === "task" && parked.length > 0 && (
            <div className={row}>
              <label htmlFor="intent-pick" className="flex-none cursor-pointer text-dim">
                &gt; or pick:
              </label>
              <select
                id="intent-pick"
                value={picked ? String(picked.id) : ""}
                className={`${promptInput} cursor-pointer truncate ${picked ? "" : "text-dim"}`}
                onChange={(e) => {
                  const p = parked.find((x) => String(x.id) === e.target.value);
                  if (p) onEdit("task", p.text);
                  e.currentTarget.blur();
                }}
              >
                <option value="" disabled>
                  from parking lot ({parked.length})
                </option>
                {parked.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.text}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
