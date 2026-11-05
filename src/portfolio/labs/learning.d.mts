export type Point = { x: number; y: number; label: 0 | 1 };
export type Model = { weights: [number, number]; bias: number; steps: number };
export type PresetName = "separable" | "noisy" | "xor";
export type Metrics = {
  loss: number | null;
  objective: number | null;
  accuracy: number | null;
  correct: number;
  count: number;
};
export function initialModel(): Model;
export function sigmoid(value: number): number;
export function predictProbability(
  model: Model,
  point: { x: number; y: number },
): number;
export function evaluate(model: Model, points: Point[], l2?: number): Metrics;
export function gradient(
  model: Model,
  points: Point[],
  l2?: number,
): { weights: [number, number]; bias: number };
export function trainStep(
  model: Model,
  points: Point[],
  learningRate?: number,
  l2?: number,
): Model;
export function createPreset(name: PresetName, seed?: number): Point[];
export function decisionBoundary(
  model: Model,
): [{ x: number; y: number }, { x: number; y: number }] | null;
