import { ConfigRow } from "./ConfigRow";

type ToggleProps = {
  name: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
};

/** A boolean config row rendered as a terminal-style [x] / [ ] switch. */
export function Toggle({ name, hint, on, onToggle }: ToggleProps) {
  return (
    <ConfigRow name={name} hint={hint}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={name}
        onClick={onToggle}
        className="focus-ring col-span-2 min-h-10 cursor-pointer justify-self-end rounded-xs border border-line-2 bg-transparent px-2.5 text-[13px] leading-none font-medium whitespace-nowrap text-dim transition-colors hover:border-accent aria-checked:border-accent/55 aria-checked:text-accent"
      >
        {on ? "[x] true" : "[ ] false"}
      </button>
    </ConfigRow>
  );
}
