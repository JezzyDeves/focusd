type DialProps = {
  /** 0 → 1, how much of the current timer has elapsed. */
  progress: number;
  running: boolean;
  children: React.ReactNode;
};

const R = 118;
const C = 2 * Math.PI * R;
const TICKS = 60;

/** The clock face: 60 ticks that light up as time passes, a progress arc and a slow-spinning orbit. */
export function Dial({ progress, running, children }: DialProps) {
  const lit = Math.floor(progress * TICKS);

  return (
    <div className={`dial${running ? " running" : ""}`}>
      <svg viewBox="0 0 300 300" aria-hidden="true">
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
          const major = i % 5 === 0;
          const r1 = 140;
          const r2 = major ? 126 : 132;
          const cls = `tick${i < lit ? " on" : ""}${running && i === lit ? " head" : ""}`;
          return (
            <line
              key={i}
              className={cls}
              x1={150 + Math.cos(a) * r1}
              y1={150 + Math.sin(a) * r1}
              x2={150 + Math.cos(a) * r2}
              y2={150 + Math.sin(a) * r2}
              strokeWidth={major ? 2.5 : 1.5}
              strokeLinecap="square"
            />
          );
        })}
        <circle className="track" cx="150" cy="150" r={R} fill="none" strokeWidth="2" />
        <circle
          className="arc"
          cx="150"
          cy="150"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          transform="rotate(-90 150 150)"
        />
        <circle className="orbit" cx="150" cy="150" r="104" fill="none" strokeWidth="1" strokeDasharray="2 7" />
      </svg>
      <div className="face">{children}</div>
    </div>
  );
}
