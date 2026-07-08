// Shared smooth-scroll helper. Uses the registered Lenis instance when smooth
// scrolling is active; otherwise falls back to native scrollIntoView.
import type Lenis from 'lenis'

let lenis: Lenis | null = null

export function registerLenis(instance: Lenis | null) {
  lenis = instance
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) {
    // force: still works when lenis is paused behind an overlay
    lenis.scrollTo(el, { offset: -48, duration: 1.1, force: true })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { duration: 1.0, force: true })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** Nudge the page by a wheel delta, keeping Lenis smoothing. Inner scrollers
    (the certificate piles) call this to hand the wheel back to the page once
    their own travel is exhausted, so they never become dead zones. */
export function scrollPageBy(delta: number) {
  if (lenis) lenis.scrollTo(lenis.targetScroll + delta)
  else window.scrollBy(0, delta)
}

/** Pause/resume smooth scrolling while an overlay owns the wheel —
    otherwise Lenis keeps scrolling the page under the palette/chat. */
export function stopLenis() {
  lenis?.stop()
}
export function startLenis() {
  lenis?.start()
}
