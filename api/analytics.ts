import { collect } from "../server/analytics/handlers.mjs";

export const config = { runtime: "edge" };

export default function handler(request: Request): Promise<Response> {
  return collect(request, process.env);
}
