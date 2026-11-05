import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { createLatentSampler } from "./latent-surface";
import { hilbert3D } from "three/examples/jsm/utils/GeometryUtils.js";
import "./visual-study.css";

export type VisualVariant = "hypercube" | "tokens" | "latent";
export type VisualTheme = "dark" | "light";
export type VisualStudyProps = {
  variant: VisualVariant;
  theme: VisualTheme;
  progress?: number;
};

export const VISUAL_STUDIES = [
  {
    id: "hypercube" as const,
    name: "A fourth direction",
    kicker: "Geometry beyond the screen",
    description:
      "A four-dimensional cube turns through a direction we cannot point to. Its sixteen corners move through a three-dimensional projection.",
    interaction:
      "Scroll or scrub to rotate through the fourth dimension. Move across the surface to inspect the projection.",
    source: "Original 4D projection with Three.js instanced geometry.",
    sourceUrl:
      "https://github.com/mrdoob/three.js/blob/r171/src/objects/InstancedMesh.js",
  },
  {
    id: "tokens" as const,
    name: "The shape of a thought",
    kicker: "Order becomes context",
    description:
      "Rows of tokens fold into a dense spatial circuit, then spread into an attention-like matrix. A sculpture about computation, not a model inference display.",
    interaction:
      "Scroll or scrub to fold the sequence into a three-dimensional Hilbert path.",
    source:
      "Uses Three.js GeometryUtils.hilbert3D, with an original instanced token composition.",
    sourceUrl:
      "https://github.com/mrdoob/three.js/blob/r171/examples/jsm/utils/GeometryUtils.js",
  },
  {
    id: "latent" as const,
    name: "A landscape of possibilities",
    kicker: "A slice through four dimensions",
    description:
      "Thousands of points form a folded landscape. A fourth noise coordinate changes its form before the sheet gathers into a sphere.",
    interaction:
      "Scroll or scrub to move through the noise field and fold the landscape. Move across it to change your viewpoint.",
    source:
      "Uses Three.js SimplexNoise.noise4d, with original point and contour rendering.",
    sourceUrl:
      "https://github.com/mrdoob/three.js/blob/r171/examples/jsm/math/SimplexNoise.js",
  },
];

type Palette = {
  amber: THREE.Color;
  teal: THREE.Color;
  coral: THREE.Color;
  ink: THREE.Color;
};
type SculptureProps = { value: MutableRefObject<number>; palette: Palette };
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const clamp = (value: number) =>
  THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);

function colors(theme: VisualTheme): Palette {
  return {
    amber: new THREE.Color(theme === "dark" ? "#ffb454" : "#b06420"),
    teal: new THREE.Color(theme === "dark" ? "#63e2c6" : "#16796f"),
    coral: new THREE.Color(theme === "dark" ? "#ff7a6b" : "#bd4b3b"),
    ink: new THREE.Color(theme === "dark" ? "#f2ebdd" : "#253e43"),
  };
}

// The tesseract coordinates and plane rotations are original code. Only the
// renderer/instancing API is reused here; this is not a copied website scene.
const CORNERS = Array.from({ length: 16 }, (_, index) =>
  [0, 1, 2, 3].map((axis) => (index & (1 << axis) ? 1 : -1)),
);
const EDGES = CORNERS.flatMap((_, index) =>
  [0, 1, 2, 3]
    .filter((axis) => !(index & (1 << axis)))
    .map((axis) => [index, index | (1 << axis), axis]),
);

function project4D(point: number[], progress: number, target: THREE.Vector3) {
  const result = [...point];
  const rotate = (a: number, b: number, angle: number) => {
    const x = result[a],
      y = result[b];
    result[a] = x * Math.cos(angle) - y * Math.sin(angle);
    result[b] = x * Math.sin(angle) + y * Math.cos(angle);
  };
  rotate(0, 3, progress * Math.PI * 1.8 + 0.36);
  rotate(1, 3, progress * Math.PI * 0.7 - 0.3);
  rotate(0, 2, 0.42);
  rotate(1, 2, -0.3);
  const perspective = 3.8 / (3.8 - result[3]);
  return target
    .set(result[0], result[1], result[2])
    .multiplyScalar(perspective * 1.14);
}

function Hypercube({ value, palette }: SculptureProps) {
  const beams = useRef<THREE.InstancedMesh>(null);
  const nodes = useRef<THREE.InstancedMesh>(null);
  const faces = useRef<THREE.BufferGeometry>(null);
  const last = useRef(-1);
  const points = useMemo(() => CORNERS.map(() => new THREE.Vector3()), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const facePositions = useMemo(() => new Float32Array(12 * 3), []);
  useLayoutEffect(() => {
    if (!beams.current || !nodes.current) return;
    EDGES.forEach(([, , axis], index) =>
      beams.current!.setColorAt(
        index,
        axis === 3 ? palette.teal : axis === 2 ? palette.coral : palette.amber,
      ),
    );
    CORNERS.forEach((_, index) =>
      nodes.current!.setColorAt(
        index,
        index < 8 ? palette.amber : palette.teal,
      ),
    );
    if (beams.current.instanceColor)
      beams.current.instanceColor.needsUpdate = true;
    if (nodes.current.instanceColor)
      nodes.current.instanceColor.needsUpdate = true;
    last.current = -1;
  }, [palette]);
  useFrame(() => {
    if (!beams.current || !nodes.current || last.current === value.current)
      return;
    last.current = value.current;
    CORNERS.forEach((corner, index) =>
      project4D(corner, value.current, points[index]),
    );
    EDGES.forEach(([a, b], index) => {
      direction.subVectors(points[b], points[a]);
      dummy.position.copy(points[a]).add(points[b]).multiplyScalar(0.5);
      dummy.quaternion.setFromUnitVectors(
        Y_AXIS,
        direction.clone().normalize(),
      );
      dummy.scale.set(0.018, direction.length(), 0.018);
      dummy.updateMatrix();
      beams.current!.setMatrixAt(index, dummy.matrix);
    });
    points.forEach((point, index) => {
      dummy.position.copy(point);
      dummy.rotation.set(0.12, 0.4, 0.15);
      dummy.scale.setScalar(index === 15 ? 0.17 : 0.095);
      dummy.updateMatrix();
      nodes.current!.setMatrixAt(index, dummy.matrix);
    });
    // Two translucent slices make the projected depth legible without bloom.
    const faceIndices = [0, 1, 3, 0, 3, 2, 12, 13, 15, 12, 15, 14];
    faceIndices.forEach((index, vertex) =>
      points[index].toArray(facePositions, vertex * 3),
    );
    if (faces.current) {
      faces.current.attributes.position.needsUpdate = true;
      faces.current.computeVertexNormals();
    }
    beams.current.instanceMatrix.needsUpdate = true;
    nodes.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh
        ref={beams}
        args={[undefined, undefined, EDGES.length]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1, 1, 7]} />
        <meshStandardMaterial roughness={0.31} metalness={0.28} />
      </instancedMesh>
      <instancedMesh
        ref={nodes}
        args={[undefined, undefined, 16]}
        frustumCulled={false}
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.25} metalness={0.2} />
      </instancedMesh>
      <mesh frustumCulled={false}>
        <bufferGeometry ref={faces}>
          <bufferAttribute
            attach="attributes-position"
            args={[facePositions, 3]}
          />
        </bufferGeometry>
        <meshBasicMaterial
          color={palette.teal}
          transparent
          opacity={0.075}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Tokens({ value, palette }: SculptureProps) {
  const blocks = useRef<THREE.InstancedMesh>(null);
  const traces = useRef<THREE.BufferGeometry>(null);
  const last = useRef(-1);
  // Direct use of the MIT-licensed Three.js helper, not a reimplementation.
  const path = useMemo(() => hilbert3D(new THREE.Vector3(), 3.4, 1), []);
  const count = 256;
  const positions = useMemo(
    () => Array.from({ length: count }, () => new THREE.Vector3()),
    [],
  );
  const linePositions = useMemo(() => new Float32Array((count - 1) * 6), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    if (!blocks.current) return;
    for (let index = 0; index < count; index++)
      blocks.current.setColorAt(
        index,
        index % 17 < 4
          ? palette.coral
          : index % 8 < 3
            ? palette.teal
            : palette.amber,
      );
    if (blocks.current.instanceColor)
      blocks.current.instanceColor.needsUpdate = true;
    last.current = -1;
  }, [palette]);
  useFrame(() => {
    if (!blocks.current || last.current === value.current) return;
    last.current = value.current;
    const progress = value.current;
    const fold = THREE.MathUtils.smoothstep(progress, 0.02, 0.75);
    const opening = THREE.MathUtils.smoothstep(progress, 0.72, 1);
    for (let index = 0; index < count; index++) {
      const row = Math.floor(index / 16),
        col = index % 16;
      const t = (index / (count - 1)) * (path.length - 1);
      const left = Math.floor(t),
        right = Math.min(path.length - 1, left + 1);
      const x = (col - 7.5) * 0.48,
        y = (row - 7.5) * 0.3;
      const z = Math.sin(col * 0.28 + row * 0.35) * 0.35;
      positions[index].copy(path[left]).lerp(path[right], t - left);
      positions[index].x = THREE.MathUtils.lerp(
        x,
        positions[index].x + opening * (col - 7.5) * 0.18,
        fold,
      );
      positions[index].y = THREE.MathUtils.lerp(
        y,
        positions[index].y * (1 - opening * 0.35),
        fold,
      );
      positions[index].z = THREE.MathUtils.lerp(
        z,
        positions[index].z + opening * Math.sin(col * 0.4) * 1.1,
        fold,
      );
      dummy.position.copy(positions[index]);
      dummy.rotation.set(fold * (row % 3) * 0.3, fold * (col % 3) * 0.25, 0);
      dummy.scale.set(
        0.25 - fold * 0.1,
        0.085 + fold * 0.035,
        0.075 + fold * 0.045,
      );
      dummy.updateMatrix();
      blocks.current.setMatrixAt(index, dummy.matrix);
    }
    for (let index = 0; index < count - 1; index++) {
      positions[index].toArray(linePositions, index * 6);
      positions[index + 1].toArray(linePositions, index * 6 + 3);
    }
    blocks.current.instanceMatrix.needsUpdate = true;
    if (traces.current) traces.current.attributes.position.needsUpdate = true;
  });
  return (
    <group rotation={[0.2, -0.45, -0.1]} scale={0.74}>
      <instancedMesh
        ref={blocks}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.34} metalness={0.18} />
      </instancedMesh>
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={traces}>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={palette.teal}
          transparent
          opacity={0.19}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function Latent({ value, palette }: SculptureProps) {
  const geometry = useRef<THREE.BufferGeometry>(null);
  const contours = useRef<THREE.BufferGeometry>(null);
  const last = useRef(-1);
  const sample = useMemo(() => createLatentSampler(), []);
  const point = useMemo(() => ({ x: 0, y: 0, z: 0, tone: 0 }), []);
  const side = 68,
    count = side * side;
  const positions = useMemo(() => new Float32Array(count * 3), []);
  const pointColors = useMemo(() => new Float32Array(count * 3), []);
  const lines = useMemo(() => new Float32Array(9 * (side - 1) * 6), []);
  const color = useMemo(() => new THREE.Color(), []);
  useEffect(() => {
    last.current = -1;
  }, [palette]);
  useFrame(() => {
    if (!geometry.current || last.current === value.current) return;
    last.current = value.current;
    const progress = value.current;
    for (let row = 0; row < side; row++)
      for (let col = 0; col < side; col++) {
        const index = row * side + col;
        const u = col / (side - 1),
          v = row / (side - 1);
        sample(u, v, progress, 0, point);
        positions[index * 3] = point.x;
        positions[index * 3 + 1] = point.y;
        positions[index * 3 + 2] = point.z;
        color.copy(palette.teal).lerp(palette.amber, point.tone);
        if (row % 17 === 0) color.lerp(palette.coral, 0.75);
        color.toArray(pointColors, index * 3);
      }
    let cursor = 0;
    for (let slice = 0; slice < 9; slice++) {
      const row = Math.min(side - 1, slice * 8);
      for (let col = 0; col < side - 1; col++)
        for (const offset of [0, 1]) {
          const index = (row * side + col + offset) * 3;
          lines[cursor++] = positions[index];
          lines[cursor++] = positions[index + 1];
          lines[cursor++] = positions[index + 2];
        }
    }
    geometry.current.attributes.position.needsUpdate = true;
    geometry.current.attributes.color.needsUpdate = true;
    if (contours.current)
      contours.current.attributes.position.needsUpdate = true;
  });
  return (
    <group rotation={[0.43, -0.35, -0.09]}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geometry}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[pointColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.65}
          vertexColors
          sizeAttenuation={false}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </points>
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={contours}>
          <bufferAttribute attach="attributes-position" args={[lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={palette.amber}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function StudyScene({
  variant,
  theme,
  progress = 0.18,
  active,
  reduced,
}: VisualStudyProps & { active: boolean; reduced: boolean }) {
  const { invalidate, camera, size, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const current = useRef(clamp(progress));
  const target = useRef(clamp(progress));
  const pointer = useRef({ x: 0, y: 0 });
  const palette = useMemo(() => colors(theme), [theme]);
  useLayoutEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = Math.min(size.width / 8.2, size.height / 6.7);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size, invalidate]);
  useEffect(() => {
    target.current = clamp(progress);
    if (active) invalidate();
  }, [progress, active, variant, palette, reduced, invalidate]);
  useEffect(() => {
    const element = gl.domElement;
    const move = (event: PointerEvent) => {
      if (!active || reduced || event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      pointer.current = {
        x: (event.clientX - rect.left) / rect.width - 0.5,
        y: (event.clientY - rect.top) / rect.height - 0.5,
      };
      invalidate();
    };
    const leave = () => {
      pointer.current = { x: 0, y: 0 };
      if (active) invalidate();
    };
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  }, [active, reduced, gl, invalidate]);
  useFrame((_, delta) => {
    if (!active || !group.current) return;
    const targetX = reduced ? 0 : pointer.current.y * 0.28;
    const targetY = reduced ? 0 : pointer.current.x * 0.4;
    current.current = reduced
      ? target.current
      : THREE.MathUtils.damp(
          current.current,
          target.current,
          12,
          Math.min(delta, 0.05),
        );
    if (Math.abs(current.current - target.current) < 0.0001)
      current.current = target.current;
    group.current.rotation.x = reduced
      ? 0
      : THREE.MathUtils.damp(
          group.current.rotation.x,
          targetX,
          10,
          Math.min(delta, 0.05),
        );
    group.current.rotation.y = reduced
      ? 0
      : THREE.MathUtils.damp(
          group.current.rotation.y,
          targetY,
          10,
          Math.min(delta, 0.05),
        );
    if (
      current.current !== target.current ||
      Math.abs(group.current.rotation.x - targetX) +
        Math.abs(group.current.rotation.y - targetY) >
        0.0005
    )
      invalidate();
  }, -2);
  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[3, 5, 7]} intensity={2.6} color="#fff1dc" />
      <directionalLight position={[-4, 1, 3]} intensity={1.6} color="#b4eadc" />
      <group ref={group}>
        {variant === "hypercube" ? (
          <Hypercube value={current} palette={palette} />
        ) : variant === "tokens" ? (
          <Tokens value={current} palette={palette} />
        ) : (
          <Latent value={current} palette={palette} />
        )}
      </group>
    </>
  );
}

function Fallback({ variant }: { variant: VisualVariant }) {
  return (
    <div className={`vs-fallback vs-fallback--${variant}`} aria-hidden="true">
      <svg viewBox="0 0 600 400" fill="none">
        {variant === "hypercube" ? (
          <g stroke="currentColor" strokeWidth="2">
            <path d="m150 110 190-55 130 125-190 65-130-135v145l130 95 190-75V180M280 245v105M213 142l104-28 66 68-105 34-65-74v78l65 53 105-40v-51M278 216v57M150 110l63 32m127-87-23 59m153 66-87 2m-103 63-2-29" />
          </g>
        ) : variant === "tokens" ? (
          <g fill="currentColor">
            {Array.from({ length: 90 }, (_, index) => (
              <rect
                key={index}
                x={110 + (index % 10) * 38}
                y={50 + Math.floor(index / 10) * 33}
                width="24"
                height="8"
                transform={`rotate(${Math.floor(index / 10) * 2 - 8} 300 200)`}
                opacity={0.35 + (index % 3) * 0.25}
              />
            ))}
          </g>
        ) : (
          <g stroke="currentColor">
            {Array.from({ length: 19 }, (_, index) => (
              <path
                key={index}
                d={`M70 ${110 + index * 8} Q180 ${10 + index * 9} 300 ${180 + index * 4} T530 ${110 + index * 8}`}
                opacity={0.3 + index / 30}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

class StudyBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function VisualStudy({
  variant,
  theme,
  progress = 0.18,
}: VisualStudyProps) {
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const reduced = !!useReducedMotion();
  const study = VISUAL_STUDIES.find((item) => item.id === variant)!;
  useEffect(() => {
    let intersects = true;
    const update = () =>
      setActive(intersects && document.visibilityState !== "hidden");
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              intersects = entries[0]?.isIntersecting ?? true;
              update();
            },
            { rootMargin: "40px" },
          );
    if (container.current) observer?.observe(container.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <div
      className="visual-study"
      ref={container}
      data-variant={variant}
      data-theme={theme}
      role="img"
      aria-label={`${study.name}. ${study.description}`}
    >
      <StudyBoundary fallback={<Fallback variant={variant} />}>
        <Canvas
          aria-hidden="true"
          tabIndex={-1}
          orthographic
          camera={{ position: [0, 0, 12], zoom: 50, near: 0.1, far: 50 }}
          frameloop={active ? "demand" : "never"}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          fallback={<Fallback variant={variant} />}
        >
          <StudyScene {...{ variant, theme, progress, active, reduced }} />
        </Canvas>
      </StudyBoundary>
    </div>
  );
}
