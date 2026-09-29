# focusd

A hacker-terminal Pomodoro timer. Dark, animated and mobile-first, built with Next.js and React.

## Features

- **Configurable cycle**: set the focus length, the short and long break lengths, and how many sessions run before a long break. Settings are saved in `localStorage`.
- **Mode-aware theme**: the accent turns green for focus, cyan for short breaks and amber for long breaks.
- **CRT atmosphere**: a matrix-rain canvas, scanlines, a 60-tick dial that lights up as time passes, glitching digits on each start and a typewriter-style event log.
- **Chiptune alert**: synthesized with the Web Audio API, so there are no audio files. Turn on `repeat_alert` to keep it looping until you stop it with the main button or `esc`. `volume` sets how loud it is, `soft_tone` swaps it for a gentle sine chime, and `vibrate` adds a buzz on phones that support it.
- **Heads-up before the end**: `heads_up` plays a soft cue at 5 and 1 minutes left (skipping any that don't fit the timer), and the dial switches to `WRAP_UP` and shows what's next, so a session winds down instead of stopping abruptly.
- **Session intention**: before a focus session, name the task and an if-then plan for distractions. Both are logged when the session starts. Turn this off with `intention`.
- **Parking lot**: press `n` mid-session to jot down a stray thought and get back to work. The list stays hidden while you focus and comes back on your break.
- **Focus room**: turn on `focus_room` to see how many other people are in a focus session right now (`▲ 3 others focusing`, under the dial). It's off by default, and nothing connects to a server until you turn it on. See [Focus room privacy](#focus-room-privacy).
- **Sensory controls**: turn off `motion` (matrix rain, glitch, blinking), `scanlines` or the end-of-timer `flash`. The OS reduced-motion setting is respected as well.
- **Daily stats**: sessions completed and focus time for today.
- **Auto-start**: optionally roll straight into the next timer.
- **Stays awake**: requests a screen wake lock while a timer runs, where supported.
- **Keyboard shortcuts**: `space` start/pause (or stop a ringing alert), `esc` stop the alert, `r` reset, `s` skip, `1` `2` `3` switch mode, `n` park a thought.

## Why these features

Several features are aimed at ADHD, autistic and other neurodivergent users, and each is based on research:

- **Heads-up cues**: meta-analyses find time-perception differences in ADHD across every timing task studied, and warnings before a transition are a standard autism support.
- **Intention prompt**: if-then plans ("implementation intentions") helped children with ADHD inhibit unwanted responses (Gawrilow & Gollwitzer, 2008).
- **Parking lot**: writing a distracting thought down takes it off working memory without breaking the session.
- **Sensory controls**: sensory-processing differences are very common in autism and show up in ADHD too. Many people never set the OS reduced-motion preference, so the app has its own switches.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

The timer works with no setup. The optional `focus_room` needs a [Supabase](https://supabase.com) project, used only for Realtime Presence (no tables, no auth). Copy `.env.example` to `.env.local` and fill in the project URL and publishable key (or the legacy anon key) from the Supabase dashboard. The app joins a public channel, so leave Realtime's public channel access allowed. Without these variables, turning on `focus_room` just shows `offline`.

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
- `@supabase/realtime-js` for `focus_room` presence, loaded only when the toggle is on

## Project structure

```
app/
  layout.tsx          Root layout, fonts, metadata
  page.tsx            Renders the timer
  globals.css         Tailwind @theme tokens, keyframes and the CRT/glitch effects
components/pomodoro/
  Pomodoro.tsx        Main UI
  Dial.tsx            SVG clock face and progress arc
  IntentPanel.tsx     Task and if-then plan for the focus session
  ParkingLot.tsx      Stray-thought list
  styles.ts           Class lists shared by the panels
  ConfigRow.tsx       Shared `key: value` row for the config panel
  Stepper.tsx         Number input with − / + buttons
  Toggle.tsx          [x] / [ ] boolean switch
  MatrixRain.tsx      Background canvas animation
hooks/
  usePomodoro.ts      Timer engine, cycle logic, heads-up cues, settings, stats, log, intent, parking lot, shortcuts
  usePresence.ts      focus_room: joins the presence channel and counts peers in focus
lib/
  cn.ts               Class-name join helper
  pomodoro.ts         Types, defaults, limits and formatters
  storage.ts          localStorage helpers
  audio.ts            Web Audio chiptune synth
  haptics.ts          Vibration cues
  presence.ts         Supabase Realtime connection and peer counting for focus_room
```

## Theming

The accent color comes from `--accent`, which switches with `[data-mode]` on `<html>`. `[data-motion="off"]` on `<html>` stills animation the same way `prefers-reduced-motion` does. It's exposed to Tailwind through `@theme inline`, so `text-accent`, `bg-accent`, `stroke-accent/40` and the glow shadows all follow the current mode. A custom `desk:` breakpoint (60rem) switches to the two-column desktop layout.

## How the timer works

The timer counts down against an absolute end timestamp instead of counting ticks, so it stays accurate even when the browser throttles a background tab. After each focus session the cycle counter goes up. When it reaches the long-break interval the next break is a long one, and the counter resets after that long break ends. Skipping a session advances the cycle but doesn't count toward today's stats.

## Focus room privacy

With `focus_room` off (the default), the app opens no connections for it and doesn't even download the client library.

With it on, the app opens one WebSocket to your Supabase project's Realtime server and joins the `focusd:global` presence channel. It sends:

- `{ mode, running }`: whether you're in focus, a short break or a long break, and whether the timer is running. This is sent when you join and again only when one of them changes (start, pause, mode switch), never on each tick.
- A random presence key, generated on each page load and never stored, which the presence protocol needs to tell clients apart.
- Your Supabase publishable key, which the connection requires.

No task text, parking-lot notes, stats, settings or account details are sent. Like any server, Supabase sees your IP address. If the connection drops, the count shows `offline` and the timer carries on as normal.
