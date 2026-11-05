export const GRID_COLUMNS = 18;
export const GRID_ROWS = 12;
export const PRESETS = [
  { id: "gates", name: "Alternating gates" },
  { id: "scatter", name: "Scattered obstacles" },
  { id: "open", name: "Open space" },
  { id: "blocked", name: "No way through" },
];

export function createPreset(preset = "gates", seed = 173) {
  const columns = GRID_COLUMNS,
    rows = GRID_ROWS;
  const start = 5 * columns + 1,
    goal = 6 * columns + 16;
  const walls = new Set();
  if (preset === "gates") {
    for (const [column, gate] of [
      [4, 1],
      [8, 10],
      [12, 1],
    ]) {
      for (let row = 0; row < rows; row++)
        if (row !== gate) walls.add(row * columns + column);
    }
  } else if (preset === "blocked") {
    for (let row = 0; row < rows; row++) walls.add(row * columns + 9);
  } else if (preset === "scatter") {
    let state = seed >>> 0;
    for (let cell = 0; cell < columns * rows; cell++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      if (state / 4294967296 < 0.27) walls.add(cell);
    }
    // Carve a guaranteed route so this preset is distinct from the impossible one.
    for (let column = 1; column <= 16; column++)
      walls.delete(5 * columns + column);
    walls.delete(goal);
  } else if (preset !== "open")
    throw new RangeError(`Unknown map preset: ${preset}`);
  walls.delete(start);
  walls.delete(goal);
  return {
    columns,
    rows,
    start,
    goal,
    walls: [...walls].sort((a, b) => a - b),
  };
}

export function manhattan(a, b, columns) {
  return (
    Math.abs((a % columns) - (b % columns)) +
    Math.abs(Math.floor(a / columns) - Math.floor(b / columns))
  );
}

export function neighbors(cell, columns, rows) {
  const row = Math.floor(cell / columns),
    column = cell % columns;
  const result = [];
  if (row > 0) result.push(cell - columns);
  if (column + 1 < columns) result.push(cell + 1);
  if (row + 1 < rows) result.push(cell + columns);
  if (column > 0) result.push(cell - 1);
  return result;
}

class MinHeap {
  items = [];
  before(a, b) {
    return (
      a.priority < b.priority ||
      (a.priority === b.priority &&
        (a.estimate < b.estimate ||
          (a.estimate === b.estimate && a.order < b.order)))
    );
  }
  push(item) {
    const items = this.items;
    let index = items.length;
    items.push(item);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!this.before(item, items[parent])) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = item;
  }
  pop() {
    const items = this.items;
    if (!items.length) return undefined;
    const first = items[0],
      last = items.pop();
    if (!items.length) return first;
    let index = 0;
    while (index * 2 + 1 < items.length) {
      let child = index * 2 + 1;
      if (
        child + 1 < items.length &&
        this.before(items[child + 1], items[child])
      )
        child++;
      if (!this.before(items[child], last)) break;
      items[index] = items[child];
      index = child;
    }
    items[index] = last;
    return first;
  }
}

function validate(board, algorithm) {
  const { columns, rows, start, goal } = board;
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 1 ||
    rows < 1 ||
    columns * rows > 10000
  )
    throw new RangeError("Use a positive grid of at most 10,000 cells.");
  if (
    ![start, goal].every(
      (cell) => Number.isInteger(cell) && cell >= 0 && cell < columns * rows,
    )
  )
    throw new RangeError("Start and goal must be valid grid cells.");
  if (
    !Array.isArray(board.walls) ||
    board.walls.some(
      (cell) => !Number.isInteger(cell) || cell < 0 || cell >= columns * rows,
    )
  )
    throw new RangeError("Every wall must be a valid grid cell.");
  if (algorithm !== "astar" && algorithm !== "dijkstra")
    throw new RangeError("Choose A* or Dijkstra.");
}

/** Uniform-cost, orthogonal search. The trace records settled cells, not elapsed time. */
export function findPath(board, algorithm = "astar") {
  validate(board, algorithm);
  const { columns, rows, start, goal } = board;
  const size = columns * rows;
  const walls = new Set(board.walls);
  const steps = [];
  if (walls.has(start) || walls.has(goal))
    return { algorithm, found: false, path: [], distance: null, steps };
  const distances = new Float64Array(size).fill(Infinity);
  const parents = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const frontier = new Set([start]);
  const heap = new MinHeap();
  let order = 0;
  const estimate = (cell) =>
    algorithm === "astar" ? manhattan(cell, goal, columns) : 0;
  distances[start] = 0;
  heap.push({
    cell: start,
    cost: 0,
    priority: estimate(start),
    estimate: estimate(start),
    order: order++,
  });

  while (heap.items.length) {
    const current = heap.pop();
    if (closed[current.cell] || current.cost !== distances[current.cell])
      continue;
    closed[current.cell] = 1;
    frontier.delete(current.cell);
    const discovered = [];
    if (current.cell !== goal) {
      for (const neighbor of neighbors(current.cell, columns, rows)) {
        if (walls.has(neighbor) || closed[neighbor]) continue;
        const nextCost = current.cost + 1;
        if (nextCost >= distances[neighbor]) continue;
        distances[neighbor] = nextCost;
        parents[neighbor] = current.cell;
        frontier.add(neighbor);
        discovered.push(neighbor);
        const h = estimate(neighbor);
        heap.push({
          cell: neighbor,
          cost: nextCost,
          priority: nextCost + h,
          estimate: h,
          order: order++,
        });
      }
    }
    steps.push({
      cell: current.cell,
      cost: current.cost,
      estimate: estimate(current.cell),
      discovered,
      frontier: [...frontier].sort((a, b) => a - b),
    });
    if (current.cell === goal) {
      const path = [];
      for (let cell = goal; cell !== -1; cell = parents[cell]) path.push(cell);
      path.reverse();
      return { algorithm, found: true, path, distance: distances[goal], steps };
    }
  }
  return { algorithm, found: false, path: [], distance: null, steps };
}
