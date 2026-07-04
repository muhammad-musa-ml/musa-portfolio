import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollProgress } from '../lib/scrollBus'
import { MOTION_OFF } from '../lib/motionEnv'

// Faithful port of the "Torchlight Reveal" concept constellation:
// 1,400 crisp additive points in a flattened shell, sparse teal links,
// slow rotation, camera drifting down with scroll. No pulses, no pointer
// physics — the torch veil above does the revealing; the field just exists.

const COUNT = 1400
const MAX_SEGMENTS = 380
const LINK_DIST = 2.6
const PALETTE = [0xffb454, 0x63e2c6, 0xff7a6b, 0xf2ebdd] // amber · signal · rose · cream

// seeded RNG so the layout is identical across mounts/HMR
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildField() {
  const rand = mulberry32(20260704)
  const positions = new Float32Array(COUNT * 3)
  const colors = new Float32Array(COUNT * 3)
  const nodes: THREE.Vector3[] = []
  const c = new THREE.Color()

  for (let i = 0; i < COUNT; i++) {
    // soft sphere-ish volume, flattened for a "network" feel (concept-identical)
    const radius = 3.2 + rand() * 4.5
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(rand() * 2 - 1)
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta) * 0.6
    const z = radius * Math.cos(phi) * 0.8

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    c.set(PALETTE[Math.floor(rand() * PALETTE.length)])
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b

    if (i % 4 === 0) nodes.push(new THREE.Vector3(x, y, z))
  }

  const line: number[] = []
  for (let i = 0; i < nodes.length && line.length / 6 < MAX_SEGMENTS; i++) {
    let linked = 0
    for (let j = i + 1; j < nodes.length && linked < 2; j++) {
      if (nodes[i].distanceTo(nodes[j]) < LINK_DIST) {
        line.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z)
        linked++
        if (line.length / 6 >= MAX_SEGMENTS) break
      }
    }
  }

  return { positions, colors, linePositions: new Float32Array(line) }
}

export default function NeuralField() {
  const group = useRef<THREE.Group>(null)

  const { pointsGeo, lineGeo } = useMemo(() => {
    const f = buildField()
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', new THREE.BufferAttribute(f.positions, 3))
    pg.setAttribute('color', new THREE.BufferAttribute(f.colors, 3))
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(f.linePositions, 3))
    return { pointsGeo: pg, lineGeo: lg }
  }, [])

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    if (!MOTION_OFF) {
      const dt = Math.min(delta, 0.05)
      g.rotation.y += dt * 0.045
      g.rotation.x = Math.sin(state.clock.elapsedTime * 0.07) * 0.12
    }
    // subtle camera drift tied to scroll for depth (concept-identical)
    const p = getScrollProgress()
    state.camera.position.y = -p * 1.4
    state.camera.lookAt(0, -p * 1.4, 0)
  })

  return (
    <group ref={group}>
      <points geometry={pointsGeo} frustumCulled={false}>
        <pointsMaterial
          size={0.045}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial
          color="#63e2c6"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}
