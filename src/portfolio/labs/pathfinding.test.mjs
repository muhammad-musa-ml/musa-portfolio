import test from "node:test";
import assert from "node:assert/strict";
import {
  createPreset,
  findPath,
  neighbors,
  manhattan,
} from "./pathfinding.mjs";

function assertValidPath(board, result) {
  if (!result.found) {
    assert.deepEqual(result.path, []);
    assert.equal(result.distance, null);
    return;
  }
  assert.equal(result.path[0], board.start);
  assert.equal(result.path.at(-1), board.goal);
  assert.equal(result.path.length - 1, result.distance);
  result.path.forEach((cell, index) => {
    assert.ok(!board.walls.includes(cell), "A route cannot cross a wall");
    assert.ok(cell >= 0 && cell < board.columns * board.rows);
    if (index)
      assert.equal(manhattan(result.path[index - 1], cell, board.columns), 1);
  });
}

function referenceDistance(board) {
  const queue = [[board.start, 0]],
    seen = new Set([board.start]);
  const blocked = new Set(board.walls);
  if (blocked.has(board.start) || blocked.has(board.goal)) return null;
  for (let head = 0; head < queue.length; head++) {
    const [cell, distance] = queue[head];
    if (cell === board.goal) return distance;
    const row = Math.floor(cell / board.columns),
      column = cell % board.columns;
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const r = row + dr,
        c = column + dc,
        next = r * board.columns + c;
      if (
        r >= 0 &&
        r < board.rows &&
        c >= 0 &&
        c < board.columns &&
        !blocked.has(next) &&
        !seen.has(next)
      ) {
        seen.add(next);
        queue.push([next, distance + 1]);
      }
    }
  }
  return null;
}

test("both algorithms find the known shortest route around a wall", () => {
  const board = { columns: 3, rows: 3, start: 0, goal: 8, walls: [1, 4] };
  for (const algorithm of ["astar", "dijkstra"]) {
    const result = findPath(board, algorithm);
    assert.equal(result.distance, 4);
    assert.deepEqual(result.path, [0, 3, 6, 7, 8]);
    assertValidPath(board, result);
  }
});

test("a full divider yields no path and explores only the reachable side", () => {
  const board = { columns: 4, rows: 3, start: 0, goal: 3, walls: [1, 5, 9] };
  for (const algorithm of ["astar", "dijkstra"]) {
    const result = findPath(board, algorithm);
    assert.equal(result.found, false);
    assert.deepEqual(
      new Set(result.steps.map((step) => step.cell)),
      new Set([0, 4, 8]),
    );
    assertValidPath(board, result);
  }
});

test("A* and Dijkstra agree with an independent BFS on seeded maps", () => {
  for (let seed = 1; seed <= 24; seed++) {
    let value = seed;
    const walls = [];
    for (let cell = 1; cell < 34; cell++) {
      value = (Math.imul(value, 1103515245) + 12345) >>> 0;
      if (value / 4294967296 < 0.28) walls.push(cell);
    }
    const board = { columns: 7, rows: 5, start: 0, goal: 34, walls };
    const expected = referenceDistance(board);
    for (const algorithm of ["astar", "dijkstra"]) {
      const result = findPath(board, algorithm);
      assert.equal(result.distance, expected, `seed ${seed}, ${algorithm}`);
      assertValidPath(board, result);
      const visited = new Set();
      for (const step of result.steps) {
        assert.ok(!visited.has(step.cell), "A cell is settled only once");
        assert.ok(!walls.includes(step.cell));
        visited.add(step.cell);
        assert.ok(
          step.frontier.every(
            (cell) => !visited.has(cell) && !walls.includes(cell),
          ),
        );
      }
    }
  }
});

test("presets are repeatable, and their promised solvability holds", () => {
  assert.deepEqual(createPreset("scatter", 173), createPreset("scatter", 173));
  assert.notDeepEqual(
    createPreset("scatter", 173).walls,
    createPreset("scatter", 174).walls,
  );
  for (const preset of ["gates", "scatter", "open", "blocked"]) {
    const board = createPreset(preset);
    const result = findPath(board);
    assert.equal(result.found, preset !== "blocked");
    assert.equal(result.distance, referenceDistance(board));
    assertValidPath(board, result);
    assert.deepEqual(result, findPath(board), "Tie-breaking is deterministic");
  }
});

test("A* explores fewer cells on the open preset without shortening the answer", () => {
  const board = createPreset("open");
  const astar = findPath(board, "astar"),
    dijkstra = findPath(board, "dijkstra");
  assert.equal(astar.distance, dijkstra.distance);
  assert.ok(astar.steps.length < dijkstra.steps.length);
});

test("neighbors do not wrap rows and a coincident start/goal has length zero", () => {
  assert.deepEqual(neighbors(2, 3, 3), [5, 1]);
  const result = findPath({
    columns: 1,
    rows: 1,
    start: 0,
    goal: 0,
    walls: [],
  });
  assert.equal(result.distance, 0);
  assert.deepEqual(result.path, [0]);
});

test("invalid dimensions and endpoints are rejected; blocked endpoints cannot be traversed", () => {
  assert.throws(
    () => findPath({ columns: 0, rows: 4, start: 0, goal: 1, walls: [] }),
    RangeError,
  );
  assert.throws(
    () => findPath({ columns: 3, rows: 3, start: 0, goal: 9, walls: [] }),
    RangeError,
  );
  assert.equal(
    findPath({ columns: 3, rows: 3, start: 0, goal: 8, walls: [8] }).found,
    false,
  );
});
