export type Algorithm = "astar" | "dijkstra";
export type PresetId = "gates" | "scatter" | "open" | "blocked";
export type Board = {
  columns: number;
  rows: number;
  start: number;
  goal: number;
  walls: number[];
};
export type SearchStep = {
  cell: number;
  cost: number;
  estimate: number;
  discovered: number[];
  frontier: number[];
};
export type SearchResult = {
  algorithm: Algorithm;
  found: boolean;
  path: number[];
  distance: number | null;
  steps: SearchStep[];
};
export const GRID_COLUMNS: number;
export const GRID_ROWS: number;
export const PRESETS: { id: PresetId; name: string }[];
export function createPreset(preset?: PresetId, seed?: number): Board;
export function manhattan(a: number, b: number, columns: number): number;
export function neighbors(
  cell: number,
  columns: number,
  rows: number,
): number[];
export function findPath(board: Board, algorithm?: Algorithm): SearchResult;
