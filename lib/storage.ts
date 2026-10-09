import { DEFAULTS, today, type Intent, type Parked, type Settings, type Stats } from "./pomodoro";

const SETTINGS_KEY = "focusd.settings";
const STATS_KEY = "focusd.stats";
const INTENT_KEY = "focusd.intent";
const PARKED_KEY = "focusd.parked";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The app still works without it.
  }
}

export const loadSettings = (): Settings => ({ ...DEFAULTS, ...(read<Partial<Settings>>(SETTINGS_KEY) ?? {}) });
export const saveSettings = (s: Settings) => write(SETTINGS_KEY, s);

export const freshStats = (): Stats => ({ date: today(), sessions: 0, focusMs: 0 });
export const loadStats = (): Stats => {
  const s = read<Stats>(STATS_KEY);
  return s && s.date === today() ? s : freshStats();
};
export const saveStats = (s: Stats) => write(STATS_KEY, s);

export const loadIntent = (): Intent => ({ task: read<Partial<Intent>>(INTENT_KEY)?.task ?? "" });
export const saveIntent = (i: Intent) => write(INTENT_KEY, i);

export const loadParked = (): Parked[] => {
  const p = read<Parked[]>(PARKED_KEY);
  return Array.isArray(p) ? p : [];
};
export const saveParked = (p: Parked[]) => write(PARKED_KEY, p);

const HANDLE_KEY = "focusd.handle";
const HOSTS_KEY = "focusd.hosts";

export const loadHandle = () => read<string>(HANDLE_KEY) ?? "";
export const saveHandle = (h: string) => write(HANDLE_KEY, h);

/** Host tokens for rooms created in this browser, by room id. */
const loadHosts = () => read<Record<string, string>>(HOSTS_KEY) ?? {};
export const loadHostToken = (id: string): string | null => loadHosts()[id] ?? null;
export const saveHostToken = (id: string, token: string) => write(HOSTS_KEY, { ...loadHosts(), [id]: token });
