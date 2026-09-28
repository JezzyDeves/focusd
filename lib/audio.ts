/** Tiny Web Audio synth for chiptune alerts — no audio files needed. */

type Note = [freq: number, at: number, dur: number];

let ctx: AudioContext | null = null;

/** Browsers only allow audio after a user gesture, so call this from a click handler. */
export function ensureAudio() {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Seconds between the start of each repeat when the alert loops. */
const ALARM_LOOP_S = 2;

const DONE: Note[] = [
  [880, 0, 0.12],
  [1175, 0.14, 0.12],
  [1568, 0.28, 0.28],
  [1175, 0.62, 0.1],
  [1568, 0.74, 0.34],
];

function schedule(target: BaseAudioContext, notes: Note[], t0: number) {
  for (const [freq, at, dur] of notes) {
    const osc = target.createOscillator();
    const gain = target.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(0.06, t0 + at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    osc.connect(gain).connect(target.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + dur + 0.02);
  }
}

function play(notes: Note[]) {
  if (ctx) schedule(ctx, notes, ctx.currentTime + 0.02);
}

export const playDone = () => play(DONE);

export const playStart = () =>
  play([
    [660, 0, 0.06],
    [990, 0.07, 0.08],
  ]);

let alarm: AudioBufferSourceNode | null = null;
let alarmToken = 0;

/**
 * Loop the done alert until stopAlarm() is called.
 *
 * The jingle is rendered once into a buffer and looped by the audio thread, so it keeps
 * repeating on time even when the browser throttles timers in a background tab.
 */
export async function startAlarm() {
  if (!ctx || alarm) return;
  const token = ++alarmToken;
  try {
    const { sampleRate } = ctx;
    const offline = new OfflineAudioContext(1, Math.ceil(ALARM_LOOP_S * sampleRate), sampleRate);
    schedule(offline, DONE, 0.02);
    const buffer = await offline.startRendering();
    if (token !== alarmToken || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(ctx.destination);
    src.start();
    alarm = src;
  } catch {
    // Fall back to a single alert where offline rendering isn't supported.
    if (token === alarmToken) playDone();
  }
}

export function stopAlarm() {
  alarmToken++;
  if (!alarm) return;
  try {
    alarm.stop();
  } catch {
    // Already stopped.
  }
  alarm.disconnect();
  alarm = null;
}
