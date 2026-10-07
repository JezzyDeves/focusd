import { cn } from "@/lib/cn";

type DialProps = {
  /** 0 → 1, how much of the current timer has elapsed. */
  progress: number;
  running: boolean;
  className?: string;
  children: React.ReactNode;
};

const R = 118;
const C = 2 * Math.PI * R;
const TICKS = 60;

/** The clock face: 60 ticks that light up as time passes, a progress arc and a slow-spinning orbit. */
export function Dial({ progress, running, className, children }: DialProps) {
  const lit = Math.floor(progress * TICKS);

  return (
    <div
      className={cn(
        "@container relative mx-auto aspect-square w-[min(100%,360px)] max-w-full desk:w-[clamp(300px,44dvh,460px)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 300 300"
        aria-hidden="true"
        className="absolute inset-0 size-full overflow-visible"
      >
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
          const major = i % 5 === 0;
          const r1 = 140;
          const r2 = major ? 126 : 132;
          const head = running && i === lit;
          return (
            <line
              key={i}
              className={cn(
                "transition-[stroke] duration-300",
                head ? "stroke-bright" : i < lit ? "stroke-accent" : "stroke-line-2",
              )}
              x1={150 + Math.cos(a) * r1}
              y1={150 + Math.sin(a) * r1}
              x2={150 + Math.cos(a) * r2}
              y2={150 + Math.sin(a) * r2}
              strokeWidth={major ? 2.5 : 1.5}
              strokeLinecap="square"
            />
          );
        })}
        <circle className="stroke-line" cx="150" cy="150" r={R} fill="none" strokeWidth="2" />
        <circle
          className="stroke-accent drop-shadow-[0_0_6px_var(--accent)] transition-[stroke-dashoffset,stroke] duration-[250ms] ease-linear"
          cx="150"
          cy="150"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          transform="rotate(-90 150 150)"
        />
        <circle
          className={cn(
            "origin-center animate-orbit [transform-box:fill-box]",
            running
              ? "stroke-accent/40 [animation-play-state:running]"
              : "stroke-line-2 [animation-play-state:paused]",
          )}
          cx="150"
          cy="150"
          r="104"
          fill="none"
          strokeWidth="1"
          strokeDasharray="2 7"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2cqi] text-center">
        {children}
      </div>
    </div>
  );
}
