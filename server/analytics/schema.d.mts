export const LIMITS: {
  bodyBytes: number;
  batch: number;
  retentionDays: number;
  dailyEvents: number;
  sessionEvents: number;
  globalMinute: number;
  sessionMinute: number;
};
export const ACTIONS: readonly string[];
export const catalog: {
  paths: Record<string, string>;
  hashes: Record<string, string[]>;
  builds: string[];
  outbound: Record<string, { id: string; label: string }>;
  controls: Record<string, string>;
  topicControls: Record<string, string>;
  details: Record<string, string>;
};
export function normalizeDestination(value: unknown): string | null;
export function outboundTarget(value: string): string | null;
