import test from "node:test";
import assert from "node:assert/strict";
import {
  initialModel,
  sigmoid,
  evaluate,
  gradient,
  trainStep,
  createPreset,
  decisionBoundary,
} from "./learning.mjs";

test("analytic regularized gradient agrees with a central finite difference", () => {
  const points = createPreset("noisy", 11);
  const model = { weights: [0.73, -0.42], bias: 0.19, steps: 0 };
  const analytic = gradient(model, points, 0.07);
  const epsilon = 1e-5;
  for (let index = 0; index < 3; index += 1) {
    const lower = structuredClone(model);
    const upper = structuredClone(model);
    if (index < 2) {
      lower.weights[index] -= epsilon;
      upper.weights[index] += epsilon;
    } else {
      lower.bias -= epsilon;
      upper.bias += epsilon;
    }
    const numeric =
      (evaluate(upper, points, 0.07).objective -
        evaluate(lower, points, 0.07).objective) /
      (2 * epsilon);
    assert.ok(
      Math.abs(
        numeric - (index < 2 ? analytic.weights[index] : analytic.bias),
      ) < 1e-7,
    );
  }
});

test("actual gradient descent decreases separable loss and learns correct labels", () => {
  const points = createPreset("separable");
  const start = initialModel();
  let model = start;
  let previous = evaluate(model, points).loss;
  for (let step = 0; step < 300; step += 1) {
    model = trainStep(model, points, 0.5);
    const metrics = evaluate(model, points);
    assert.ok(metrics.loss <= previous + 1e-12);
    previous = metrics.loss;
  }
  assert.equal(evaluate(model, points).accuracy, 1);
  assert.ok(previous < 0.05);
  assert.deepEqual(
    start,
    initialModel(),
    "training must not mutate the prior model",
  );
  assert.equal(model.steps, 300);
});

test("stable sigmoid and logit loss remain finite for confident mistakes", () => {
  assert.equal(sigmoid(1000), 1);
  assert.equal(sigmoid(-1000), 0);
  const model = { weights: [1000, -1000], bias: 1000, steps: 0 };
  const points = [
    { x: 1, y: -1, label: 0 },
    { x: -1, y: 1, label: 1 },
  ];
  const metrics = evaluate(model, points);
  assert.ok(Number.isFinite(metrics.loss));
  assert.equal(metrics.loss, 2000);
  assert.ok(gradient(model, points).weights.every(Number.isFinite));
});

test("symmetric XOR exposes the linear limitation rather than fake learning", () => {
  const points = createPreset("xor");
  let model = initialModel();
  for (let index = 0; index < 200; index += 1)
    model = trainStep(model, points, 0.5);
  const metrics = evaluate(model, points);
  assert.ok(Math.abs(metrics.loss - Math.log(2)) < 1e-12);
  assert.equal(metrics.accuracy, 0.5);
  assert.ok(model.weights.every((value) => Math.abs(value) < 1e-12));
});

test("the strongest UI regularization and rate still optimize the displayed objective", () => {
  const points = createPreset("noisy");
  let model = initialModel();
  let previous = evaluate(model, points, 0.2).objective;
  for (let index = 0; index < 150; index += 1) {
    model = trainStep(model, points, 1.5, 0.2);
    const metrics = evaluate(model, points, 0.2);
    assert.ok(metrics.objective <= previous + 1e-12);
    assert.ok(metrics.objective >= metrics.loss);
    previous = metrics.objective;
  }
});

test("one-class data learns a trivial predictor without claiming a separation", () => {
  const points = [{ x: 0, y: 0, label: 0 }];
  const model = trainStep(initialModel(), points);
  assert.equal(evaluate(model, points).accuracy, 1);
  assert.equal(decisionBoundary(model), null);
  assert.ok(model.bias < 0);
});

test("presets are deterministic, bounded and contain both classes", () => {
  for (const preset of ["separable", "noisy", "xor"]) {
    const first = createPreset(preset, 123);
    assert.deepEqual(first, createPreset(preset, 123));
    assert.notDeepEqual(first, createPreset(preset, 124));
    assert.equal(new Set(first.map((point) => point.label)).size, 2);
    assert.ok(
      first.every((point) => Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1),
    );
  }
});

test("boundary is clipped to the plot and satisfies the zero-logit equation", () => {
  for (const model of [
    { weights: [1, 0], bias: 0.25 },
    { weights: [0, 1], bias: -0.5 },
    { weights: [1, 1], bias: 0 },
  ]) {
    const line = decisionBoundary({ ...model, steps: 0 });
    assert.equal(line.length, 2);
    for (const point of line) {
      assert.ok(Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1);
      assert.ok(
        Math.abs(
          model.weights[0] * point.x + model.weights[1] * point.y + model.bias,
        ) < 1e-12,
      );
    }
  }
  assert.equal(decisionBoundary(initialModel()), null);
  assert.equal(decisionBoundary({ weights: [1, 0], bias: 2, steps: 0 }), null);
});

test("empty and invalid data cannot silently produce a training result", () => {
  assert.equal(evaluate(initialModel(), []).loss, null);
  assert.equal(evaluate(initialModel(), []).accuracy, null);
  assert.throws(() => trainStep(initialModel(), []), /at least one point/);
  assert.throws(
    () => trainStep(initialModel(), createPreset("separable"), -1),
    /Learning rate/,
  );
  assert.throws(
    () => trainStep(initialModel(), [{ x: NaN, y: 0, label: 1 }]),
    /coordinates/,
  );
  assert.throws(
    () => evaluate(initialModel(), createPreset("separable"), -0.1),
    /L2/,
  );
});
