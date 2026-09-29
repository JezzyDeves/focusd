import { TEXT_MAX, type Intent } from "@/lib/pomodoro";
import { panel, promptInput } from "./styles";

type IntentPanelProps = {
  intent: Intent;
  onEdit: (field: keyof Intent, value: string) => void;
};

const FIELDS: { field: keyof Intent; label: string; placeholder: string }[] = [
  { field: "task", label: "task", placeholder: "what is this session for?" },
  { field: "then", label: "if distracted, then", placeholder: "park it (n) and get back to it" },
];

/**
 * The session's intention: what it's for, plus an if-then plan for distractions.
 * If-then plans ("implementation intentions") help with response inhibition in ADHD.
 */
export function IntentPanel({ intent, onEdit }: IntentPanelProps) {
  return (
    <div className={`${panel} px-3 py-1 text-xs`}>
      {FIELDS.map(({ field, label, placeholder }) => (
        <div key={field} className="flex flex-wrap items-center gap-x-2 border-b border-dashed border-line py-0.5 last:border-b-0">
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
      ))}
    </div>
  );
}
