/** Tiny Web Audio synth for chiptune alerts — no audio files needed. */

type Note = [freq: number, at: number, dur: number];
type Voice = { wave: OscillatorType; attack: number; notes: Note[] };

let ctx: AudioContext | null = null;
let peak = 0.06;
let soft = false;

/** Set the alert volume (1–10) and whether to use the gentle sine voice. */
export function setAudioPrefs(volume: number, softTone: boolean) {
  peak = volume / 100;
  soft = softTone;
}

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
/** The soft chime is longer, so give it more room between repeats. */
const ALARM_LOOP_SOFT_S = 3;

const DONE: Voice = {
  wave: "square",
  attack: 0.01,
  notes: [
    [880, 0, 0.12],
    [1175, 0.14, 0.12],
    [1568, 0.28, 0.28],
    [1175, 0.62, 0.1],
    [1568, 0.74, 0.34],
  ],
};

/** A slow, low sine chime: the same cue without the sharp edges. */
const DONE_SOFT: Voice = {
  wave: "sine",
  attack: 0.05,
  notes: [
    [523, 0, 0.5],
    [659, 0.4, 0.5],
    [784, 0.8, 0.9],
  ],
};

/** The heads-up before a timer ends. Always soft: it's a nudge, not an alarm. */
const CUE: Voice = {
  wave: "sine",
  attack: 0.05,
  notes: [
    [587, 0, 0.35],
    [784, 0.3, 0.5],
  ],
};

const START: Voice = {
  wave: "square",
  attack: 0.01,
  notes: [
    [660, 0, 0.06],
    [990, 0.07, 0.08],
  ],
};

const START_SOFT: Voice = { wave: "sine", attack: 0.03, notes: [[660, 0, 0.25]] };

/** The start blip played backwards: falling instead of rising, so it reads as "stopped". */
const PAUSE: Voice = {
  wave: "square",
  attack: 0.01,
  notes: [
    [990, 0, 0.06],
    [660, 0.07, 0.08],
  ],
};

const PAUSE_SOFT: Voice = { wave: "sine", attack: 0.03, notes: [[495, 0, 0.25]] };

/** Sine carries less energy than square at the same gain, so lift it to sound about as loud. */
const gainFor = (v: Voice, scale = 1) => peak * scale * (v.wave === "sine" ? 2.5 : 1);

function schedule(target: BaseAudioContext, voice: Voice, t0: number, scale = 1) {
  const level = gainFor(voice, scale);
  for (const [freq, at, dur] of voice.notes) {
    const osc = target.createOscillator();
    const gain = target.createGain();
    osc.type = voice.wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(level, t0 + at + voice.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    osc.connect(gain).connect(target.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + dur + 0.02);
  }
}

function play(voice: Voice, scale?: number) {
  if (ctx) schedule(ctx, voice, ctx.currentTime + 0.02, scale);
}

export const playDone = () => play(soft ? DONE_SOFT : DONE);

export const playStart = () => play(soft ? START_SOFT : START);

export const playPause = () => play(soft ? PAUSE_SOFT : PAUSE);

/** Quieter than the alert so it reads as a heads-up. */
export const playCue = () => play(CUE, 0.7);

let alarm: AudioBufferSourceNode | null = null;
let alarmToken = 0;

/** Seconds from the start of a voice to the end of its last note. */
const lengthOf = (v: Voice) => Math.max(...v.notes.map(([, at, dur]) => at + dur)) + 0.04;

/**
 * Loop the done alert `times` times, or until stopAlarm() is called when `times` is 0.
 * `onEnd` fires if the alert finishes on its own.
 *
 * The jingle is rendered once into a buffer and looped by the audio thread, so it keeps
 * repeating on time even when the browser throttles timers in a background tab.
 */
export async function startAlarm(times = 0, onEnd?: () => void) {
  if (!ctx || alarm) return;
  const token = ++alarmToken;
  try {
    const { sampleRate } = ctx;
    const voice = soft ? DONE_SOFT : DONE;
    const loop = soft ? ALARM_LOOP_SOFT_S : ALARM_LOOP_S;
    const offline = new OfflineAudioContext(1, Math.ceil(loop * sampleRate), sampleRate);
    schedule(offline, voice, 0.02);
    const buffer = await offline.startRendering();
    if (token !== alarmToken || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(ctx.destination);
    src.onended = () => {
      if (token === alarmToken) onEnd?.();
    };
    const t0 = ctx.currentTime;
    src.start(t0);
    // Cut the last loop off once its jingle has played, not after its trailing silence.
    if (times > 0) src.stop(t0 + (times - 1) * loop + 0.02 + lengthOf(voice));
    alarm = src;
  } catch {
    // Fall back to a single alert where offline rendering isn't supported.
    if (token === alarmToken) {
      playDone();
      if (times > 0) onEnd?.();
    }
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
