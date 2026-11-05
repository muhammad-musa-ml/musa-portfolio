import { createLatentSampler } from "../visuals/latent-surface";

export type Point3 = {
  x: number;
  y: number;
  z: number;
  w?: number;
  origin?: Point3;
  target?: Point3;
  phase?: number;
  tone?: number;
};
export type Stroke = {
  points: Point3[];
  color: number;
  width: number;
  opacity: number;
  closed?: boolean;
  flow?: number;
};
export type Dot = Point3 & { color: number; size: number };
export type Field = { strokes: Stroke[]; dots: Dot[] };
export type BackgroundVariant =
  | "neural"
  | "contours"
  | "orbital"
  | "hypercube"
  | "attention"
  | "tensor"
  | "latent";

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function neural(): Field {
  const rand = random(60619);
  const dots: Dot[] = Array.from({ length: 430 }, () => ({
    x: (rand() - 0.5) * 3.8,
    y: (rand() - 0.5) * 2.6,
    z: (rand() - 0.5) * 1.1,
    color: rand() < 0.15 ? 0 : rand() < 0.8 ? 1 : 2,
    size: 0.8 + rand() * 1.7,
  }));
  const strokes: Stroke[] = [];
  dots.forEach((point, index) => {
    const neighbors = dots
      .slice(index + 1)
      .map((other) => ({
        point: other,
        distance: Math.hypot(
          point.x - other.x,
          point.y - other.y,
          (point.z - other.z) * 0.7,
        ),
      }))
      .filter((other) => other.distance < 0.34)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
    neighbors.forEach((other) =>
      strokes.push({
        points: [point, other.point],
        color: point.color === 0 && index % 3 === 0 ? 0 : 1,
        width: 0.7,
        opacity: 0.22 + (1 - other.distance / 0.34) * 0.24,
      }),
    );
  });
  return { strokes, dots };
}

function contours(): Field {
  const strokes: Stroke[] = [];
  // A continuous folded surface: each line is one cross-section, not a texture.
  for (let row = -38; row <= 38; row++) {
    const points: Point3[] = [];
    const v = row / 26;
    for (let column = 0; column <= 112; column++) {
      const u = (column / 112) * 4.8 - 2.4;
      const swell = Math.exp(-((u + 0.15) ** 2 * 0.7 + (v - 0.1) ** 2 * 1.9));
      points.push({
        x: u,
        y: v * 0.82 + Math.sin(u * 2.8 + v * 1.2) * 0.19 + swell * 0.38,
        z: Math.sin(u * 2 + v * 2.5) * 0.18 + swell * 0.45,
      });
    }
    strokes.push({
      points,
      color: row % 12 === 0 ? 0 : row < 0 ? 1 : 2,
      width: row % 12 === 0 ? 1.3 : 0.7,
      opacity: row % 12 === 0 ? 0.85 : 0.45,
    });
  }
  return { strokes, dots: [] };
}

function orbital(): Field {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const centers = [
    { x: -1.16, y: -0.65, z: 0.08, radius: 0.8 },
    { x: 0.58, y: -0.1, z: -0.04, radius: 1.12 },
    { x: -0.7, y: 0.94, z: -0.16, radius: 0.74 },
    { x: 1.7, y: 1.06, z: 0.1, radius: 0.8 },
  ];
  centers.forEach((center, cluster) => {
    for (let ring = 0; ring < 22; ring++) {
      const points: Point3[] = [];
      const tilt = (ring / 22) * Math.PI;
      const radius =
        center.radius * (0.8 + Math.sin((ring / 22) * Math.PI) * 0.2);
      for (let step = 0; step <= 100; step++) {
        const angle = (step / 100) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        points.push({
          x: center.x + x * Math.cos(tilt) - y * 0.24,
          y: center.y + y * 0.56 + x * Math.sin(tilt) * 0.36,
          z:
            center.z +
            x * Math.sin(tilt) * 0.55 +
            Math.cos(angle * 2 + tilt) * 0.06,
        });
      }
      strokes.push({
        points,
        color: ring % 7 === 0 ? 0 : cluster % 2 ? 1 : 2,
        width: ring % 7 === 0 ? 1.15 : 0.6,
        opacity: ring % 7 === 0 ? 0.9 : 0.38,
        closed: true,
      });
      if (ring % 7 === 0) {
        const anchor = points[(ring * 13 + cluster * 7) % 100];
        dots.push({ ...anchor, color: 0, size: 2.5 });
      }
    }
  });
  return { strokes, dots };
}

function hypercube(): Field {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const centers = [
    { x: -1.35, y: -0.65, z: -0.08 },
    { x: 0.35, y: -0.4, z: 0.08 },
    { x: 1.8, y: 0.65, z: -0.12 },
    { x: -0.85, y: 0.95, z: -0.02 },
  ];
  centers.forEach((origin, cluster) => {
    const vertices: Dot[] = Array.from({ length: 16 }, (_, index) => ({
      x: index & 1 ? 0.62 : -0.62,
      y: index & 2 ? 0.62 : -0.62,
      z: index & 4 ? 0.62 : -0.62,
      w: index & 8 ? 0.62 : -0.62,
      origin,
      phase: cluster * 0.37,
      color: index & 8 ? 0 : 1,
      size: index % 5 === 0 ? 3.5 : 2,
    }));
    dots.push(...vertices);
    // An edge joins vertices whose four-bit addresses differ in exactly one bit.
    for (let vertex = 0; vertex < 16; vertex++) {
      for (let dimension = 0; dimension < 4; dimension++) {
        const neighbor = vertex ^ (1 << dimension);
        if (neighbor > vertex)
          strokes.push({
            points: [vertices[vertex], vertices[neighbor]],
            color: dimension === 3 ? 0 : dimension === 1 ? 1 : 2,
            width: dimension === 3 ? 1.45 : 0.8,
            opacity: dimension === 3 ? 0.85 : 0.43,
          });
      }
    }
  });
  return { strokes, dots };
}

function attention(): Field {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const layers: Dot[][] = [];
  for (let layer = 0; layer < 6; layer++) {
    const nodes: Dot[] = [];
    const x = (layer - 2.5) * 0.65;
    for (let row = 0; row < 7; row++) {
      for (let column = 0; column < 4; column++)
        nodes.push({
          x: x + (column - 1.5) * 0.105,
          y: (row - 3) * 0.24,
          z: (column - 1.5) * 0.19,
          phase: layer * 0.65,
          color: (row + column + layer) % 9 === 0 ? 0 : 1,
          size: (row + layer) % 4 === 0 ? 3.7 : 2.1,
        });
    }
    layers.push(nodes);
    dots.push(...nodes);
    const corners = [
      { x: x - 0.22, y: -0.91, z: -0.4, phase: layer * 0.65 },
      { x: x + 0.22, y: -0.91, z: 0.4, phase: layer * 0.65 },
      { x: x + 0.22, y: 0.91, z: 0.4, phase: layer * 0.65 },
      { x: x - 0.22, y: 0.91, z: -0.4, phase: layer * 0.65 },
    ];
    strokes.push({
      points: corners,
      color: 2,
      width: 0.7,
      opacity: 0.2,
      closed: true,
    });
    for (let row = 0; row < 7; row++)
      strokes.push({
        points: nodes.slice(row * 4, row * 4 + 4),
        color: 1,
        width: 0.6,
        opacity: 0.25,
      });
  }
  for (let layer = 0; layer < layers.length - 1; layer++) {
    layers[layer].forEach((source, index) => {
      if (index % 2) return;
      for (let branch = 0; branch < 2; branch++) {
        const destination =
          layers[layer + 1][(index + (branch ? 9 : 3) + layer * 2) % 28];
        const points: Point3[] = [];
        for (let step = 0; step <= 10; step++) {
          const t = step / 10;
          const curve = Math.sin(t * Math.PI);
          points.push({
            x: source.x + (destination.x - source.x) * t,
            y:
              source.y +
              (destination.y - source.y) * t +
              curve * (branch ? 0.13 : -0.13),
            z: source.z + (destination.z - source.z) * t + curve * 0.12,
            phase: (layer + t) * 0.65,
          });
        }
        strokes.push({
          points,
          color: index % 6 === 0 ? 0 : 1,
          width: index % 6 === 0 ? 1.1 : 0.6,
          opacity: index % 6 === 0 ? 0.7 : 0.24,
          flow: layer * 0.8 + index * 0.11,
        });
      }
    });
  }
  return { strokes, dots };
}

function tensor(): Field {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const nx = 11,
    ny = 7,
    nz = 5;
  const rand = random(40612);
  const indexOf = (x: number, y: number, z: number) => (x * ny + y) * nz + z;
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        const angle = (x / (nx - 1)) * Math.PI * 2;
        const band = (y / (ny - 1) - 0.5) * 0.58;
        const thickness = (z / (nz - 1) - 0.5) * 0.4;
        dots.push({
          x: (x - (nx - 1) / 2) * 0.32,
          y: (y - (ny - 1) / 2) * 0.27,
          z: (z - (nz - 1) / 2) * 0.27,
          target: {
            x: (1.35 + band) * Math.sin(angle) + thickness * 0.6,
            y:
              Math.sin(angle * 2) * 0.58 +
              band * Math.cos(angle * 2) +
              (rand() - 0.5) * 0.1,
            z: Math.cos(angle) * 0.55 + thickness + band * Math.sin(angle * 2),
          },
          color: z === 2 && (x + y) % 3 === 0 ? 0 : z % 2 ? 1 : 2,
          size: z === 2 ? 2.9 : 1.7,
        });
      }
    }
  }
  for (let y = 0; y < ny; y++)
    for (let z = 0; z < nz; z++)
      strokes.push({
        points: Array.from({ length: nx }, (_, x) => dots[indexOf(x, y, z)]),
        color: z === 2 ? 0 : 1,
        width: 0.65,
        opacity: z === 2 ? 0.5 : 0.2,
      });
  for (let x = 0; x < nx; x++)
    for (let z = 0; z < nz; z++)
      strokes.push({
        points: Array.from({ length: ny }, (_, y) => dots[indexOf(x, y, z)]),
        color: 1,
        width: 0.6,
        opacity: 0.2,
      });
  for (let x = 0; x < nx; x++)
    for (let y = 0; y < ny; y++)
      strokes.push({
        points: Array.from({ length: nz }, (_, z) => dots[indexOf(x, y, z)]),
        color: 2,
        width: 0.6,
        opacity: 0.16,
      });
  return { strokes, dots };
}

function latent(): Field {
  const side = 88;
  const dots: Dot[] = [];
  const strokes: Stroke[] = [];
  for (let row = 0; row < side; row++) {
    const points: Dot[] = [];
    for (let col = 0; col < side; col++) {
      const point = {
        x: col / (side - 1),
        y: row / (side - 1),
        z: 0,
        color: row % 17 === 0 ? 0 : col < side / 2 ? 1 : 2,
        size: 1.65,
      };
      dots.push(point);
      points.push(point);
    }
    if (row % 8 === 0)
      strokes.push({ points, color: 0, width: 0.55, opacity: 0.28 });
  }
  return { strokes, dots };
}

const sampleLatent = createLatentSampler();
const builders = {
  neural,
  contours,
  orbital,
  hypercube,
  attention,
  tensor,
  latent,
};
const cache = new Map<BackgroundVariant, Field>();

export function getField(variant: BackgroundVariant): Field {
  let field = cache.get(variant);
  if (!field) {
    field = builders[variant]();
    cache.set(variant, field);
  }
  return field;
}

/** Original analytic geometry; no model weights, 3D assets or third-party snippets. */
export function createFieldTransform(
  variant: BackgroundVariant,
  scroll: number,
  seconds = 0,
) {
  const angle = scroll * 0.12;
  const cosine = Math.cos(angle),
    sine = Math.sin(angle);
  const morph = (1 - Math.cos(scroll * 0.85)) * 0.5;
  const xw = scroll * 0.57 + 0.42;
  const yw = scroll * 0.31 + 0.25;
  const cxw = Math.cos(xw),
    sxw = Math.sin(xw);
  const cyw = Math.cos(yw),
    syw = Math.sin(yw);

  if (variant === "latent") {
    const point3 = { x: 0, y: 0, z: 0, tone: 0 };
    const progress = (1 - Math.cos(scroll * 0.34)) * 0.43;
    const cx = Math.cos(0.43),
      sx = Math.sin(0.43);
    const cy = Math.cos(-0.35),
      sy = Math.sin(-0.35);
    const cz = Math.cos(-0.09),
      sz = Math.sin(-0.09);
    return (point: Point3, out: Point3) => {
      sampleLatent(point.x, point.y, progress, seconds, point3);
      // Match the study's XYZ rotation, then fit it as a broad backdrop.
      const x = point3.x * cz - point3.y * sz;
      const y = point3.x * sz + point3.y * cz;
      const x2 = x * cy + point3.z * sy;
      const z = -x * sy + point3.z * cy;
      out.x = x2 * 0.72;
      out.y = -(y * cx - z * sx) * 0.72;
      out.z = (y * sx + z * cx) * 0.36;
      out.tone = point3.tone;
    };
  }

  return (point: Point3, out: Point3) => {
    let x = point.x,
      y = point.y,
      z = point.z;
    if (variant === "hypercube") {
      const phase = point.phase ?? 0;
      const w = point.w ?? 0;
      // Rotate in two independent 4D planes before perspective-dividing W.
      const x1 = x * cxw - w * sxw;
      const w1 = x * sxw + w * cxw;
      const y1 = y * cyw - w1 * syw;
      const w2 = y * syw + w1 * cyw;
      const fourPerspective = 2.8 / (2.8 - w2);
      const c = Math.cos(phase + 0.28),
        s = Math.sin(phase + 0.28);
      x = (x1 * c + z * s) * fourPerspective + (point.origin?.x ?? 0);
      y = y1 * fourPerspective + (point.origin?.y ?? 0);
      z = (-x1 * s + z * c) * fourPerspective + (point.origin?.z ?? 0);
    } else if (variant === "tensor" && point.target) {
      x += (point.target.x - x) * morph;
      y += (point.target.y - y) * morph;
      z += (point.target.z - z) * morph;
    } else if (variant === "attention") {
      const phase = point.phase ?? 0;
      y += (Math.sin(scroll * 0.8 + phase) - Math.sin(phase)) * 0.14;
      z += (Math.cos(scroll * 0.7 + phase) - Math.cos(phase)) * 0.22;
    } else if (variant === "contours") {
      y += (Math.sin(x * 2.2 + scroll * 0.65) - Math.sin(x * 2.2)) * 0.12;
      z += Math.sin(scroll * 0.38) * Math.cos(x * 1.3 + y) * 0.12;
    }
    const turn = variant === "hypercube" || variant === "attention" ? 0 : sine;
    const retain =
      variant === "hypercube" || variant === "attention" ? 1 : cosine;
    out.x = x * retain + z * turn;
    out.y = y;
    out.z = -x * turn + z * retain;
  };
}
