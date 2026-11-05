import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

export type LatentPoint = { x: number; y: number; z: number; tone: number };

/** Shared by the original 3D study and its spotlight background. */
export function createLatentSampler() {
  let seed = 7919;
  const noise = new SimplexNoise({
    random: () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    },
  });
  return (
    u: number,
    v: number,
    progress: number,
    seconds: number,
    out: LatentPoint,
  ) => {
    const t = Math.max(0, Math.min(1, (progress - 0.43) / 0.57));
    const sphere = t * t * (3 - 2 * t);
    const x = (u - 0.5) * 6;
    const z = (v - 0.5) * 4.9;
    const n = noise.noise4d(
      x * 0.4,
      z * 0.4,
      0.34,
      progress * 1.7 + seconds * 0.065,
    );
    const height =
      n * 1.4 + Math.sin(x * 1.7 + progress * 4 + seconds * 0.12) * 0.38;
    const azimuth = u * Math.PI * 2;
    const polar = v * Math.PI;
    const radius = 2.15 + n * 0.28;
    out.x = x + (radius * Math.sin(polar) * Math.cos(azimuth) - x) * sphere;
    out.y = height + (radius * Math.cos(polar) - height) * sphere;
    out.z = z + (radius * Math.sin(polar) * Math.sin(azimuth) - z) * sphere;
    out.tone = Math.max(0, Math.min(1, n * 1.3 + 0.5));
  };
}
