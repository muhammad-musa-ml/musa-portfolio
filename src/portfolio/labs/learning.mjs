// A two-feature logistic model. Everything here runs locally and is independent
// of the interface; no fitted weights or measured results are hard-coded.
export function initialModel() {
  return { weights: [0, 0], bias: 0, steps: 0 };
}

export function sigmoid(value) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

export function predictProbability(model, point) {
  return sigmoid(
    model.weights[0] * point.x + model.weights[1] * point.y + model.bias,
  );
}

function check(model, points, l2) {
  if (
    !model ||
    !Array.isArray(model.weights) ||
    model.weights.length !== 2 ||
    ![...model.weights, model.bias].every(Number.isFinite)
  )
    throw new TypeError("Model parameters must be finite.");
  if (!Number.isInteger(model.steps) || model.steps < 0)
    throw new TypeError("Model steps must be a nonnegative integer.");
  if (!Number.isFinite(l2) || l2 < 0)
    throw new RangeError("L2 must be a nonnegative finite number.");
  if (!Array.isArray(points)) throw new TypeError("Points must be an array.");
  for (const point of points) {
    if (
      !point ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      Math.abs(point.x) > 1 ||
      Math.abs(point.y) > 1 ||
      ![0, 1].includes(point.label)
    )
      throw new RangeError(
        "Each point needs coordinates between -1 and 1 and a binary label.",
      );
  }
}

export function evaluate(model, points, l2 = 0) {
  check(model, points, l2);
  if (!points.length)
    return {
      loss: null,
      objective: null,
      accuracy: null,
      correct: 0,
      count: 0,
    };
  let total = 0;
  let correct = 0;
  for (const point of points) {
    const score =
      model.weights[0] * point.x + model.weights[1] * point.y + model.bias;
    // Stable binary cross-entropy directly from logits. Computing log(sigmoid)
    // would produce log(0) for confident mistakes.
    total +=
      Math.max(score, 0) -
      score * point.label +
      Math.log1p(Math.exp(-Math.abs(score)));
    if ((score >= 0 ? 1 : 0) === point.label) correct += 1;
  }
  const loss = total / points.length;
  const penalty = 0.5 * l2 * (model.weights[0] ** 2 + model.weights[1] ** 2);
  return {
    loss,
    objective: loss + penalty,
    accuracy: correct / points.length,
    correct,
    count: points.length,
  };
}

export function gradient(model, points, l2 = 0) {
  check(model, points, l2);
  if (!points.length)
    throw new RangeError("Add at least one point before training.");
  let x = 0;
  let y = 0;
  let bias = 0;
  for (const point of points) {
    const error = predictProbability(model, point) - point.label;
    x += error * point.x;
    y += error * point.y;
    bias += error;
  }
  return {
    weights: [
      x / points.length + l2 * model.weights[0],
      y / points.length + l2 * model.weights[1],
    ],
    bias: bias / points.length,
  };
}

export function trainStep(model, points, learningRate = 0.3, l2 = 0) {
  if (!Number.isFinite(learningRate) || learningRate <= 0)
    throw new RangeError("Learning rate must be positive and finite.");
  const change = gradient(model, points, l2);
  const next = {
    weights: [
      model.weights[0] - learningRate * change.weights[0],
      model.weights[1] - learningRate * change.weights[1],
    ],
    bias: model.bias - learningRate * change.bias,
    steps: model.steps + 1,
  };
  if (![...next.weights, next.bias].every(Number.isFinite))
    throw new RangeError("This update overflowed. Lower the learning rate.");
  return next;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPreset(name, seed = 41) {
  const random = seededRandom(seed);
  const points = [];
  if (name === "separable") {
    for (let i = 0; i < 24; i += 1) {
      for (const label of [0, 1]) {
        const direction = label === 0 ? -1 : 1;
        points.push({
          x: direction * (0.3 + random() * 0.5),
          y: direction * (0.15 + random() * 0.65),
          label,
        });
      }
    }
  } else if (name === "noisy") {
    for (let i = 0; i < 64; i += 1) {
      const x = (random() * 2 - 1) * 0.88;
      const y = (random() * 2 - 1) * 0.88;
      let label = x + 0.55 * y > 0 ? 1 : 0;
      if (random() < 0.18) label = 1 - label;
      points.push({ x, y, label });
    }
  } else if (name === "xor") {
    // Exact symmetry makes the linear optimum uninformative. One straight
    // boundary cannot classify these opposite same-class quadrants perfectly.
    for (let i = 0; i < 10; i += 1) {
      const x = 0.28 + random() * 0.55;
      const y = 0.28 + random() * 0.55;
      points.push(
        { x, y, label: 1 },
        { x: -x, y: -y, label: 1 },
        { x, y: -y, label: 0 },
        { x: -x, y, label: 0 },
      );
    }
  } else throw new RangeError("Unknown preset.");
  return points;
}

export function decisionBoundary(model) {
  const [wx, wy] = model.weights;
  const points = [];
  function add(x, y) {
    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Math.abs(x) <= 1 + 1e-9 &&
      Math.abs(y) <= 1 + 1e-9 &&
      !points.some((point) => Math.hypot(point.x - x, point.y - y) < 1e-8)
    )
      points.push({
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      });
  }
  if (Math.abs(wy) > 1e-10)
    for (const x of [-1, 1]) add(x, -(wx * x + model.bias) / wy);
  if (Math.abs(wx) > 1e-10)
    for (const y of [-1, 1]) add(-(wy * y + model.bias) / wx, y);
  return points.length >= 2 ? [points[0], points[1]] : null;
}
