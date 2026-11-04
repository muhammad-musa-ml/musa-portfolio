import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import NeuralField from './NeuralField'
import { MOTION_OFF } from '../lib/motionEnv'

const TORCH_RADIUS = 250
const AMBIENT_OPACITY = 0.08
const IDLE_FLOOR = 0.35

export default function SceneCanvas() {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = sceneRef.current
    if (MOTION_OFF || !scene) return

    let x = window.innerWidth * 0.5
    let y = window.innerHeight * 0.42
    let torchX = x
    let torchY = y
    let glow = 1
    let lastMove = performance.now()
    let pointerOutside = false

    const onMove = (event: PointerEvent) => {
      x = event.clientX
      y = event.clientY
      lastMove = performance.now()
      pointerOutside = false
    }
    const onLeave = () => { pointerOutside = true }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    let frame = 0
    const draw = (now: number) => {
      const idleFade = Math.max(0, now - lastMove - 1400) / 1800
      const target = pointerOutside ? IDLE_FLOOR : Math.max(IDLE_FLOOR, 1 - idleFade)
      glow += (target - glow) * 0.06
      torchX += (x - torchX) * 0.12
      torchY += (y - torchY) * 0.12

      // Fade only the constellation. A second tinted layer can band over flat ink.
      const reveal = (1 - AMBIENT_OPACITY) * glow
      const center = AMBIENT_OPACITY + 0.95 * reveal
      const shoulder = AMBIENT_OPACITY + 0.55 * reveal
      scene.style.setProperty('--torch-mask',
        `radial-gradient(circle ${TORCH_RADIUS}px at ${torchX}px ${torchY}px, rgba(0,0,0,${center}), rgba(0,0,0,${shoulder}) 55%, rgba(0,0,0,${AMBIENT_OPACITY}))`,
      )
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div
      ref={sceneRef}
      className="scene-root"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        background: '#0b0c10',
      }}
      aria-hidden
    >
      <Canvas
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          maskImage: MOTION_OFF ? undefined : 'var(--torch-mask, linear-gradient(#00000014, #00000014))',
        }}
        camera={{ position: [0, 0, 9], fov: 55, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        flat
        frameloop={MOTION_OFF ? 'demand' : 'always'}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
        // R3F sizes via ResizeObserver, which can silently no-op in some
        // embedded/webview contexts (leaving a 300x150 buffer). Drive the GL
        // buffer directly from the window so the field always renders crisp.
        onCreated={(state) => {
          const fit = () => {
            const w = window.innerWidth
            const h = window.innerHeight
            state.gl.setSize(w, h, false)
            const cam = state.camera as THREE.PerspectiveCamera
            cam.aspect = w / h
            cam.updateProjectionMatrix()
            state.setSize(w, h)
            state.invalidate()
          }
          fit()
          requestAnimationFrame(fit)
          window.addEventListener('resize', fit)
          window.addEventListener('orientationchange', fit)
        }}
      >
        <Suspense fallback={null}>
          <NeuralField />
        </Suspense>
      </Canvas>
    </div>
  )
}
