import { useEffect, useRef } from 'react'
import { MOTION_OFF } from '../lib/motionEnv'

// Torchlight reveal — a near-opaque ink wash sits over the 3D constellation,
// and the cursor cuts a soft hole in it. The field only shows itself where
// you're looking; everywhere else stays quiet ink so the words in front of it
// are easy to read. (No scroll-tied reveal band — the torch is cursor-only.)

const DPR_CAP = 2
const TORCH_RADIUS = 250
const WASH = 'rgba(11, 12, 16, 0.92)'
// after ~1.4s idle the torch settles to a soft ember instead of vanishing
const IDLE_FLOOR = 0.35

export default function TorchVeil() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (MOTION_OFF) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let w = window.innerWidth
    let h = window.innerHeight
    let dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    resize()

    // start lit over the hero so the page never opens fully dark
    let mx = w * 0.5
    let my = h * 0.42
    let tx = mx
    let ty = my
    let glow = 1
    let lastMove = performance.now()
    let gone = false

    const onMove = (e: PointerEvent) => {
      mx = e.clientX
      my = e.clientY
      lastMove = performance.now()
      gone = false
    }
    const onLeave = () => {
      gone = true
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', resize)

    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      // self-heal if a resize event was missed (restore from minimize, webviews)
      if (window.innerWidth !== w || window.innerHeight !== h) resize()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = WASH
      ctx.fillRect(0, 0, w, h)

      const idleMs = performance.now() - lastMove
      const target = gone
        ? IDLE_FLOOR
        : Math.max(IDLE_FLOOR, 1 - Math.max(0, idleMs - 1400) / 1800)
      glow += (target - glow) * 0.06
      tx += (mx - tx) * 0.12
      ty += (my - ty) * 0.12

      ctx.globalCompositeOperation = 'destination-out'
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, TORCH_RADIUS)
      g.addColorStop(0, `rgba(255,255,255,${0.95 * glow})`)
      g.addColorStop(0.55, `rgba(255,255,255,${0.55 * glow})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(tx - TORCH_RADIUS, ty - TORCH_RADIUS, TORCH_RADIUS * 2, TORCH_RADIUS * 2)
      ctx.globalCompositeOperation = 'source-over'
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // reduced motion: no veil at all — the static field stays softly visible
  if (MOTION_OFF) return null
  return <canvas ref={canvasRef} className="torch-veil" aria-hidden />
}
