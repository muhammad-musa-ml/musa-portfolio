import type { IncomingMessage, ServerResponse } from "node:http";
import { once } from "node:events";
import type { Plugin, ViteDevServer } from "vite";
import { createMusaiHandler } from "./musai/handler.mjs";

type Environment = Record<string, string | undefined>;
type WebHandler = (request: Request) => Promise<Response>;

/** Use the deployed handlers locally, including their actual streaming behavior. */
export function portfolioDevApi(env: Environment): Plugin {
  const chat = createMusaiHandler({ env });
  const install = (server: Pick<ViteDevServer, "middlewares">) => {
    server.middlewares.use(async (req, res, next) => {
      const path = (req.url ?? "").split("?")[0];
      if (!["/api/chat", "/api/analytics", "/api/analytics-export"].includes(path)) return next();
      const abort = new AbortController();
      const cancel = () => { if (!res.writableEnded) abort.abort(); };
      req.once("aborted", cancel);
      res.once("close", cancel);
      try {
        const request = await webRequest(req, abort.signal);
        let handler: WebHandler = chat;
        if (path !== "/api/chat") {
          // The local receiver is explicitly opt-in and can only be loopback.
          if (path === "/api/analytics" && env.ANALYTICS_DEV_RECEIVER) {
            const target = new URL("/api/collect", env.ANALYTICS_DEV_RECEIVER);
            if (target.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(target.hostname))
              throw new Error("Local analytics receiver must use loopback");
            handler = async (incoming) => {
              const proxyHeaders = new Headers(incoming.headers);
              proxyHeaders.delete("host");
              proxyHeaders.delete("content-length");
              return fetch(target, {
                method: incoming.method,
                headers: proxyHeaders,
                body: await incoming.text(),
                signal: incoming.signal,
                redirect: "error",
              });
            };
          } else {
            const analytics = await import("./analytics/handlers.mjs");
            handler = path === "/api/analytics"
              ? (incoming) => analytics.collect(incoming, env)
              : (incoming) => analytics.exportEvents(incoming, env);
          }
        }
        await writeResponse(await handler(request), res, abort.signal);
      } catch {
        if (!res.headersSent && !abort.signal.aborted) {
          res.writeHead(502, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify({ error: { code: "unavailable", message: "The local service could not respond." } }));
        } else if (!res.writableEnded) res.end();
      } finally {
        req.off("aborted", cancel);
        res.off("close", cancel);
      }
    });
  };
  return {
    name: "portfolio-dev-api",
    configureServer: install,
    configurePreviewServer: install,
  };
}

async function webRequest(req: IncomingMessage, signal: AbortSignal): Promise<Request> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32_000) throw new Error("Request exceeds the local API limit");
    chunks.push(Buffer.from(chunk));
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(name, value.join(", "));
    else if (value !== undefined) headers.set(name, value);
  }
  return new Request(`http://${req.headers.host || "127.0.0.1:5174"}${req.url}`, {
    method: req.method,
    headers,
    ...(chunks.length ? { body: Buffer.concat(chunks).toString("utf8") } : {}),
    signal,
  });
}

async function writeResponse(response: Response, res: ServerResponse, signal: AbortSignal) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.flushHeaders();
  if (!response.body) return res.end();
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) await once(res, "drain", { signal });
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
    if (!res.writableEnded) res.end();
  }
}
