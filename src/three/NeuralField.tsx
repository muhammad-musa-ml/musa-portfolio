import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollProgress, getPointer } from '../lib/scrollBus'

const COUNT = 2400
const LINK_DIST = 2.1
const MAX_LINKS = 1600
const PULSE_COUNT = 42

const AMBER = new THREE.Color('#ffb454')
const TEAL = new THREE.Color('#63e2c6')
const CREAM = new THREE.Color('#f2ebdd')
const ROSE = new THREE.Color('#ff7a6b')

function buildField() {
  const positions = new Float32Array(COUNT * 3)
  const colors = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)
  const seeds = new Float32Array(COUNT)
  const rng = mulberry32(1337)

  for (let i = 0; i < COUNT; i++) {
    // layered galaxy: dense core cluster + wide flattened disc + sparse halo
    const t = rng()
    let r: number, y: number
    if (t < 0.3) {
      r = Math.pow(rng(), 0.9) * 4.5
      y = (rng() - 0.5) * 3.2
    } else if (t < 0.85) {
      r = 4 + Math.pow(rng(), 1.4) * 11
      y = (rng() - 0.5) * (2.6 - r * 0.08)
    } else {
      r = 8 + rng() * 14
      y = (rng() - 0.5) * 9
    }
    const a = rng() * Math.PI * 2
    positions[i * 3] = Math.cos(a) * r
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(a) * r * 0.85

    const c = rng()
    const col =
      c < 0.12 ? AMBER : c < 0.2 ? TEAL : c < 0.225 ? ROSE : CREAM
    const dim = c < 0.225 ? 0.9 : 0.28 + rng() * 0.35
    colors[i * 3] = col.r * dim
    colors[i * 3 + 1] = col.g * dim
    colors[i * 3 + 2] = col.b * dim

    sizes[i] = c < 0.225 ? 2.2 + rng() * 2.6 : 0.9 + rng() * 1.7
    seeds[i] = rng() * 100
  }

  // k-nearest-ish links within the core region only (cheap n² on subset)
  const linkPairs: number[] = []
  const coreIdx: number[] = []
  for (let i = 0; i < COUNT; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    if (x * x + y * y + z * z < 90) coreIdx.push(i)
  }
  outer: for (let a = 0; a < coreIdx.length; a++) {
    for (let b = a + 1; b < coreIdx.length; b++) {
      const i = coreIdx[a]
      const j = coreIdx[b]
      const dx = positions[i * 3] - positions[j * 3]
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
      if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
        linkPairs.push(i, j)
        if (linkPairs.length >= MAX_LINKS * 2) break outer
      }
    }
  }

  const linePos = new Float32Array(linkPairs.length * 3)
  const lineCol = new Float32Array(linkPairs.length * 3)
  for (let k = 0; k < linkPairs.length; k++) {
    const i = linkPairs[k]
    linePos[k * 3] = positions[i * 3]
    linePos[k * 3 + 1] = positions[i * 3 + 1]
    linePos[k * 3 + 2] = positions[i * 3 + 2]
    lineCol[k * 3] = CREAM.r * 0.16
    lineCol[k * 3 + 1] = CREAM.g * 0.16
    lineCol[k * 3 + 2] = CREAM.b * 0.16
  }

  return { positions, colors, sizes, seeds, linkPairs, linePos, lineCol }
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pointsVert = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float uTime;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.72 + 0.28 * sin(uTime * (0.6 + fract(aSeed) * 0.9) + aSeed);
    vTwinkle = tw;
    gl_PointSize = aSize * uPixelRatio * tw * (110.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const pointsFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.06, d);
    alpha *= alpha * vTwinkle;
    gl_FragColor = vec4(vColor, alpha);
  }
`

export default function NeuralField() {
  const group = useRef<THREE.Group>(null!)
  const pulsesRef = useRef<THREE.Points>(null!)
  const { camera } = useThree()

  const field = useMemo(buildField, [])

  const pointsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(field.positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(field.colors, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(field.sizes, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(field.seeds, 1))
    return g
  }, [field])

  const pointsMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointsVert,
        fragmentShader: pointsFrag,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      }),
    []
  )

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(field.linePos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(field.lineCol, 3))
    return g
  }, [field])

  // signal pulses travelling along random links
  const pulses = useMemo(() => {
    const rng = mulberry32(777)
    const list: { a: number; b: number; speed: number; offset: number; hot: boolean }[] = []
    const nLinks = field.linkPairs.length / 2
    for (let i = 0; i < PULSE_COUNT && nLinks > 0; i++) {
      const li = Math.floor(rng() * nLinks)
      list.push({
        a: field.linkPairs[li * 2],
        b: field.linkPairs[li * 2 + 1],
        speed: 0.25 + rng() * 0.7,
        offset: rng(),
        hot: rng() > 0.5,
      })
    }
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(PULSE_COUNT * 3)
    const col = new Float32Array(PULSE_COUNT * 3)
    const size = new Float32Array(PULSE_COUNT).fill(3.4)
    const seed = new Float32Array(PULSE_COUNT)
    for (let i = 0; i < list.length; i++) {
      const c = list[i].hot ? AMBER : TEAL
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
      seed[i] = i * 3.7
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return { geo, list }
  }, [field])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const scroll = getScrollProgress()
    const ptr = getPointer()

    pointsMat.uniforms.uTime.value = t

    if (group.current) {
      // slow drift + scroll-driven rotation + gentle pointer parallax
      const targetRotY = t * 0.02 + scroll * Math.PI * 1.35 + ptr.x * 0.12
      const targetRotX = -0.18 + scroll * 0.35 + ptr.y * 0.08
      group.current.rotation.y += (targetRotY - group.current.rotation.y) * 0.045
      group.current.rotation.x += (targetRotX - group.current.rotation.x) * 0.045
    }

    // camera breathes in as you scroll deeper into the story
    const targetZ = 16 - scroll * 7.5
    camera.position.z += (targetZ - camera.position.z) * 0.04
    camera.position.y += (1.2 - scroll * 2.0 - camera.position.y) * 0.04

    // move pulses along their edges
    const pos = pulses.geo.getAttribute('position') as THREE.BufferAttribute
    const P = field.positions
    for (let i = 0; i < pulses.list.length; i++) {
      const p = pulses.list[i]
      const k = (t * p.speed + p.offset) % 1
      const e = k < 0.5 ? k * 2 : (1 - k) * 2 // ping-pong
      const ax = P[p.a * 3], ay = P[p.a * 3 + 1], az = P[p.a * 3 + 2]
      const bx = P[p.b * 3], by = P[p.b * 3 + 1], bz = P[p.b * 3 + 2]
      pos.setXYZ(i, ax + (bx - ax) * e, ay + (by - ay) * e, az + (bz - az) * e)
    }
    pos.needsUpdate = true
  })

  return (
    // core cluster offset right-of-center so it frames the hero text
    // instead of sitting behind it
    <group ref={group} position={[4.5, 1.5, -3]}>
      <points geometry={pointsGeo} material={pointsMat} />
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <points ref={pulsesRef} geometry={pulses.geo} material={pointsMat} />
    </group>
  )
}
