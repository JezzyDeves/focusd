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

function play(notes: Note[]) {
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  for (const [freq, at, dur] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(0.06, t0 + at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + dur + 0.02);
  }
}

export const playDone = () =>
  play([
    [880, 0, 0.12],
    [1175, 0.14, 0.12],
    [1568, 0.28, 0.28],
    [1175, 0.62, 0.1],
    [1568, 0.74, 0.34],
  ]);

export const playStart = () =>
  play([
    [660, 0, 0.06],
    [990, 0.07, 0.08],
  ]);
