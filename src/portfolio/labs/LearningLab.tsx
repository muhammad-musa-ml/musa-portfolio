import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  createPreset,
  decisionBoundary,
  evaluate,
  initialModel,
  predictProbability,
  trainStep,
  type Model,
  type Point,
  type PresetName,
} from "./learning.mjs";
import "./learning.css";

const FRAME = { x: 40, y: 30, width: 640, height: 440 };
const MAX_POINTS = 180;
const PRESETS: { id: PresetName; name: string; note: string }[] = [
  {
    id: "separable",
    name: "Separable",
    note: "A line is enough here. Train the model, then place a point on the wrong side and watch the compromise change.",
  },
  {
    id: "noisy",
    name: "Noisy",
    note: "Some labels disagree with their neighbors. A lower loss does not guarantee a perfect split, and training accuracy is not performance on unseen data.",
  },
  {
    id: "xor",
    name: "XOR",
    note: "Opposite corners share a class. One straight line cannot separate them perfectly. In this symmetric preset, the best logistic fit stays at 50/50. More steps will not fix the model’s missing capacity.",
  },
];
type TracePoint = { step: number; value: number };
type Training = { model: Model; trace: TracePoint[] };
const sx = (x: number) => FRAME.x + ((x + 1) / 2) * FRAME.width;
const sy = (y: number) => FRAME.y + ((1 - y) / 2) * FRAME.height;
const coordinate = (value: number) =>
  Math.max(-1, Math.min(1, Math.round(value * 100) / 100));
const signed = (value: number) =>
  `${value < 0 ? "−" : "+"} ${Math.abs(value).toFixed(2)}`;

function freshTraining(points: Point[], l2: number): Training {
  const model = initialModel();
  const value = evaluate(model, points, l2).objective;
  return { model, trace: value === null ? [] : [{ step: 0, value }] };
}

function advance(
  previous: Training,
  points: Point[],
  rate: number,
  l2: number,
  count: number,
): Training {
  let model = previous.model;
  for (let index = 0; index < count; index += 1)
    model = trainStep(model, points, rate, l2);
  if (count === 0) return previous;
  const trace = [
    ...previous.trace,
    { step: model.steps, value: evaluate(model, points, l2).objective! },
  ];
  // Preserve the full run's time scale without growing the chart indefinitely.
  return {
    model,
    trace:
      trace.length > 512
        ? trace.filter(
            (_, index) => index % 2 === 0 || index === trace.length - 1,
          )
        : trace,
  };
}

function LossChart({ trace }: { trace: TracePoint[] }) {
  const maximum = Math.max(0.01, ...trace.map((point) => point.value)) * 1.08;
  const lastStep = Math.max(1, trace[trace.length - 1]?.step ?? 1);
  const path = trace
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${36 + (point.step / lastStep) * 290},${69 - (point.value / maximum) * 57}`,
    )
    .join(" ");
  const last = trace[trace.length - 1];
  return (
    <svg
      className="pf-learning-loss"
      viewBox="0 0 340 96"
      role="img"
      aria-label={
        trace.length
          ? `Training objective, from ${trace[0].value.toFixed(3)} to ${last!.value.toFixed(3)} over ${last!.step} steps.`
          : "Add points to begin the loss chart."
      }
    >
      <path d="M36 12V69H326" className="pf-learning-chart-axis" />
      <path d="M36 40H326" className="pf-learning-chart-guide" />
      <text x="29" y="16" textAnchor="end">
        {maximum.toFixed(2)}
      </text>
      <text x="29" y="73" textAnchor="end">
        0
      </text>
      <text x="36" y="89">
        0
      </text>
      <text x="326" y="89" textAnchor="end">
        {last?.step ?? 0} steps
      </text>
      {path && <path d={path} className="pf-learning-chart-line" />}
      {last && (
        <circle
          cx={36 + (last.step / lastStep) * 290}
          cy={69 - (last.value / maximum) * 57}
          r="3"
          className="pf-learning-chart-dot"
        />
      )}
    </svg>
  );
}

export default function LearningLab() {
  const id = useId().replace(/:/g, "");
  const [points, setPoints] = useState<Point[]>(() =>
    createPreset("separable"),
  );
  const [preset, setPreset] = useState<PresetName | "custom">("separable");
  const [training, setTraining] = useState<Training>(() =>
    freshTraining(points, 0),
  );
  const [running, setRunning] = useState(false);
  const [rate, setRate] = useState(0.3);
  const [l2, setL2] = useState(0);
  const [label, setLabel] = useState<0 | 1>(0);
  const [xInput, setXInput] = useState("0.00");
  const [yInput, setYInput] = useState("0.00");
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [plotFocused, setPlotFocused] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [status, setStatus] = useState(
    "Start with the prepared data, or add a few points of your own.",
  );
  const target = useRef(0);
  const runVersion = useRef(0);
  const svg = useRef<SVGSVGElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const metrics = useMemo(
    () => evaluate(training.model, points, l2),
    [training.model, points, l2],
  );
  const boundary = useMemo(
    () => decisionBoundary(training.model),
    [training.model],
  );
  const classCounts = [
    points.filter((point) => point.label === 0).length,
    points.filter((point) => point.label === 1).length,
  ];

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        stopTraining();
        setStatus("Training is paused while this tab is hidden.");
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  useEffect(() => {
    if (!running || points.length === 0) return;
    const version = runVersion.current;
    const timer = window.setInterval(
      () => {
        if (runVersion.current !== version) return;
        setTraining((previous) =>
          runVersion.current === version
            ? advance(
                previous,
                points,
                rate,
                l2,
                Math.max(
                  0,
                  Math.min(
                    reducedMotion ? 10 : 5,
                    target.current - previous.model.steps,
                  ),
                ),
              )
            : previous,
        );
      },
      reducedMotion ? 250 : 120,
    );
    return () => {
      runVersion.current += 1;
      window.clearInterval(timer);
    };
  }, [running, points, rate, l2, reducedMotion]);

  useEffect(() => {
    if (running && training.model.steps >= target.current) {
      stopTraining();
      setStatus(
        `Paused at ${training.model.steps} steps. Inspect the result, change the data, or train another 500 steps.`,
      );
    }
  }, [running, training.model.steps]);

  const shading = useMemo(() => {
    const dx = (training.model.weights[0] * 2) / FRAME.width;
    const dy = (-training.model.weights[1] * 2) / FRAME.height;
    const length = Math.hypot(dx, dy);
    const ux = length > 1e-12 ? dx / length : 1;
    const uy = length > 1e-12 ? dy / length : 0;
    const half = Math.hypot(FRAME.width, FRAME.height) / 2;
    const x1 = FRAME.x + FRAME.width / 2 - ux * half;
    const y1 = FRAME.y + FRAME.height / 2 - uy * half;
    const x2 = FRAME.x + FRAME.width / 2 + ux * half;
    const y2 = FRAME.y + FRAME.height / 2 + uy * half;
    const stops = Array.from({ length: 41 }, (_, index) => {
      const fraction = index / 40;
      const point = {
        x: ((x1 + (x2 - x1) * fraction - FRAME.x) / FRAME.width) * 2 - 1,
        y: 1 - ((y1 + (y2 - y1) * fraction - FRAME.y) / FRAME.height) * 2,
      };
      const probability = predictProbability(training.model, point);
      return { fraction, probability };
    });
    return { x1, y1, x2, y2, stops };
  }, [training.model]);

  function stopTraining() {
    // Invalidate queued updates immediately, before passive effect cleanup.
    runVersion.current += 1;
    setRunning(false);
  }

  function replaceData(
    next: Point[],
    message: string,
    nextPreset: PresetName | "custom" = "custom",
  ) {
    stopTraining();
    setPoints(next);
    setPreset(nextPreset);
    setTraining(freshTraining(next, l2));
    setStatus(message);
  }

  function moveCursor(x: number, y: number) {
    const next = { x: coordinate(x), y: coordinate(y) };
    setCursor(next);
    setXInput(next.x.toFixed(2));
    setYInput(next.y.toFixed(2));
    return next;
  }

  function addPoint(x: number, y: number) {
    if (points.length >= MAX_POINTS) {
      setStatus(
        `The plane holds ${MAX_POINTS} points. Remove one before adding another.`,
      );
      return;
    }
    const next = moveCursor(x, y);
    replaceData(
      [...points, { ...next, label }],
      `Added class ${label === 0 ? "A" : "B"} at (${next.x.toFixed(2)}, ${next.y.toFixed(2)}). Learning restarted for the changed data.`,
    );
  }

  function plotPointer(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (
      !start ||
      event.button !== 0 ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 ||
      !svg.current
    )
      return;
    const rect = svg.current.getBoundingClientRect();
    const x =
      ((((event.clientX - rect.left) / rect.width) * 720 - FRAME.x) /
        FRAME.width) *
        2 -
      1;
    const y =
      1 -
      ((((event.clientY - rect.top) / rect.height) * 520 - FRAME.y) /
        FRAME.height) *
        2;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) return;
    plane.current?.focus({ preventScroll: true });
    addPoint(x, y);
  }

  function plotKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.1 : 0.05;
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      const next = moveCursor(
        cursor.x +
          (event.key === "ArrowRight"
            ? step
            : event.key === "ArrowLeft"
              ? -step
              : 0),
        cursor.y +
          (event.key === "ArrowUp"
            ? step
            : event.key === "ArrowDown"
              ? -step
              : 0),
      );
      setStatus(
        `Placement cursor: x ${next.x.toFixed(2)}, y ${next.y.toFixed(2)}. Press Enter to add class ${label === 0 ? "A" : "B"}.`,
      );
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addPoint(cursor.x, cursor.y);
    }
  }

  function submitPoint(event: FormEvent) {
    event.preventDefault();
    const x = Number(xInput);
    const y = Number(yInput);
    if (
      !xInput.trim() ||
      !yInput.trim() ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      Math.abs(x) > 1 ||
      Math.abs(y) > 1
    ) {
      setStatus("Enter an x and y between −1 and 1.");
      return;
    }
    addPoint(x, y);
  }

  function toggleTraining() {
    if (running) {
      stopTraining();
      setStatus(`Paused at ${training.model.steps} steps.`);
      return;
    }
    target.current = training.model.steps + 500;
    setRunning(true);
    setStatus(
      "Training on all visible points. This run pauses automatically after 500 more steps.",
    );
  }

  const trainingActions = (
    <div className="pf-learning-train-actions">
      <button
        className="pf-learning-train"
        type="button"
        disabled={!points.length}
        onClick={toggleTraining}
      >
        <span aria-hidden="true">{running ? "Ⅱ" : "▷"}</span>
        {running ? "Pause" : "Train"}
      </button>
      <button
        type="button"
        disabled={running || !points.length}
        onClick={() => {
          setTraining((previous) => advance(previous, points, rate, l2, 1));
          setStatus("Applied one full-batch gradient step.");
        }}
      >
        Step
      </button>
      <button
        type="button"
        disabled={training.model.steps === 0 && !running}
        onClick={() => {
          stopTraining();
          setTraining(freshTraining(points, l2));
          setStatus("Weights reset. Your points and settings are unchanged.");
        }}
      >
        Reset fit
      </button>
    </div>
  );

  return (
    <section
      className="pf-learning"
      aria-label="Interactive logistic regression lab"
    >
      <header className="pf-learning-top">
        <span>
          <i aria-hidden="true" />A small learning machine
        </span>
        <span>Browser simulation · points stay on your device</span>
      </header>
      <div className="pf-learning-layout">
        <div className="pf-learning-stage">
          <div className="pf-learning-plane-top">
            <span>Two features. One boundary.</span>
            <span>
              {points.length} / {MAX_POINTS} points
            </span>
          </div>
          <div className="pf-learning-toolbar">
            {trainingActions}
            <span>
              {running ? "Learning from every point" : "Ready when you are"}
            </span>
          </div>
          <div
            className="pf-learning-plane"
            ref={plane}
            tabIndex={0}
            role="group"
            aria-label="Point placement plane"
            aria-describedby={`${id}-placement-help ${id}-status`}
            onFocus={() => setPlotFocused(true)}
            onBlur={() => setPlotFocused(false)}
            onKeyDown={plotKeyboard}
            onPointerDown={(event) => {
              if (event.button === 0)
                pointerStart.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={plotPointer}
            onPointerCancel={() => {
              pointerStart.current = null;
            }}
          >
            <svg
              ref={svg}
              className="pf-learning-scatter"
              viewBox="0 0 720 520"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={`${id}-clip`}>
                  <rect
                    x={FRAME.x}
                    y={FRAME.y}
                    width={FRAME.width}
                    height={FRAME.height}
                    rx="12"
                  />
                </clipPath>
                <linearGradient
                  id={`${id}-probability`}
                  gradientUnits="userSpaceOnUse"
                  x1={shading.x1}
                  y1={shading.y1}
                  x2={shading.x2}
                  y2={shading.y2}
                >
                  {shading.stops.map((stop) => (
                    <stop
                      key={stop.fraction}
                      offset={stop.fraction}
                      stopColor={
                        stop.probability >= 0.5
                          ? "var(--pf-teal)"
                          : "var(--pf-accent)"
                      }
                      stopOpacity={Math.abs(stop.probability - 0.5) * 0.5}
                    />
                  ))}
                </linearGradient>
              </defs>
              <rect
                className="pf-learning-field"
                x={FRAME.x}
                y={FRAME.y}
                width={FRAME.width}
                height={FRAME.height}
                rx="12"
              />
              <g clipPath={`url(#${id}-clip)`}>
                <rect
                  x={FRAME.x}
                  y={FRAME.y}
                  width={FRAME.width}
                  height={FRAME.height}
                  fill={`url(#${id}-probability)`}
                />
                {[-1, -0.5, 0, 0.5, 1].map((value) => (
                  <g
                    key={value}
                    className={
                      value === 0
                        ? "pf-learning-grid pf-learning-grid-major"
                        : "pf-learning-grid"
                    }
                  >
                    <path
                      d={`M${sx(value)} ${FRAME.y}V${FRAME.y + FRAME.height}`}
                    />
                    <path
                      d={`M${FRAME.x} ${sy(value)}H${FRAME.x + FRAME.width}`}
                    />
                  </g>
                ))}
                {boundary && (
                  <line
                    className="pf-learning-boundary"
                    x1={sx(boundary[0].x)}
                    y1={sy(boundary[0].y)}
                    x2={sx(boundary[1].x)}
                    y2={sy(boundary[1].y)}
                  />
                )}
                {points.map((point, index) => (
                  <g
                    key={index}
                    className={
                      point.label === 0
                        ? "pf-learning-class-a"
                        : "pf-learning-class-b"
                    }
                  >
                    {showMistakes &&
                      (predictProbability(training.model, point) >= 0.5
                        ? 1
                        : 0) !== point.label && (
                        <circle
                          className="pf-learning-mistake"
                          cx={sx(point.x)}
                          cy={sy(point.y)}
                          r="10"
                        />
                      )}
                    {point.label === 0 ? (
                      <circle
                        className="pf-learning-point"
                        cx={sx(point.x)}
                        cy={sy(point.y)}
                        r="5.3"
                      />
                    ) : (
                      <rect
                        className="pf-learning-point"
                        x={sx(point.x) - 4.4}
                        y={sy(point.y) - 4.4}
                        width="8.8"
                        height="8.8"
                        rx="1"
                        transform={`rotate(45 ${sx(point.x)} ${sy(point.y)})`}
                      />
                    )}
                  </g>
                ))}
                {plotFocused && (
                  <g
                    className={`pf-learning-crosshair ${label === 0 ? "pf-learning-class-a" : "pf-learning-class-b"}`}
                  >
                    <circle cx={sx(cursor.x)} cy={sy(cursor.y)} r="14" />
                    <path
                      d={`M${sx(cursor.x) - 22} ${sy(cursor.y)}h12m20 0h12M${sx(cursor.x)} ${sy(cursor.y) - 22}v12m0 20v12`}
                    />
                  </g>
                )}
              </g>
              {[-1, 0, 1].map((value) => (
                <g key={value} className="pf-learning-axis-label">
                  <text x={sx(value)} y="493" textAnchor="middle">
                    {value}
                  </text>
                  <text x="24" y={sy(value) + 4} textAnchor="end">
                    {value}
                  </text>
                </g>
              ))}
              <text
                className="pf-learning-axis-name"
                x="360"
                y="516"
                textAnchor="middle"
              >
                feature x
              </text>
              <text className="pf-learning-axis-name" x="42" y="18">
                feature y
              </text>
              {training.model.steps === 0 && points.length > 0 && (
                <text
                  className="pf-learning-plot-note"
                  x="664"
                  y="52"
                  textAnchor="end"
                >
                  Press train to fit a line
                </text>
              )}
              {points.length === 0 && (
                <text
                  className="pf-learning-plot-note"
                  x="360"
                  y="250"
                  textAnchor="middle"
                >
                  Place your first point.
                </text>
              )}
            </svg>
          </div>
          <div className="pf-learning-legend">
            <span className="pf-learning-class-a">
              <i />A · {classCounts[0]}
            </span>
            <span className="pf-learning-class-b">
              <i />B · {classCounts[1]}
            </span>
            <span>
              <b />
              50/50 boundary
            </span>
            <label>
              <input
                type="checkbox"
                checked={showMistakes}
                onChange={(event) => setShowMistakes(event.target.checked)}
              />
              Mark mistakes
            </label>
          </div>
          {points.length > 0 && classCounts.some((count) => count === 0) && (
            <p className="pf-learning-one-class">
              Only one class is present. The model can learn to predict that
              class everywhere; high accuracy here would not demonstrate a
              useful separation. Add the other class to compare.
            </p>
          )}
          <div className="pf-learning-metrics" aria-live="off">
            <div>
              <span>Training accuracy</span>
              <strong>
                {metrics.accuracy === null
                  ? "—"
                  : `${(metrics.accuracy * 100).toFixed(1)}%`}
              </strong>
              <small>
                {metrics.count
                  ? `${metrics.correct} of ${metrics.count} visible points`
                  : "Add points to measure"}
              </small>
            </div>
            <div>
              <span>BCE loss</span>
              <strong>
                {metrics.loss === null ? "—" : metrics.loss.toFixed(3)}
              </strong>
              <small>Lower is better fit</small>
            </div>
            <div>
              <span>Gradient steps</span>
              <strong>{training.model.steps.toLocaleString()}</strong>
              <small>Full-batch updates</small>
            </div>
          </div>
          <div className="pf-learning-reading">
            <div>
              <span>The current model</span>
              <code>
                p(B) = σ({training.model.weights[0].toFixed(2)}x{" "}
                {signed(training.model.weights[1])}y{" "}
                {signed(training.model.bias)})
              </code>
              <p>
                The shade shows predicted probability. Stronger color means
                greater confidence, not guaranteed correctness.
              </p>
            </div>
            <div className="pf-learning-curve">
              <span>
                Objective over steps <small>BCE + L2 penalty</small>
              </span>
              <LossChart trace={training.trace} />
            </div>
          </div>
        </div>

        <aside className="pf-learning-controls" aria-label="Learning controls">
          <div className="pf-learning-control-section">
            <div className="pf-learning-control-heading">
              <span>01</span>
              <h2>Choose the problem</h2>
            </div>
            <div className="pf-learning-presets" aria-label="Dataset presets">
              {PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={preset === item.id}
                  onClick={() =>
                    replaceData(
                      createPreset(item.id),
                      `${item.name} preset loaded. The model is reset.`,
                      item.id,
                    )
                  }
                >
                  {item.name}
                </button>
              ))}
            </div>
            <p
              className={`pf-learning-preset-note ${preset === "xor" ? "is-limit" : ""}`}
            >
              {PRESETS.find((item) => item.id === preset)?.note ??
                "Your data, your experiment. Changing points resets the model and loss trace, so the run describes one dataset."}
            </p>
          </div>
          <div className="pf-learning-control-section">
            <div className="pf-learning-control-heading">
              <span>02</span>
              <h2>Give it examples</h2>
            </div>
            <fieldset className="pf-learning-brush">
              <legend>Class to place</legend>
              {([0, 1] as const).map((value) => (
                <label
                  key={value}
                  className={`${value === 0 ? "pf-learning-class-a" : "pf-learning-class-b"} ${label === value ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={`${id}-class`}
                    value={value}
                    checked={label === value}
                    onChange={() => setLabel(value)}
                  />
                  <i aria-hidden="true" />
                  {value === 0 ? "A · Amber" : "B · Teal"}
                </label>
              ))}
            </fieldset>
            <p id={`${id}-placement-help`} className="pf-learning-help">
              Tap the plane to place a point. With the plane focused, use arrow
              keys to move and Enter to place. Or enter coordinates below.
            </p>
            <form className="pf-learning-point-form" onSubmit={submitPoint}>
              <label>
                x
                <input
                  aria-label="Point x coordinate"
                  type="number"
                  min="-1"
                  max="1"
                  step="0.01"
                  required
                  value={xInput}
                  onChange={(event) => setXInput(event.target.value)}
                />
              </label>
              <label>
                y
                <input
                  aria-label="Point y coordinate"
                  type="number"
                  min="-1"
                  max="1"
                  step="0.01"
                  required
                  value={yInput}
                  onChange={(event) => setYInput(event.target.value)}
                />
              </label>
              <button type="submit" disabled={points.length >= MAX_POINTS}>
                Add point <span aria-hidden="true">+</span>
              </button>
            </form>
            <div className="pf-learning-data-actions">
              <button
                type="button"
                disabled={!points.length}
                onClick={() =>
                  replaceData(
                    points.slice(0, -1),
                    "Removed the last point. Learning restarted.",
                  )
                }
              >
                Remove last
              </button>
              <button
                type="button"
                disabled={!points.length}
                onClick={() =>
                  replaceData(
                    [],
                    "Plane cleared. Add points of both classes to build a new problem.",
                  )
                }
              >
                Clear plane
              </button>
            </div>
          </div>
          <div className="pf-learning-control-section">
            <div className="pf-learning-control-heading">
              <span>03</span>
              <h2>Let it learn</h2>
            </div>
            <label className="pf-learning-slider" htmlFor={`${id}-rate`}>
              <span>
                Learning rate <output>{rate.toFixed(2)}</output>
              </span>
              <input
                id={`${id}-rate`}
                type="range"
                min="0.05"
                max="1.5"
                step="0.05"
                value={rate}
                onChange={(event) => setRate(Number(event.target.value))}
              />
              <small>How far each update moves.</small>
            </label>
            <label className="pf-learning-slider" htmlFor={`${id}-l2`}>
              <span>
                L2 regularization <output>{l2.toFixed(3)}</output>
              </span>
              <input
                id={`${id}-l2`}
                type="range"
                min="0"
                max="0.2"
                step="0.005"
                value={l2}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setL2(value);
                  stopTraining();
                  setTraining(freshTraining(points, value));
                  setStatus(
                    "Regularization changed. The model and objective trace are reset.",
                  );
                }}
              />
              <small>
                Penalizes large weights. Changing it resets the fit.
              </small>
            </label>
            <p className="pf-learning-help">
              Use Train beside the plot to start. One run = up to 500 steps.
              Pause at any time. All computation stays in this browser.
            </p>
          </div>
        </aside>
      </div>
      <div
        className="pf-learning-status"
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <i className={running ? "is-running" : ""} aria-hidden="true" />
        <span>{status}</span>
      </div>
      <footer className="pf-learning-footnote">
        <span>What this is</span>
        <p>
          A real logistic regression fitted to the visible points using
          full-batch gradient descent. It has two weights, one bias and a
          straight decision boundary. Accuracy is measured on the same points
          used for training; there is no held-out test set. The presets are
          seeded, synthetic examples. At exactly 50/50, predictions choose class
          B.
        </p>
      </footer>
    </section>
  );
}
