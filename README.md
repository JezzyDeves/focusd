# focusd

A hacker-terminal Pomodoro timer. Dark, animated and mobile-first, built with Next.js and React.

## Features

- **Configurable cycle**: set the focus length, the short and long break lengths, and how many sessions run before a long break. Settings are saved in `localStorage`.
- **Mode-aware theme**: the accent turns green for focus, cyan for short breaks and amber for long breaks.
- **CRT atmosphere**: a matrix-rain canvas, scanlines, a 60-tick dial that lights up as time passes, glitching digits on each start and a typewriter-style event log.
- **Chiptune alert**: synthesized with the Web Audio API, so there are no audio files. Starting a timer plays a rising blip and pausing it a falling one. Turn on `repeat_alert` to loop it, and set `repeat_count` to how many times it plays, or `0` to keep it going until you stop it with the main button or `esc`. `volume` sets how loud it is, `soft_tone` swaps it for a gentle sine chime, and `vibrate` adds a buzz on phones that support it.
- **Desktop notifications**: turn on `notify` to get a desktop pop-up when a timer ends, so you hear about it even with focusd in a background tab. The browser asks for permission the first time; clicking the notification brings focusd back to the front.
- **Heads-up before the end**: `heads_up` plays a soft cue at 5 and 1 minutes left (skipping any that don't fit the timer), and the dial switches to `WRAP_UP` and shows what's next, so a session winds down instead of stopping abruptly.
- **Session intention**: before a focus session, name the task and an if-then plan for distractions. Both are logged when the session starts. Turn this off with `intention`.
- **Parking lot**: press `n` mid-session to jot down a stray thought and get back to work. The list stays hidden while you focus and comes back on your break.
- **Focus room**: turn on `focus_room` to see how many other people are in a focus session right now (`▲ 3 others focusing`, under the dial). It's off by default, and nothing connects to a server until you turn it on. See [Privacy](#privacy).
- **Rooms**: create a private room and share its link to focus alongside friends (virtual body doubling). The `~/room` panel lists who's there with an optional handle, their mode and their time left. Turn on `share_task` to show your task to the room.
- **Start together**: whoever created a room is its host and can start a timer for everyone at once, with optional check-in ("what are you working on?") and check-out ("how did it go?") prompts. Joining late drops you into the session already running. The host can also close the room for good.
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

The timer works with no setup. `focus_room` and rooms need a [Supabase](https://supabase.com) project:

1. Copy `.env.example` to `.env.local` and fill it in from the Supabase dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key) for Realtime. The app joins public channels, so leave Realtime's public channel access allowed.
   - `DIRECT_URL` (session pooler, port 5432, or the direct connection) for migrations, as `postgres`.
   - `DATABASE_URL` (transaction pooler, port 6543) for the app, as the `focusd_app` role. See [Database role](#database-role).
   - `RATE_LIMIT_SECRET`: any long random string (`openssl rand -hex 32`).
2. Run `npm run db:deploy` to create the tables and the `focusd_app` role.
3. Give `focusd_app` a password so the app can log in as it (see below).

With only the Realtime variables, `focus_room` works and creating a room fails with a message in the log. With none of them, the room panel is hidden and `focus_room` shows `offline`.

| Script              | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server             |
| `npm run build`     | Production build                 |
| `npm start`         | Serve the production build       |
| `npm run typecheck` | Type-check with `tsc --noEmit`   |
| `npm run db:deploy` | Apply Prisma migrations          |
| `node scripts/smoke-api.mjs [url]` | Smoke-test a running server's API and security headers |

## Stack

- Next.js 16 (App Router) with TypeScript
- React 19
- Tailwind CSS v4: theme tokens (colors, fonts, shadows, animations) live in `@theme` in `app/globals.css`, and components are styled with utilities
- Self-hosted fonts via Fontsource: VT323 for the digits, JetBrains Mono for everything else
- `@supabase/realtime-js` for presence and broadcast, loaded only when `focus_room` is on or you join a room
- Prisma 7 with `@prisma/adapter-pg` on Supabase Postgres, for rooms. The client is generated into `lib/generated/` on `npm install`.

## Project structure

```
app/
  layout.tsx          Root layout, fonts, metadata
  page.tsx            Renders the timer
  api/rooms/          Create, look up and (host only) close a room, and start a session for everyone
  globals.css         Tailwind @theme tokens, keyframes and the CRT/glitch effects
components/pomodoro/
  Pomodoro.tsx        Main UI
  Dial.tsx            SVG clock face and progress arc
  IntentPanel.tsx     Task and if-then plan for the focus session
  ParkingLot.tsx      Stray-thought list
  RoomPanel.tsx       Room invite, peer list, check-in/out and host controls
  styles.ts           Class lists shared by the panels
  ConfigRow.tsx       Shared `key: value` row for the config panel
  Stepper.tsx         Number input with − / + buttons
  Toggle.tsx          [x] / [ ] boolean switch
  MatrixRain.tsx      Background canvas animation
hooks/
  usePomodoro.ts      Timer engine, cycle logic, heads-up cues, settings, stats, log, intent, parking lot, shortcuts
  usePresence.ts      Joins a presence channel and lists the peers in it
  useRoom.ts          Room link, joining, host sessions and check-ins
lib/
  cn.ts               Class-name join helper
  pomodoro.ts         Types, defaults, limits and formatters
  storage.ts          localStorage helpers
  audio.ts            Web Audio chiptune synth
  haptics.ts          Vibration cues
  notify.ts           Desktop notifications
  presence.ts         Supabase Realtime connections and presence parsing
  rooms.ts            Room types and payload validation, shared by client and server
  roomServer.ts       Server-side room helpers: ids, host tokens, body limits, responses
  rateLimit.ts        Per-client rate limits for the rooms API, stored in Postgres
  db.ts               Prisma client
prisma/
  schema.prisma       The rooms and rate_limits tables
  migrations/         SQL migrations: tables, row-level security, the focusd_app role
scripts/
  smoke-api.mjs       API and security-header smoke test, also run in CI
proxy.ts              Per-request Content-Security-Policy nonce
next.config.ts        Other security headers
```

## Database role

Migrations run as `postgres`, but the app itself connects as `focusd_app`. That role can read and write `rooms` and `rate_limits` and nothing else, and row-level security only lets `focusd_app` through. The migration creates it without a login. After `npm run db:deploy`, give it one in the Supabase SQL editor:

```sql
ALTER ROLE focusd_app WITH LOGIN PASSWORD 'a long random password';
```

Then use it in `DATABASE_URL` (on the Supabase pooler the user is `focusd_app.<project-ref>`).

## Theming

The accent color comes from `--accent`, which switches with `[data-mode]` on `<html>`. `[data-motion="off"]` on `<html>` stills animation the same way `prefers-reduced-motion` does. It's exposed to Tailwind through `@theme inline`, so `text-accent`, `bg-accent`, `stroke-accent/40` and the glow shadows all follow the current mode. A custom `desk:` breakpoint (60rem) switches to the full-screen desktop layout: the timer across the top, with the parking lot, config and log as columns filling the rest of the screen.

## How the timer works

The timer counts down against an absolute end timestamp instead of counting ticks, so it stays accurate even when the browser throttles a background tab. After each focus session the cycle counter goes up. When it reaches the long-break interval the next break is a long one, and the counter resets after that long break ends. Skipping a session advances the cycle but doesn't count toward today's stats.

## Privacy

With `focus_room` off (the default) and no room joined, the app opens no connections and doesn't even download the Realtime client.

### focus_room

With it on, the app opens one WebSocket to your Supabase project's Realtime server and joins the `focusd:global` presence channel. It sends:

- `{ mode, running }`: whether you're in focus, a short break or a long break, and whether the timer is running. This is sent when you join and again only when one of them changes (start, pause, mode switch), never on each tick.
- A random presence key, generated on each page load and never stored, which the presence protocol needs to tell clients apart.
- Your Supabase publishable key, which the connection requires.

No task text, parking-lot notes, stats, settings or account details are sent. Like any server, Supabase sees your IP address. If the connection drops, the count shows `offline` and the timer carries on as normal.

### Rooms

A room is joined only when you click create or join. Opening an invite link alone doesn't connect. In a room, the app opens a WebSocket for that room and shares this with the others in it:

- Your handle, if you set one (up to 24 characters, saved in your browser for next time).
- Your mode, whether your timer is running, and when it ends (or the time left while paused), so everyone's clock can count down without drift. Like the global channel, this is only sent when something changes.
- Your intent task, only if `share_task` is on.
- Check-in and check-out answers, only when you choose to share one.

None of that is stored on the server. The database holds one row per room: its random id, a SHA-256 hash of the host's token, timestamps, and the current "start together" session (mode, start, end, and whether check-ins are on). Rooms nobody opens for 30 days are deleted, and so is the whole room when the host closes it.

For rate limiting, the server also keeps request counters keyed by an HMAC of your IP address (never the address itself), deleted after a day.

## Security

- **Rooms API.**
  - Every endpoint is rate limited per client: 10 new rooms an hour, 120 lookups a minute, and 20 host actions a minute. Over the limit you get a `429` with `Retry-After`.
  - There's a cap of 10,000 rooms in total.
  - Request bodies over 2 KB are refused.
  - Database errors come back as a plain `503`, with credentials redacted from the server log.
- **Host actions.**
  - Starting a session and closing a room need the host token. It lives only in the creating browser, is compared by hash in constant time, and never appears in a URL.
  - Broadcasts between members only prompt a re-fetch from the server, so a spoofed "sync" or "closed" does nothing.
- **Database.**
  - The app connects as `focusd_app`, not `postgres`.
  - Row-level security is on for both tables, and Supabase's API roles (`anon`, `authenticated`) have had their grants revoked. So the publishable key can't reach either table.
- **Shared text.**
  - Handles, tasks and check-ins are stripped of control and invisible formatting characters, such as bidi overrides and zero-width spaces, so names can't be disguised.
  - They're capped in length and rendered as plain text.
  - The room panel lists at most 50 peers.
- **Browser.**
  - A strict Content-Security-Policy with a fresh nonce on every request (`proxy.ts`) means only the app's own scripts run, and the browser only connects to this site and the Supabase project.
  - Also set: `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` (room links stay private), `X-Content-Type-Options: nosniff` and a restrictive `Permissions-Policy`.
- **Dependencies and CI.**
  - Every PR runs the dependency audit, typecheck and build.
  - It also runs the migrations against Postgres and an API smoke test as `focusd_app`.
  - Dependabot keeps dependencies and actions current.
  - `package.json` overrides patch two advisories in Prisma CLI dependencies (`deepmerge-ts`, `mysql2`).

**Known limit: public Realtime channels.** Realtime uses public channels, and the publishable key ships in the page. So anyone can:
- Join the global channel and skew the "others focusing" count.
- Use the project's Realtime connection quota.
- Keep listening in a room if they still have its link after leaving.

Closing the room ends it for everyone else. Moving to private channels with Supabase anonymous sign-ins and Realtime Authorization would close this gap, at the cost of an auth dependency.

To report a vulnerability, see [SECURITY.md](SECURITY.md).
