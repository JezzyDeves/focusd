type ToggleProps = {
  name: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
};

/** A boolean config row rendered as a terminal-style [x] / [ ] switch. */
export function Toggle({ name, hint, on, onToggle }: ToggleProps) {
  return (
    <div className="row">
      <span>
        <span className="key">{name}</span>:<span className="hint">{hint}</span>
      </span>
      <button type="button" role="switch" className="toggle" aria-checked={on} aria-label={name} onClick={onToggle}>
        {on ? "[x] true" : "[ ] false"}
      </button>
    </div>
  );
}
