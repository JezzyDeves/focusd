type ConfigRowProps = {
  name: string;
  hint: string;
  /** When set, the name renders as a <label> for this input id. */
  htmlFor?: string;
  children: React.ReactNode;
};

/** One `key: value` line in the config.yml panel. */
export function ConfigRow({ name, hint, htmlFor, children }: ConfigRowProps) {
  const text = (
    <>
      <span className="text-accent">{name}</span>:<span className="block text-[11px] text-dim">{hint}</span>
    </>
  );

  return (
    <div className="grid min-h-12 grid-cols-[1fr_auto_34px] items-center gap-2.5 border-b border-dashed border-line last:border-b-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="cursor-pointer text-ink">
          {text}
        </label>
      ) : (
        <span className="text-ink">{text}</span>
      )}
      {children}
    </div>
  );
}
