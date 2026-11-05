import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collect, exportEvents } from "./handlers.mjs";
import {
  validateBatch,
  normalizeDestination,
  outboundTarget,
  trustedLocation,
  LIMITS,
  catalog,
} from "./schema.mjs";
import { createRedisStore, dateRange } from "./redis.mjs";
import { createLocalStore } from "./local-store.mjs";
import { summarize } from "./report.mjs";

const sid = "ad51ed12-6f13-4e48-bc22-ea467c7bdc85";
const packet = (events = [{ type: "pageview", seq: 1, path: "/" }]) => ({
  v: 1,
  sid,
  device: "desktop",
  referrer: "github.com",
  events,
});
const request = (body = packet(), headers = {}) =>
  new Request("https://iammusa.vercel.app/api/analytics", {
    method: "POST",
    headers: {
      Origin: "https://iammusa.vercel.app",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const now = () => new Date("2026-11-05T12:00:00Z");
const record = (event, overrides = {}) => ({
  ...event,
  sid,
  at: now().toISOString(),
  device: "desktop",
  referrer: "github.com",
  location: { city: "Madison", region: "WI", country: "US" },
  ...overrides,
});
const secret = "test-only-admin-token-32-characters-long";

test("destinations discard queries and unknown fragments, and exclude private/study routes", () => {
  assert.equal(
    normalizeDestination("/writing?query=my-private-search"),
    "/writing",
  );
  assert.equal(normalizeDestination("/about#my-private-note"), "/about");
  assert.equal(
    normalizeDestination("/work/wumi#section-0"),
    "/work/wumi#section-0",
  );
  assert.equal(
    normalizeDestination("/playground?build=kiln&q=private"),
    "/playground?build=kiln",
  );
  assert.equal(
    normalizeDestination("/playground?build=unknown"),
    "/playground",
  );
  for (const path of [
    "/samples/curio",
    "/backgrounds",
    "/motion-studio",
    "/journeys/secret",
    "/work/private-name",
    "//evil.example/",
  ])
    assert.equal(normalizeDestination(path), null);
  assert.equal(
    outboundTarget("https://github.com/muhammad-musa-ml?private=ignored"),
    "social:github",
  );
  assert.equal(outboundTarget("https://github.com/private-person"), null);
  assert.equal(
    outboundTarget("https://password@github.com/muhammad-musa-ml"),
    null,
  );
});

test("strict schema rejects free-form fields, nonpublic targets, oversized/dangerous values", () => {
  assert.ok(validateBatch(packet()));
  for (const altered of [
    { ...packet(), email: "private@example.com" },
    { ...packet(), sid: "persistent-person-id" },
    { ...packet(), device: "exact device fingerprint" },
    { ...packet(), referrer: "https://example.com/private?q=secret" },
    { ...packet(), referrer: "127.0.0.1" },
    packet([{ type: "pageview", seq: 1, path: "/", text: "chat text" }]),
    packet([{ type: "pageview", seq: 1, path: "/?search=private" }]),
    packet([{ type: "pageview", seq: 1, path: "/", from: null }]),
    packet([
      {
        type: "click",
        seq: 1,
        path: "/",
        action: "outbound",
        target: "private-url",
      },
    ]),
    packet([
      {
        type: "click",
        seq: 1,
        path: "/",
        action: "chat-open",
        target: "chat contents",
      },
    ]),
    packet([{ type: "scroll", seq: 1, path: "/", value: 74 }]),
    packet([{ type: "dwell", seq: 1, path: "/", value: 61 }]),
    packet(
      Array.from({ length: 13 }, (_, i) => ({
        type: "pageview",
        seq: i + 1,
        path: "/",
      })),
    ),
  ])
    assert.equal(validateBatch(altered), null);
});

test("approved controls and disclosures have exact server allowlists and readable dashboard labels", () => {
  for (const id of Object.keys(catalog.controls)) {
    const event = {
      type: "click",
      seq: 1,
      path: "/playground",
      action: "control",
      target: id,
    };
    assert.ok(validateBatch(packet([event])), id);
    const report = summarize([record(event)], {
      from: "2026-11-05",
      to: "2026-11-05",
      source: "Test",
    });
    assert.equal(report.clicks[0].name, catalog.controls[id]);
  }
  for (const action of ["details-open", "details-close"])
    for (const id of Object.keys(catalog.details))
      assert.ok(
        validateBatch(
          packet([
            { type: "click", seq: 1, path: "/about", action, target: id },
          ]),
        ),
      );
  for (const [action, target] of [
    ["control", "patient name"],
    ["control", "lookup-cache-999"],
    ["details-open", "freeform-section"],
    ["outbound", "wumi-view-lab"],
    ["control", "wumi-access-history"],
  ])
    assert.equal(
      validateBatch(
        packet([{ type: "click", seq: 1, path: "/", action, target }]),
      ),
      null,
    );
});

test("collector honors privacy signals before storing and validates origin/content type/body bounds", async () => {
  let writes = 0;
  const dependencies = {
    store: {
      append() {
        writes++;
        return { status: "ok", accepted: 1 };
      },
    },
    now,
  };
  assert.equal((await collect(request(), {}, dependencies)).status, 202);
  assert.equal(writes, 1);
  assert.equal(
    (await collect(request({}, { DNT: "1" }), {}, dependencies)).status,
    204,
  );
  assert.equal(
    (await collect(request({}, { "Sec-GPC": "1" }), {}, dependencies)).status,
    204,
  );
  assert.equal(
    (
      await collect(
        request(packet(), { Origin: "https://evil.example" }),
        {},
        dependencies,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await collect(
        request(packet(), { "Content-Type": "text/plain" }),
        {},
        dependencies,
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await collect(
        request({ padding: "x".repeat(LIMITS.bodyBytes) }),
        {},
        dependencies,
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await collect(
        request(packet(), { "User-Agent": "Googlebot" }),
        {},
        dependencies,
      )
    ).status,
    204,
  );
  assert.equal(writes, 1);
});

test("missing storage and backend failures report explicit unavailable status", async () => {
  const response = await collect(request(), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "not_configured");
  assert.equal(
    (
      await collect(
        request(),
        {},
        {
          store: {
            append() {
              throw Error("private-token-detail");
            },
          },
        },
      )
    ).status,
    503,
  );
  const limited = await collect(
    request(),
    {},
    { store: { append: async () => ({ status: "capacity", accepted: 0 }) } },
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "3600");
});

test("location is coarse and trusted only on Vercel; IP never enters stored records", async () => {
  const geo = new Headers({
    "x-vercel-ip-city": "San%20Francisco",
    "x-vercel-ip-country-region": "CA",
    "x-vercel-ip-country": "US",
    "x-forwarded-for": "1.2.3.4",
  });
  assert.deepEqual(trustedLocation(geo, false), {
    city: "",
    region: "",
    country: "",
  });
  assert.deepEqual(trustedLocation(geo, true), {
    city: "San Francisco",
    region: "CA",
    country: "US",
  });
  geo.set("x-vercel-ip-city", "%3Cscript%3E");
  assert.equal(trustedLocation(geo, true).city, "");
  let written;
  await collect(
    request(packet(), Object.fromEntries(geo)),
    { VERCEL: "1" },
    {
      now,
      store: {
        append: async (records) => {
          written = records;
          return { status: "ok", accepted: records.length };
        },
      },
    },
  );
  assert.ok(!JSON.stringify(written).includes("1.2.3.4"));
  assert.equal(written[0].at, "2026-11-05T12:00:00.000Z");
});

test("exports require strict Bearer auth and bound dates/cursors", async () => {
  const base =
    "https://iammusa.vercel.app/api/analytics-export?from=2026-11-01&to=2026-11-05";
  const store = {
    kind: "test",
    read: async () => ({
      records: [record(packet().events[0])],
      cursor: { day: "2026-11-05", offset: 1 },
    }),
  };
  assert.equal(
    (
      await exportEvents(
        new Request(base),
        { ANALYTICS_ADMIN_TOKEN: secret },
        { store },
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await exportEvents(
        new Request(base + "&token=" + secret),
        { ANALYTICS_ADMIN_TOKEN: secret },
        { store },
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await exportEvents(
        new Request(base, { headers: { Authorization: "Bearer wrong" } }),
        { ANALYTICS_ADMIN_TOKEN: secret },
        { store },
      )
    ).status,
    401,
  );
  const authorized = (url) =>
    new Request(url, { headers: { Authorization: "Bearer " + secret } });
  const response = await exportEvents(
    authorized(base),
    { ANALYTICS_ADMIN_TOKEN: secret },
    { store },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).nextCursor, "2026-11-05:1");
  assert.equal(
    (
      await exportEvents(
        authorized(base + "&cursor=2026-10-01:0"),
        { ANALYTICS_ADMIN_TOKEN: secret },
        { store },
      )
    ).status,
    400,
  );
  assert.throws(() => dateRange("2026-10-01", "2026-11-05"));
  assert.throws(() => dateRange("2026-02-31", "2026-03-01"));
  assert.equal(dateRange("2026-11-01", "2026-11-05").length, 5);
});

test("Redis adapter sends an atomic deduplicated bounded operation, private credentials stay in headers", async () => {
  const sent = [];
  const store = createRedisStore(
    {
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-secret",
    },
    async (url, options) => {
      sent.push({ url, options });
      return Response.json({ result: ["ok", 1] });
    },
  );
  assert.deepEqual(await store.append([record(packet().events[0])], now()), {
    status: "ok",
    accepted: 1,
  });
  const command = JSON.parse(sent[0].options.body);
  assert.equal(command[0], "EVAL");
  assert.match(command[1], /SADD/);
  assert.match(command[1], /EXPIRE/);
  assert.equal(command[2], 4);
  assert.equal(command[7], 1);
  assert.equal(command[12], LIMITS.retentionDays * 86400);
  assert.equal(command[13], 1);
  assert.ok(!sent[0].options.body.includes("test-secret"));
  assert.equal(sent[0].options.headers.Authorization, "Bearer test-secret");
  assert.equal(createRedisStore({}), null);
});

test("local test receiver persists, deduplicates and remains separate from live storage", async () => {
  const directory = await mkdtemp(join(tmpdir(), "musa-analytics-test-"));
  try {
    const file = join(directory, "events.ndjson");
    const store = await createLocalStore(file);
    const events = [
      record(packet().events[0]),
      record({ type: "click", seq: 2, path: "/", action: "resume" }),
    ];
    assert.equal((await store.append(events, now())).accepted, 2);
    assert.equal((await store.append(events, now())).accepted, 0);
    const reopened = await createLocalStore(file);
    assert.equal(
      (await reopened.read({ from: "2026-11-05", to: "2026-11-05" })).records
        .length,
      2,
    );
    assert.equal(reopened.kind, "local-test-file");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("report preserves anonymous journeys, counts sessions once and separates section changes", () => {
  const events = [
    record({ type: "pageview", seq: 1, path: "/" }),
    record({ type: "pageview", seq: 2, path: "/work/wumi", from: "/" }),
    record({
      type: "section",
      seq: 3,
      path: "/work/wumi#section-0",
      from: "/work/wumi",
    }),
    record({ type: "dwell", seq: 4, path: "/work/wumi#section-0", value: 20 }),
    record({ type: "click", seq: 5, path: "/work/wumi", action: "resume" }),
  ];
  const report = summarize(events, {
    from: "2026-11-05",
    to: "2026-11-05",
    source: "Test",
  });
  assert.equal(report.totals.sessions, 1);
  assert.equal(report.totals.pageviews, 2);
  assert.equal(report.totals.clicks, 1);
  assert.equal(report.totals.dwellSeconds, 20);
  assert.equal(report.sessions[0].events[2].type, "section");
  assert.equal(report.clicks[0].name, "Open résumé");
  assert.deepEqual(report.devices, [{ name: "desktop", count: 1 }]);
});
