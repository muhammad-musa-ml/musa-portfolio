// ResizeObserver delivery guarantee.
//
// react-three-fiber (and react-use-measure) will not initialise the WebGL
// renderer until ResizeObserver reports a non-zero element size. A handful of
// embedded / webview / headless browsers ship a ResizeObserver constructor that
// exists but never actually delivers callbacks — leaving the 3D canvas black at
// its default 300×150. This wrapper preserves native behaviour and *adds* a
// guaranteed initial measurement plus a window-resize re-measure, so the canvas
// always comes to life. It's a no-op cost in healthy browsers.

type Rec = { cb: ResizeObserverCallback; els: Set<Element> }

export function installResizeObserverFallback(): void {
  if (typeof window === 'undefined' || !('ResizeObserver' in window)) return

  const Native = window.ResizeObserver
  const instances = new Set<Rec>()

  function emit(cb: ResizeObserverCallback, el: Element) {
    if (!el.isConnected) return
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return
    const box = [{ inlineSize: r.width, blockSize: r.height }]
    const entry = {
      target: el,
      contentRect: r,
      borderBoxSize: box,
      contentBoxSize: box,
      devicePixelContentBoxSize: box,
    } as unknown as ResizeObserverEntry
    try {
      cb([entry], null as unknown as ResizeObserver)
    } catch {
      /* ignore */
    }
  }

  class WrappedRO {
    private native: ResizeObserver
    private rec: Rec

    constructor(cb: ResizeObserverCallback) {
      this.native = new Native(cb)
      this.rec = { cb, els: new Set<Element>() }
      instances.add(this.rec)
    }
    observe(el: Element, opts?: ResizeObserverOptions) {
      this.rec.els.add(el)
      this.native.observe(el, opts)
      // guarantee delivery even if the native RO stays silent
      requestAnimationFrame(() => emit(this.rec.cb, el))
      setTimeout(() => emit(this.rec.cb, el), 140)
    }
    unobserve(el: Element) {
      this.rec.els.delete(el)
      this.native.unobserve(el)
    }
    disconnect() {
      this.rec.els.clear()
      this.native.disconnect()
      instances.delete(this.rec)
    }
  }

  let raf = 0
  window.addEventListener(
    'resize',
    () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        instances.forEach(({ cb, els }) => els.forEach((el) => emit(cb, el)))
      })
    },
    { passive: true }
  )

  ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = WrappedRO
}
