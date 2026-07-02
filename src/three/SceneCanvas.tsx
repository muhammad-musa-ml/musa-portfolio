import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import NeuralField from './NeuralField'

export default function SceneCanvas() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background:
          'radial-gradient(ellipse 120% 90% at 50% -10%, #14161f 0%, #0b0c10 55%, #07080b 100%)',
      }}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 1.2, 16], fov: 55, near: 0.1, far: 120 }}
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
      >
        <Suspense fallback={null}>
          <NeuralField />
        </Suspense>
        <fog attach="fog" args={['#0b0c10', 18, 55]} />
      </Canvas>
      {/* vignette to keep edges quiet and text legible */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 90% 70% at 50% 45%, transparent 45%, rgba(7,8,11,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
