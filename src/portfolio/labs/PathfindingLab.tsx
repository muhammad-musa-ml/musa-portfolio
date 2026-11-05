import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  createPreset,
  findPath,
  PRESETS,
  type Algorithm,
  type Board,
  type PresetId,
  type SearchResult,
} from "./pathfinding.mjs";
import "./pathfinding.css";

type Tool = "wall" | "start" | "goal" | "erase";
type Paint = { pointer: number; action: "add" | "erase"; last: number };

export default function PathfindingLab() {
  const headingId = useId();
  const helpId = useId();
  const speedId = useId();
  const presetId = useId();
  const [board, setBoard] = useState<Board>(() => createPreset("gates"));
  const boardRef = useRef(board);
  const [preset, setPreset] = useState<PresetId | "custom">("gates");
  const [seed, setSeed] = useState(173);
  const [algorithm, setAlgorithm] = useState<Algorithm>("astar");
  const [tool, setTool] = useState<Tool>("wall");
  const [trace, setTrace] = useState<SearchResult | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(24);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [focusCell, setFocusCell] = useState(board.start);
  const [announcement, setAnnouncement] = useState(
    "Draw walls or move the endpoints. Then run a search.",
  );
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const grid = useRef<HTMLDivElement>(null);
  const painting = useRef<Paint | null>(null);
  const stepRef = useRef(visibleSteps);
  stepRef.current = visibleSteps;
  const walls = useMemo(() => new Set(board.walls), [board.walls]);
  const complete = trace !== null && visibleSteps >= trace.steps.length;
  const current = visibleSteps > 0 ? trace?.steps[visibleSteps - 1] : undefined;
  const visited = useMemo(
    () => new Set(trace?.steps.slice(0, visibleSteps).map((step) => step.cell)),
    [trace, visibleSteps],
  );
  const frontier = useMemo(() => new Set(current?.frontier), [current]);
  const path = useMemo(
    () => new Set(complete && trace?.found ? trace.path : []),
    [trace, complete],
  );
  const pathPoints =
    complete && trace?.found
      ? trace.path
          .map(
            (cell) =>
              `${(cell % board.columns) + 0.5},${Math.floor(cell / board.columns) + 0.5}`,
          )
          .join(" ")
      : "";

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReducedMotion(preference.matches);
      setRunning(false);
    };
    const visibility = () => {
      if (document.hidden) setRunning(false);
    };
    const releasePaint = () => {
      painting.current = null;
    };
    preference.addEventListener("change", change);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pointerup", releasePaint);
    window.addEventListener("pointercancel", releasePaint);
    window.addEventListener("blur", releasePaint);
    return () => {
      preference.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pointerup", releasePaint);
      window.removeEventListener("pointercancel", releasePaint);
      window.removeEventListener("blur", releasePaint);
    };
  }, []);

  useEffect(() => {
    if (!running || !trace) return;
    let frame = 0,
      last = 0,
      accumulated = 0;
    const tick = (now: number) => {
      if (last) accumulated += Math.min(now - last, 100);
      last = now;
      const advance = Math.floor((accumulated * speed) / 1000);
      if (advance > 0) {
        accumulated -= (advance * 1000) / speed;
        const next = Math.min(trace.steps.length, stepRef.current + advance);
        stepRef.current = next;
        setVisibleSteps(next);
        if (next >= trace.steps.length) {
          setRunning(false);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, speed, trace]);

  function resetSearch() {
    setRunning(false);
    setTrace(null);
    setVisibleSteps(0);
    stepRef.current = 0;
  }

  function loadPreset(nextPreset: PresetId, nextSeed = seed) {
    const next = createPreset(nextPreset, nextSeed);
    boardRef.current = next;
    setBoard(next);
    setPreset(nextPreset);
    setSeed(nextSeed);
    setFocusCell(next.start);
    resetSearch();
    setAnnouncement(
      `${PRESETS.find((item) => item.id === nextPreset)?.name} loaded. Ready to explore.`,
    );
  }

  function editCell(
    cell: number,
    action: "toggle" | "add" | "erase" = "toggle",
    chosenTool = tool,
  ) {
    const previous = boardRef.current;
    if (cell < 0 || cell >= previous.columns * previous.rows) return;
    const nextWalls = new Set(previous.walls);
    let next = { ...previous };
    if (chosenTool === "start" || chosenTool === "goal") {
      if (cell === (chosenTool === "start" ? previous.goal : previous.start)) {
        setAnnouncement("Keep the start and goal in separate cells.");
        return;
      }
      next[chosenTool] = cell;
      nextWalls.delete(cell);
    } else {
      if (cell === previous.start || cell === previous.goal) return;
      const erase =
        chosenTool === "erase" ||
        action === "erase" ||
        (action === "toggle" && nextWalls.has(cell));
      if (erase) nextWalls.delete(cell);
      else nextWalls.add(cell);
    }
    next = { ...next, walls: [...nextWalls].sort((a, b) => a - b) };
    boardRef.current = next;
    setBoard(next);
    setPreset("custom");
    resetSearch();
    setAnnouncement("Map changed. Run a new search to find the route.");
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, cell: number) {
    if (event.button !== 0) return;
    setFocusCell(cell);
    if (tool === "wall" || tool === "erase") {
      const action =
        tool === "erase" || boardRef.current.walls.includes(cell)
          ? "erase"
          : "add";
      painting.current = { pointer: event.pointerId, action, last: cell };
      event.currentTarget.setPointerCapture(event.pointerId);
      editCell(cell, action);
    } else editCell(cell);
  }

  function paintMove(event: PointerEvent<HTMLDivElement>) {
    const paint = painting.current;
    if (!paint || paint.pointer !== event.pointerId || !grid.current) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      painting.current = null;
      return;
    }
    const rect = grid.current.getBoundingClientRect();
    const column = Math.floor(
      ((event.clientX - rect.left) / rect.width) * board.columns,
    );
    const row = Math.floor(
      ((event.clientY - rect.top) / rect.height) * board.rows,
    );
    if (column < 0 || column >= board.columns || row < 0 || row >= board.rows)
      return;
    const cell = row * board.columns + column;
    if (cell !== paint.last) {
      const fromRow = Math.floor(paint.last / board.columns);
      const fromColumn = paint.last % board.columns;
      const distance = Math.max(
        Math.abs(row - fromRow),
        Math.abs(column - fromColumn),
      );
      paint.last = cell;
      for (let i = 1; i <= distance; i++) {
        const nextRow = Math.round(fromRow + ((row - fromRow) * i) / distance);
        const nextColumn = Math.round(
          fromColumn + ((column - fromColumn) * i) / distance,
        );
        editCell(
          nextRow * board.columns + nextColumn,
          paint.action,
          paint.action === "erase" ? "erase" : "wall",
        );
      }
    }
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>, cell: number) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const row = Math.floor(cell / board.columns),
      column = cell % board.columns;
    let next = cell;
    if (event.key === "ArrowRight")
      next = row * board.columns + Math.min(board.columns - 1, column + 1);
    else if (event.key === "ArrowLeft")
      next = row * board.columns + Math.max(0, column - 1);
    else if (event.key === "ArrowDown")
      next = Math.min(board.rows - 1, row + 1) * board.columns + column;
    else if (event.key === "ArrowUp")
      next = Math.max(0, row - 1) * board.columns + column;
    else if (event.key === "Home") next = row * board.columns;
    else if (event.key === "End")
      next = row * board.columns + board.columns - 1;
    else if (
      event.key.toLowerCase() === "s" ||
      event.key.toLowerCase() === "g"
    ) {
      event.preventDefault();
      editCell(
        cell,
        "toggle",
        event.key.toLowerCase() === "s" ? "start" : "goal",
      );
      return;
    } else return;
    event.preventDefault();
    setFocusCell(next);
    cells.current[next]?.focus();
  }

  function preparedTrace() {
    if (trace) return trace;
    const result = findPath(boardRef.current, algorithm);
    setTrace(result);
    return result;
  }

  function run() {
    if (running) {
      setRunning(false);
      return;
    }
    const result = preparedTrace();
    setAnnouncement("");
    if (reducedMotion) {
      setVisibleSteps(result.steps.length);
      stepRef.current = result.steps.length;
    } else {
      if (complete) {
        setVisibleSteps(0);
        stepRef.current = 0;
      }
      setRunning(result.steps.length > 0);
    }
  }

  function step() {
    const result = preparedTrace();
    const next = Math.min(result.steps.length, visibleSteps + 1);
    setAnnouncement("");
    setVisibleSteps(next);
    stepRef.current = next;
  }

  function clearWalls() {
    const next = { ...boardRef.current, walls: [] };
    boardRef.current = next;
    setBoard(next);
    setPreset("custom");
    resetSearch();
    setAnnouncement("Walls cleared. The endpoints stayed in place.");
  }

  const status = complete
    ? trace.found
      ? "Shortest route found"
      : "No route exists"
    : running
      ? "Exploring"
      : trace
        ? "Paused"
        : "Ready";
  const explanation = complete
    ? trace.found
      ? `${trace.distance} moves from start to goal. ${visibleSteps} cells explored. Change the algorithm to compare the same map.`
      : `All ${visibleSteps} reachable cells checked. Open a gap in the wall or move an endpoint to try again.`
    : announcement ||
      (running
        ? "The frontier holds discovered cells waiting to be explored."
        : "Step through the search or resume when you’re ready.");

  return (
    <section className="pf-route-lab" aria-labelledby={headingId}>
      <div className="pf-route-layout">
        <div className="pf-route-stage">
          <div className="pf-route-stage-bar">
            <h2 id={headingId}>The search space</h2>
            <span>
              {board.columns} × {board.rows} · {board.walls.length} walls
            </span>
          </div>
          <div className="pf-route-board">
            <div
              ref={grid}
              className="pf-route-grid"
              role="grid"
              aria-label="Editable route-finding grid"
              aria-describedby={helpId}
              aria-rowcount={board.rows}
              aria-colcount={board.columns}
              onPointerMove={paintMove}
              onPointerUp={() => {
                painting.current = null;
              }}
              onPointerCancel={() => {
                painting.current = null;
              }}
            >
              {Array.from({ length: board.rows }, (_, row) => (
                <div
                  role="row"
                  className="pf-route-row"
                  key={row}
                  style={{
                    gridTemplateColumns: `repeat(${board.columns}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: board.columns }, (_, column) => {
                    const cell = row * board.columns + column;
                    const label =
                      cell === board.start
                        ? "start"
                        : cell === board.goal
                          ? "goal"
                          : walls.has(cell)
                            ? "wall"
                            : path.has(cell)
                              ? "shortest route"
                              : current?.cell === cell
                                ? "current cell"
                                : visited.has(cell)
                                  ? "explored"
                                  : frontier.has(cell)
                                    ? "frontier"
                                    : "open";
                    return (
                      <button
                        key={cell}
                        ref={(element) => {
                          cells.current[cell] = element;
                        }}
                        type="button"
                        role="gridcell"
                        className={`pf-route-cell${walls.has(cell) ? " is-wall" : ""}${visited.has(cell) ? " is-visited" : ""}${frontier.has(cell) ? " is-frontier" : ""}${path.has(cell) ? " is-path" : ""}${current?.cell === cell && !complete ? " is-current" : ""}${cell === board.start ? " is-start" : ""}${cell === board.goal ? " is-goal" : ""}`}
                        aria-label={`Row ${row + 1}, column ${column + 1}: ${label}`}
                        aria-rowindex={row + 1}
                        aria-colindex={column + 1}
                        tabIndex={focusCell === cell ? 0 : -1}
                        onFocus={() => setFocusCell(cell)}
                        onPointerDown={(event) => pointerDown(event, cell)}
                        onClick={(event) => {
                          if (event.detail === 0) editCell(cell);
                        }}
                        onKeyDown={(event) => keyDown(event, cell)}
                      >
                        {cell === board.start
                          ? "S"
                          : cell === board.goal
                            ? "G"
                            : ""}
                      </button>
                    );
                  })}
                </div>
              ))}
              {pathPoints && (
                <svg
                  className="pf-route-path"
                  aria-hidden="true"
                  viewBox={`0 0 ${board.columns} ${board.rows}`}
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={pathPoints}
                    fill="none"
                    stroke="var(--pf-accent)"
                    strokeWidth="0.1"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
          </div>
          <div className="pf-route-legend" aria-label="Grid legend">
            <span>
              <i className="is-wall" />
              Wall
            </span>
            <span>
              <i className="is-visited" />
              Explored
            </span>
            <span>
              <i className="is-frontier" />
              Frontier
            </span>
            <span>
              <i className="is-path" />
              Route
            </span>
            <span>
              <b>S</b>Start
            </span>
            <span>
              <b>G</b>Goal
            </span>
          </div>
          <div
            className={`pf-route-result${complete && !trace.found ? " is-blocked" : ""}`}
            role="status"
            aria-live="polite"
          >
            <span className="pf-route-status-dot" aria-hidden="true" />
            <div>
              <strong>{status}</strong>
              <p>{explanation}</p>
            </div>
          </div>
        </div>

        <aside className="pf-route-controls" aria-label="Search controls">
          <div className="pf-route-control-group">
            <span className="pf-route-label">Algorithm</span>
            <div className="pf-route-algorithms">
              {(["astar", "dijkstra"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={algorithm === value}
                  onClick={() => {
                    setAlgorithm(value);
                    resetSearch();
                    setAnnouncement("Same map, a different search strategy.");
                  }}
                >
                  {value === "astar" ? "A*" : "Dijkstra"}
                </button>
              ))}
            </div>
          </div>
          <div className="pf-route-control-group">
            <label className="pf-route-label" htmlFor={presetId}>
              Map
            </label>
            <select
              id={presetId}
              className="pf-route-select"
              value={preset}
              onChange={(event) => loadPreset(event.target.value as PresetId)}
            >
              {preset === "custom" && (
                <option value="custom" disabled>
                  Custom map
                </option>
              )}
              {PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {preset === "scatter" && (
              <div className="pf-route-seed">
                <span>Seed {seed}</span>
                <button
                  type="button"
                  onClick={() => loadPreset("scatter", seed + 1)}
                >
                  New seed
                </button>
              </div>
            )}
          </div>
          <div className="pf-route-control-group">
            <span className="pf-route-label">Edit the map</span>
            <div className="pf-route-tools">
              {(
                [
                  { id: "wall", name: "Wall", icon: "▰" },
                  { id: "erase", name: "Erase", icon: "⌫" },
                  { id: "start", name: "Start", icon: "S" },
                  { id: "goal", name: "Goal", icon: "G" },
                ] as const
              ).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={tool === item.id}
                  onClick={() => setTool(item.id)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div className="pf-route-transport">
            <button type="button" className="pf-route-run" onClick={run}>
              {running
                ? "Pause"
                : reducedMotion
                  ? "Show result"
                  : complete
                    ? "Run again"
                    : trace
                      ? "Resume"
                      : "Run search"}
              <span aria-hidden="true">{running ? "Ⅱ" : "▷"}</span>
            </button>
            <div>
              <button
                type="button"
                onClick={step}
                disabled={running || complete}
              >
                Step
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSearch();
                  setAnnouncement("Search cleared. Your map is unchanged.");
                }}
                disabled={!trace}
              >
                Reset search
              </button>
            </div>
          </div>
          <div className="pf-route-speed">
            <label htmlFor={speedId}>
              Playback<span>{speed} cells / sec</span>
            </label>
            <input
              id={speedId}
              type="range"
              min="4"
              max="80"
              step="4"
              value={speed}
              disabled={reducedMotion}
              onChange={(event) => setSpeed(Number(event.target.value))}
              aria-valuetext={`${speed} explored cells per second`}
            />
          </div>
          <dl className="pf-route-metrics">
            <div>
              <dt>Explored</dt>
              <dd>{visibleSteps}</dd>
            </div>
            <div>
              <dt>Frontier</dt>
              <dd>{current?.frontier.length ?? 0}</dd>
            </div>
            <div>
              <dt>Moves</dt>
              <dd>{complete && trace.found ? trace.distance : "—"}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="pf-route-clear"
            onClick={clearWalls}
            disabled={board.walls.length === 0}
          >
            Clear all walls
          </button>
        </aside>
      </div>
      <div className="pf-route-understanding">
        <div>
          <h3>
            {algorithm === "astar"
              ? "A destination gives the search direction."
              : "Explore the nearest unknown first."}
          </h3>
          <p>
            {algorithm === "astar"
              ? "A* combines the distance traveled with Manhattan distance to the goal: horizontal moves plus vertical moves. On this grid, that estimate never overstates the distance still needed."
              : "Dijkstra chooses the cell with the lowest known distance from the start. Every move here costs one, so its exploration spreads outward in a wave."}{" "}
            Both find a shortest route when one exists.
          </p>
          <span className="pf-route-formula">
            {algorithm === "astar"
              ? "Priority = distance traveled + estimated distance left"
              : "Priority = distance traveled"}
            {current
              ? ` · ${algorithm === "astar" ? `${current.cost} + ${current.estimate} = ${current.cost + current.estimate}` : current.cost}`
              : ""}
          </span>
        </div>
        <details>
          <summary>How to use the grid</summary>
          <p id={helpId}>
            Choose a tool, then click or drag to edit. Start and Goal each move
            one endpoint. On a keyboard, Tab into the grid, use the arrow keys
            to move, and press Space to use your tool. S moves the start; G
            moves the goal. Editing a map resets its search.
          </p>
          <p>
            Four directions. One unit per move. No diagonal shortcuts. The
            counts describe this search, not a hardware-speed benchmark.
          </p>
          {reducedMotion && (
            <p>
              Reduced motion is on. Show result displays the final search
              immediately; Step still lets you inspect one cell at a time.
            </p>
          )}
        </details>
      </div>
    </section>
  );
}
