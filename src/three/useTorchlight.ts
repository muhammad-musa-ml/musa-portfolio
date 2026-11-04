import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2, type Material } from 'three'
import { MOTION_OFF } from '../lib/motionEnv'

// Reveal only drawn points and lines. Empty pixels never receive a gradient.
export function useTorchlight() {
  const pointer = useRef({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.42, lastMove: performance.now(), outside: false })
  const eased = useRef({ x: pointer.current.x, y: pointer.current.y, glow: 1 })
  const uniforms = useMemo(() => ({
    uTorchOrigin: { value: new Vector2() },
    uTorchRadius: { value: 250 },
    uTorchGlow: { value: 1 },
  }), [])

  useEffect(() => {
    if (MOTION_OFF) return
    const move = (event: PointerEvent) => {
      Object.assign(pointer.current, { x: event.clientX, y: event.clientY, lastMove: performance.now(), outside: false })
    }
    const leave = () => { pointer.current.outside = true }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', move, { passive: true })
    document.addEventListener('mouseleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', move)
      document.removeEventListener('mouseleave', leave)
    }
  }, [])

  useFrame(({ gl }, delta) => {
    const p = pointer.current
    const e = eased.current
    const fade = Math.max(0, performance.now() - p.lastMove - 1400) / 1800
    const target = p.outside ? 0.6 : Math.max(0.6, 1 - fade)
    const frames = Math.min(delta, 0.05) * 60
    e.x += (p.x - e.x) * (1 - Math.pow(0.88, frames))
    e.y += (p.y - e.y) * (1 - Math.pow(0.88, frames))
    e.glow += (target - e.glow) * (1 - Math.pow(0.94, frames))
    const dpr = gl.getPixelRatio()
    uniforms.uTorchOrigin.value.set(e.x * dpr, gl.domElement.height - e.y * dpr)
    uniforms.uTorchRadius.value = 250 * dpr
    uniforms.uTorchGlow.value = e.glow
  })

  return useMemo<Material['onBeforeCompile']>(() => shader => {
    if (MOTION_OFF) return
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = `
      uniform vec2 uTorchOrigin;
      uniform float uTorchRadius;
      uniform float uTorchGlow;
      ${shader.fragmentShader}
    `.replace('#include <opaque_fragment>', `
      float torchDistance = distance(gl_FragCoord.xy, uTorchOrigin) / uTorchRadius;
      float torchFalloff = torchDistance < 0.55
        ? mix(0.95, 0.55, torchDistance / 0.55)
        : mix(0.55, 0.0, clamp((torchDistance - 0.55) / 0.45, 0.0, 1.0));
      diffuseColor.a *= 0.22 + 0.78 * uTorchGlow * torchFalloff;
      #include <opaque_fragment>
    `)
  }, [uniforms])
}
