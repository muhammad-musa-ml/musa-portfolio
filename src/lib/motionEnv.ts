// Central motion policy.
//
// Motion is turned OFF when either:
//   - the visitor asked for it (prefers-reduced-motion: reduce), or
//   - we're doing automated QA (?still=1) — freezing the render loop so the
//     page reaches an idle state a screenshot tool can actually capture.
//
// When motion is off we: freeze the WebGL frameloop to a single frame, skip
// Lenis smooth-scroll (native scroll instead), and hide the animated cursor.

function readStill(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).has('still')
  } catch {
    return false
  }
}

function readReduce(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export const STILL_MODE = readStill()
export const PREFERS_REDUCED_MOTION = readReduce()

/** True when all continuous/decorative motion should be suppressed. */
export const MOTION_OFF = STILL_MODE || PREFERS_REDUCED_MOTION
