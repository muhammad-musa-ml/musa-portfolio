export type PlannerDownload = { requestId: string; filename: 'kaiju-board.json' | 'kaiju-plan.json'; json: string };
export function validatePlannerDownload(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, expectedOrigin: string, frameSource: MessageEventSource | null): PlannerDownload | null;
export function startPlannerDownload(download: PlannerDownload, documentImpl?: Document, urlImpl?: typeof URL): string;
