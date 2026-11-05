import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { collect } from "../server/analytics/handlers.mjs";
import { createLocalStore } from "../server/analytics/local-store.mjs";
import { dateRange } from "../server/analytics/redis.mjs";
import { summarize } from "../server/analytics/report.mjs";

const root = new URL("../", import.meta.url);
const fileEnv = {};
try {
  const text = await readFile(new URL(".env.local", root), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/,
    );
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    fileEnv[match[1]] = value;
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const env = { ...fileEnv, ...process.env };
const arg = (name, fallback) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3) || fallback;
const mode = arg("mode", "live");
const port = Number(arg("port", "5180"));
if (
  !["live", "local"].includes(mode) ||
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535
)
  throw new Error(
    "Usage: node scripts/analytics-dashboard.mjs [--mode=live|local] [--port=5180]",
  );
const origin = `http://127.0.0.1:${port}`;
const local =
  mode === "local"
    ? await createLocalStore(
        fileURLToPath(new URL(".analytics/local-events.ndjson", root)),
      )
    : null;
const source = mode === "local" ? "Local test receiver" : "Live portfolio";
let cached = null;
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};
const send = (res, status, data, type = "application/json") => {
  res.writeHead(status, { ...headers, "Content-Type": type });
  res.end(type === "application/json" ? JSON.stringify(data) : data);
};
async function loadEvents(from, to, refresh) {
  dateRange(from, to);
  if (
    !refresh &&
    cached?.from === from &&
    cached?.to === to &&
    Date.now() - cached.loaded < 60_000
  )
    return cached.value;
  if (local)
    return {
      events: (await local.read({ from, to })).records,
      connected: true,
      error: null,
    };
  if (!env.ANALYTICS_ADMIN_TOKEN || env.ANALYTICS_ADMIN_TOKEN.length < 32)
    return {
      events: [],
      connected: false,
      error:
        "Set ANALYTICS_ADMIN_TOKEN in .env.local, then restart this dashboard. The token stays on this computer.",
    };
  const endpoint = new URL(
    env.ANALYTICS_EXPORT_URL ||
      "https://iammusa.vercel.app/api/analytics-export",
  );
  if (
    endpoint.protocol !== "https:" &&
    !(
      endpoint.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(endpoint.hostname)
    )
  )
    throw new Error("Use an HTTPS analytics export endpoint");
  if (endpoint.username || endpoint.password)
    throw new Error("Export URL must not contain credentials");
  const events = [];
  let cursor = null;
  for (let page = 0; page < 80; page++) {
    endpoint.search = new URLSearchParams({
      from,
      to,
      ...(cursor ? { cursor } : {}),
    }).toString();
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${env.ANALYTICS_ADMIN_TOKEN}` },
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const reason =
        response.status === 401
          ? "The export token was rejected. Check the matching local and Vercel server token."
          : response.status === 503
            ? "Production analytics storage is not connected. Configure Upstash REST credentials on Vercel; no live events are being stored yet."
            : `The live export returned HTTP ${response.status}. No data has been invented.`;
      return { events: [], connected: false, error: reason };
    }
    const body = await response.json();
    if (!Array.isArray(body.events) || body.events.length > 2000)
      throw new Error("Unexpected export response");
    events.push(...body.events);
    cursor = body.nextCursor;
    if (!cursor) {
      const value = { events, connected: true, error: null };
      cached = { from, to, loaded: Date.now(), value };
      return value;
    }
  }
  throw new Error("Export exceeded the bounded retention window");
}
const assets = new Map([
  ["/", ["local-dashboard/index.html", "text/html; charset=utf-8"]],
  [
    "/dashboard.css",
    ["local-dashboard/dashboard.css", "text/css; charset=utf-8"],
  ],
  [
    "/dashboard.js",
    ["local-dashboard/dashboard.js", "text/javascript; charset=utf-8"],
  ],
  ["/syne.woff2", ["public/fonts/syne-variable-full.woff2", "font/woff2"]],
]);
createServer(async (req, res) => {
  // Loopback binding plus Host/Origin checks prevent DNS rebinding and browser cross-origin reads.
  if (
    req.headers.host !== `127.0.0.1:${port}` &&
    req.headers.host !== `localhost:${port}`
  )
    return send(res, 403, { error: "Localhost only" });
  const requestOrigin = req.headers.origin;
  const url = new URL(req.url, origin);
  const isLocalCollect = local && url.pathname === "/api/collect";
  if (
    requestOrigin &&
    requestOrigin !== origin &&
    requestOrigin !== `http://localhost:${port}` &&
    !(
      isLocalCollect &&
      requestOrigin === (env.LOCAL_ANALYTICS_ORIGIN || "http://127.0.0.1:5174")
    )
  )
    return send(res, 403, { error: "Origin not allowed" });
  try {
    if (isLocalCollect && req.method === "POST") {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 12_288)
          return send(res, 413, { error: "payload_too_large" });
        chunks.push(chunk);
      }
      const request = new Request(`${origin}/api/collect`, {
        method: "POST",
        headers: req.headers,
        body: Buffer.concat(chunks),
      });
      const response = await collect(
        request,
        {
          ANALYTICS_SITE_ORIGIN:
            env.LOCAL_ANALYTICS_ORIGIN || "http://127.0.0.1:5174",
        },
        { store: local },
      );
      res.writeHead(response.status, {
        ...headers,
        ...Object.fromEntries(response.headers),
      });
      return res.end(await response.text());
    }
    if (req.method !== "GET") return send(res, 405, { error: "GET only" });
    if (url.pathname === "/api/report" || url.pathname === "/api/export") {
      const to =
        url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
      const from = url.searchParams.get("from") || to;
      const result = await loadEvents(
        from,
        to,
        url.searchParams.get("refresh") === "1",
      );
      if (url.pathname === "/api/export") {
        if (!result.connected) return send(res, 503, { error: result.error });
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="musa-analytics-${mode}-${from}-${to}.json"`,
        );
        return send(res, 200, {
          version: 1,
          source,
          from,
          to,
          events: result.events,
        });
      }
      return send(
        res,
        200,
        summarize(result.events, {
          from,
          to,
          source,
          connected: result.connected,
          error: result.error,
        }),
      );
    }
    const asset = assets.get(url.pathname);
    if (!asset) return send(res, 404, { error: "Not found" });
    return send(res, 200, await readFile(new URL(asset[0], root)), asset[1]);
  } catch (error) {
    // Never include fetch URLs, credentials or raw upstream responses in browser errors.
    return send(res, 502, {
      error:
        error.message?.startsWith("Use valid UTC") ||
        error.message?.startsWith("Choose at most")
          ? error.message
          : "Could not load analytics. Check the local server connection and configuration.",
    });
  }
}).listen(port, "127.0.0.1", () =>
  console.log(
    `Private analytics dashboard: ${origin}\nSource: ${source}. No public listener; no credentials sent to the browser.`,
  ),
);
