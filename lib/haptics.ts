/** Vibration cues for phones. The Vibration API is missing on iOS and desktop, where these do nothing. */

function buzz(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw when vibration isn't allowed yet (no user gesture).
  }
}

/** One short tap for the heads-up. */
export const buzzCue = () => buzz([80]);

/** Two longer pulses when time's up. */
export const buzzDone = () => buzz([220, 120, 220]);
