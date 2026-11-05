import { createRedisStore, dateRange } from "./redis.mjs";
import {
  LIMITS,
  privacyOptOut,
  trustedLocation,
  validateBatch,
} from "./schema.mjs";

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
const empty = () =>
  new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const configuredOrigin = (env) =>
  new URL(env.ANALYTICS_SITE_ORIGIN || "https://iammusa.vercel.app").origin;

async function readBounded(request) {
  if (Number(request.headers.get("content-length")) > LIMITS.bodyBytes)
    throw new Error("size");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const decoder = new TextDecoder();
  let bytes = 0,
    text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > LIMITS.bodyBytes) {
        await reader.cancel();
        throw new Error("size");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

export async function collect(request, env = {}, dependencies = {}) {
  if (request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  if (privacyOptOut(request.headers)) return empty();
  let origin;
  try {
    origin = configuredOrigin(env);
  } catch {
    return json({ error: "not_configured" }, 503);
  }
  // Same-origin browser requests only. No permissive CORS and no hostname inferred from request headers.
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json({ error: "forbidden_origin" }, 403);
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    return json({ error: "content_type" }, 415);
  let batch;
  try {
    batch = validateBatch(await readBounded(request));
  } catch (error) {
    return json(
      {
        error:
          error.message === "size" ? "payload_too_large" : "invalid_payload",
      },
      error.message === "size" ? 413 : 400,
    );
  }
  if (!batch) return json({ error: "invalid_payload" }, 400);
  // A short common-bot exclusion is only a convenience, never an identity guarantee.
  if (
    /bot\b|crawler|spider|headless|lighthouse|preview|facebookexternalhit/i.test(
      request.headers.get("user-agent") || "",
    )
  )
    return empty();
  try {
    const store =
      dependencies.store || createRedisStore(env, dependencies.fetch);
    if (!store) return json({ error: "not_configured" }, 503);
    const now = dependencies.now?.() || new Date();
    const location = trustedLocation(request.headers, env.VERCEL === "1");
    const records = batch.events.map((event) => ({
      ...event,
      sid: batch.sid,
      at: now.toISOString(),
      device: batch.device,
      referrer: batch.referrer,
      location,
    }));
    const result = await store.append(records, now);
    if (result.status !== "ok")
      return json(
        {
          error:
            result.status === "capacity" ? "daily_capacity" : "rate_limited",
        },
        429,
        { "Retry-After": result.status === "capacity" ? "3600" : "60" },
      );
    return json({ accepted: result.accepted }, 202);
  } catch {
    return json({ error: "storage_unavailable" }, 503);
  }
}

async function authorized(request, secret) {
  if (typeof secret !== "string" || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") || "";
  if (!supplied.startsWith("Bearer ") || supplied.length > 300) return false;
  // Digest both inputs before comparison so token length/prefix isn't leaked by equality timing.
  const encoder = new TextEncoder();
  const [expected, actual] = await Promise.all(
    [secret, supplied.slice(7)].map(
      async (text) =>
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", encoder.encode(text)),
        ),
    ),
  );
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= expected[index] ^ actual[index];
  return difference === 0;
}

export async function exportEvents(request, env = {}, dependencies = {}) {
  if (request.method !== "GET")
    return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  if (!(await authorized(request, env.ANALYTICS_ADMIN_TOKEN)))
    return json({ error: "unauthorized" }, 401);
  const url = new URL(request.url);
  const to =
    url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get("from") || to;
  let cursor;
  try {
    const days = dateRange(from, to);
    const raw = url.searchParams.get("cursor");
    if (raw) {
      if (!/^\d{4}-\d{2}-\d{2}:\d{1,6}$/.test(raw)) throw new Error();
      const [day, offset] = raw.split(":");
      cursor = { day, offset: Number(offset) };
      if (
        !days.includes(day) ||
        !/^\d{1,6}$/.test(offset) ||
        cursor.offset > LIMITS.dailyEvents
      )
        throw new Error();
    }
  } catch {
    return json(
      { error: "invalid_range_or_cursor", retentionDays: LIMITS.retentionDays },
      400,
    );
  }
  try {
    const store =
      dependencies.store || createRedisStore(env, dependencies.fetch);
    if (!store) return json({ error: "not_configured" }, 503);
    const result = await store.read({ from, to, cursor, limit: 2000 });
    return json({
      version: 1,
      storage: store.kind,
      from,
      to,
      retentionDays: LIMITS.retentionDays,
      dailyCapacity: LIMITS.dailyEvents,
      generatedAt: new Date().toISOString(),
      events: result.records,
      nextCursor: result.cursor
        ? `${result.cursor.day}:${result.cursor.offset}`
        : null,
    });
  } catch {
    return json({ error: "storage_unavailable" }, 503);
  }
}
