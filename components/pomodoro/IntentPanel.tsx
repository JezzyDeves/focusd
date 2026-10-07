import { TEXT_MAX, type Parked } from "@/lib/pomodoro";
import { ParkedPicker } from "./ParkedPicker";
import { panel, promptInput } from "./styles";

type IntentPanelProps = {
  task: string;
  /** Parked thoughts the task can be picked from instead of typed. */
  parked: Parked[];
  onTask: (value: string) => void;
};

const row = "flex flex-wrap items-center gap-x-2 border-b border-dashed border-line py-0.5 last:border-b-0";

/** What the focus session is for: typed, or picked from the parking lot. */
export function IntentPanel({ task, parked, onTask }: IntentPanelProps) {
  const picked = parked.find((p) => p.text === task.trim());

  return (
    <div className={`${panel} relative z-20 px-3 py-1 text-xs`}>
      <div className={row}>
        <label htmlFor="intent-task" className="flex-none cursor-pointer text-accent">
          &gt; task:
        </label>
        <input
          id="intent-task"
          type="text"
          autoComplete="off"
          maxLength={TEXT_MAX}
          value={task}
          placeholder="what is this session for?"
          className={promptInput}
          onChange={(e) => onTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
        />
      </div>

      {parked.length > 0 && (
        <div className={row}>
          <label htmlFor="intent-pick" className="flex-none cursor-pointer text-dim">
            &gt; or pick:
          </label>
          <ParkedPicker id="intent-pick" parked={parked} picked={picked} onPick={onTask} />
        </div>
      )}
    </div>
  );
}
