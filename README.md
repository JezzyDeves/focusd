# focusd

A hacker-terminal Pomodoro timer. Dark, animated and mobile-first, built with Next.js and React.

## Features

- **Configurable cycle**: set the focus length, the short and long break lengths, and how many sessions run before a long break. Settings are saved in `localStorage`.
- **Mode-aware theme**: the accent turns green for focus, cyan for short breaks and amber for long breaks.
- **CRT atmosphere**: a matrix-rain canvas, scanlines, a 60-tick dial that lights up as time passes, glitching digits on each start and a typewriter-style event log.
- **Chiptune alert**: synthesized with the Web Audio API, so there are no audio files. Turn on `repeat_alert` to keep it looping until you stop it with the main button or `esc`.
- **Daily stats**: sessions completed and focus time for today.
- **Auto-start**: optionally roll straight into the next timer.
- **Stays awake**: requests a screen wake lock while a timer runs, where supported.
- **Keyboard shortcuts**: `space` start/pause (or stop a ringing alert), `esc` stop the alert, `r` reset, `s` skip, `1` `2` `3` switch mode.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

| Script              | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server             |
| `npm run build`     | Production build                 |
| `npm start`         | Serve the production build       |
| `npm run typecheck` | Type-check with `tsc --noEmit`   |

## Stack

- Next.js 16 (App Router) with TypeScript
- React 19
- Tailwind CSS v4: theme tokens (colors, fonts, shadows, animations) live in `@theme` in `app/globals.css`, and components are styled with utilities
- Self-hosted fonts via Fontsource: VT323 for the digits, JetBrains Mono for everything else

## Project structure

```
app/
  layout.tsx          Root layout, fonts, metadata
  page.tsx            Renders the timer
  globals.css         Tailwind @theme tokens, keyframes and the CRT/glitch effects
components/pomodoro/
  Pomodoro.tsx        Main UI
  Dial.tsx            SVG clock face and progress arc
  ConfigRow.tsx       Shared `key: value` row for the config panel
  Stepper.tsx         Number input with − / + buttons
  Toggle.tsx          [x] / [ ] boolean switch
  MatrixRain.tsx      Background canvas animation
hooks/
  usePomodoro.ts      Timer engine, cycle logic, settings, stats, log, shortcuts
lib/
  cn.ts               Class-name join helper
  pomodoro.ts         Types, defaults, limits and formatters
  storage.ts          localStorage helpers
  audio.ts            Web Audio chiptune synth
```

## Theming

The accent color comes from `--accent`, which switches with `[data-mode]` on `<html>`. It's exposed to Tailwind through `@theme inline`, so `text-accent`, `bg-accent`, `stroke-accent/40` and the glow shadows all follow the current mode. A custom `desk:` breakpoint (60rem) switches to the two-column desktop layout.

## How the timer works

The timer counts down against an absolute end timestamp instead of counting ticks, so it stays accurate even when the browser throttles a background tab. After each focus session the cycle counter goes up. When it reaches the long-break interval the next break is a long one, and the counter resets after that long break ends. Skipping a session advances the cycle but doesn't count toward today's stats.
