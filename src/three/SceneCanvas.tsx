import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import * as THREE from 'three'
import NeuralField from './NeuralField'
import { MOTION_OFF } from '../lib/motionEnv'

export default function SceneCanvas() {
  return (
    <div
      className="scene-root"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        // flat ink, exactly like the torchlight concept — the veil above
        // keeps it near-black anyway; no gradient, no vignette
        background: '#0b0c10',
      }}
      aria-hidden
    >
      <Canvas
        style={{ display: 'block', width: '100%', height: '100%' }}
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
