import { exportEvents } from "../server/analytics/handlers.mjs";

export const config = { runtime: "edge" };

export default function handler(request: Request): Promise<Response> {
  return exportEvents(request, process.env);
}
