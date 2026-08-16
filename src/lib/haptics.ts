// Lightweight haptic feedback. Vibration is only supported on some devices
// (mostly Android); it's a no-op everywhere else, which is fine — it's a
// progressive enhancement, never required.

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch {
    /* ignore */
  }
}

/** A light tick for a normal tap / toggle. */
export function tapHaptic() {
  vibrate(12)
}

/** A satisfying double-pulse for a win (task complete, horns earned). */
export function successHaptic() {
  vibrate([18, 40, 60])
}

/** A short buzz for something going wrong. */
export function errorHaptic() {
  vibrate([40, 30, 40])
}
