import { useEffect, useState } from 'react'
import { useRef } from 'react'
import { MOTION_OFF } from '../lib/motionEnv'
import { getCursorMode, onCursorMode, type CursorMode } from '../lib/cursorMode'

const INTERACTIVE = 'a, button, [data-cursor="hover"], input, textarea, [role="tab"]'

function touchOnly(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return (
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    )
  } catch {
    return false
  }
}

export default function Cursor() {
  const [mode, setMode] = useState<CursorMode>(getCursorMode)
  const disabled = MOTION_OFF || touchOnly()

  useEffect(() => onCursorMode(setMode), [])

  // lets CSS hand the native cursor back when we're not drawing one
  useEffect(() => {
    document.body.dataset.cursor = disabled ? 'system' : mode
  }, [mode, disabled])

  if (disabled || mode === 'system') return null
  return mode === 'dot' ? <DotCursor /> : <ReticleCursor />
}

/* — just a dot: quiet amber point that swells over anything clickable — */
function DotCursor() {
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    if (!dot) return
    let x = -100
    let y = -100
    let dx = -100
    let dy = -100
    let raf = 0

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      const t = e.target as HTMLElement
      dot.classList.toggle('is-hover', !!t.closest?.(INTERACTIVE))
    }
    const loop = () => {
      dx += (x - dx) * 0.4
      dy += (y - dy) * 0.4
      dot.style.transform = `translate(${dx - 3.5}px, ${dy - 3.5}px)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <div ref={dotRef} className="cur-dot" />
}

/* — lock-on reticle: a fine crosshair whose corner brackets fly out and
     snap around whatever interactive element you hover — */
function ReticleCursor() {
  const hRef = useRef<HTMLDivElement>(null)
  const vRef = useRef<HTMLDivElement>(null)
  const b = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ]

  useEffect(() => {
    const h = hRef.current
    const v = vRef.current
    const brackets = b.map((r) => r.current)
    if (!h || !v || brackets.some((el) => !el)) return

    let mx = -100
    let my = -100
    let hovering: HTMLElement | null = null
    let pressed = false
    const box = { x: -100, y: -100, w: 22, h: 22 }
    let raf = 0

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      const t = e.target as HTMLElement
      hovering = (t.closest?.(INTERACTIVE) as HTMLElement) || null
    }
    const onDown = () => {
      pressed = true
    }
    const onUp = () => {
      pressed = false
    }

    const loop = () => {
      // crosshair rides the raw pointer
      h.style.transform = `translate(${mx - 7}px, ${my - 0.5}px)`
      v.style.transform = `translate(${mx - 0.5}px, ${my - 7}px)`

      // brackets fly to the hovered element or hug the pointer
      let tx: number
      let ty: number
      let tw: number
      let th: number
      if (hovering && hovering.isConnected) {
        const r = hovering.getBoundingClientRect()
        const pad = pressed ? 2 : 6
        tx = r.left - pad
        ty = r.top - pad
        tw = r.width + pad * 2
        th = r.height + pad * 2
      } else {
        const s = pressed ? 16 : 22
        tx = mx - s / 2
        ty = my - s / 2
        tw = s
        th = s
      }
      box.x += (tx - box.x) * 0.22
      box.y += (ty - box.y) * 0.22
      box.w += (tw - box.w) * 0.22
      box.h += (th - box.h) * 0.22

      brackets[0]!.style.transform = `translate(${box.x}px, ${box.y}px)`
      brackets[1]!.style.transform = `translate(${box.x + box.w - 10}px, ${box.y}px)`
      brackets[2]!.style.transform = `translate(${box.x}px, ${box.y + box.h - 10}px)`
      brackets[3]!.style.transform = `translate(${box.x + box.w - 10}px, ${box.y + box.h - 10}px)`
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div ref={hRef} className="cur-line cur-line--h" />
      <div ref={vRef} className="cur-line cur-line--v" />
      <div ref={b[0]} className="cur-bracket cur-bracket--tl" />
      <div ref={b[1]} className="cur-bracket cur-bracket--tr" />
      <div ref={b[2]} className="cur-bracket cur-bracket--bl" />
      <div ref={b[3]} className="cur-bracket cur-bracket--br" />
    </>
  )
}
