import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { catalog } from "./schema.mjs";

const source = await readFile(
  new URL("../../src/lib/analytics.ts", import.meta.url),
  "utf8",
);
const schemaUrl = new URL("./schema.mjs", import.meta.url).href;
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace("../../server/analytics/schema.mjs", schemaUrl);
const {
  startAnalytics,
  trackAnalyticsAction,
  trackAnalyticsControl,
  trackAnalyticsTopic,
} = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

test("client drops private URL data, uses fresh memory sessions, counts only active dwell and honors opt-out", async () => {
  const names = [
    "window",
    "document",
    "navigator",
    "location",
    "performance",
    "matchMedia",
    "fetch",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "innerHeight",
    "scrollY",
    "clearInterval",
    "Element",
    "HTMLDetailsElement",
  ];
  const saved = new Map(
    names.map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  const assign = (name, value) =>
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  const win = new EventTarget(),
    doc = new EventTarget();
  let clock = 0,
    focused = true;
  const timers = new Map(),
    requests = [];
  win.setInterval = (callback) => {
    timers.set(timers.size + 1, callback);
    return timers.size;
  };
  assign("clearInterval", (id) => timers.delete(id));
  assign("window", win);
  class FakeElement {
    constructor(matches = {}) {
      this.matches = matches;
      this.dataset = {};
    }
    closest(selector) {
      return this.matches[selector] || null;
    }
  }
  class FakeDetails extends FakeElement {
    open = false;
  }
  assign("Element", FakeElement);
  assign("HTMLDetailsElement", FakeDetails);
  const dispatch = (type, target) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, "target", { value: target });
    win.dispatchEvent(event);
  };
  Object.assign(doc, {
    hidden: false,
    referrer: "https://example.com/private-page?q=secret",
  });
  doc.hasFocus = () => focused;
  doc.documentElement = { scrollHeight: 3000 };
  assign("document", doc);
  assign("navigator", { doNotTrack: "1", globalPrivacyControl: false });
  assign("location", {
    pathname: "/writing",
    search: "?q=secret",
    hash: "#private",
    href: "https://iammusa.vercel.app/writing?q=secret#private",
    hostname: "iammusa.vercel.app",
    origin: "https://iammusa.vercel.app",
  });
  assign("performance", { now: () => clock });
  assign("matchMedia", () => ({ matches: false }));
  assign("fetch", async (url, options) => {
    requests.push({ url, options, payload: JSON.parse(options.body) });
    return Response.json({ accepted: 1 }, { status: 202 });
  });
  assign("requestAnimationFrame", () => 1);
  assign("cancelAnimationFrame", () => {});
  assign("innerHeight", 900);
  assign("scrollY", 0);
  let stop;
  try {
    startAnalytics({ enabled: true });
    assert.equal(requests.length, 0, "DNT means no requests");
    navigator.doNotTrack = "0";
    navigator.globalPrivacyControl = true;
    startAnalytics({ enabled: true });
    assert.equal(requests.length, 0, "GPC means no requests");
    navigator.globalPrivacyControl = false;
    stop = startAnalytics({ enabled: true });
    await Promise.resolve();
    const firstSid = requests[0].payload.sid;
    assert.equal(requests[0].payload.events[0].path, "/writing");
    assert.equal(requests[0].payload.referrer, "example.com");
    assert.equal(requests[0].options.credentials, "omit");
    assert.equal(requests[0].options.referrerPolicy, "no-referrer");
    assert.ok(!JSON.stringify(requests).includes("secret"));
    trackAnalyticsAction("chat-open");
    trackAnalyticsControl("wumi-view-lab");
    trackAnalyticsControl("private arbitrary DOM text");
    const topic = Object.keys(catalog.topicControls).find(Boolean);
    trackAnalyticsTopic(topic);
    trackAnalyticsTopic("private search query");
    const anchor = new FakeElement();
    anchor.href = "https://github.com/muhammad-musa-ml";
    anchor.matches["a[href]"] = anchor;
    dispatch("click", anchor);
    const detail = new FakeDetails();
    detail.dataset.analyticsDetail = "wumi-access-history";
    detail.open = true;
    dispatch("toggle", detail); // Programmatic expansion, with no user activation.
    detail.open = false;
    const summary = new FakeElement();
    summary.matches.summary = summary;
    summary.matches["details[data-analytics-detail]"] = detail;
    dispatch("click", summary);
    detail.open = true;
    dispatch("toggle", detail);
    dispatch("click", summary);
    detail.open = false;
    dispatch("toggle", detail);
    clock = 5000;
    location.pathname = "/work/wumi";
    location.search = "";
    location.hash = "#section-0";
    win.dispatchEvent(new Event("portfolio:navigate"));
    clock = 45000;
    [...timers.values()].at(-1)();
    await Promise.resolve();
    clock = 120000;
    [...timers.values()].at(-1)();
    await Promise.resolve();
    const events = requests.flatMap((request) => request.payload.events);
    assert.equal(
      events.filter((event) => event.action === "outbound").length,
      1,
      "an anchor click produces exactly one click event",
    );
    assert.equal(
      events.filter((event) => event.action === "details-open").length,
      1,
      "automatic expansion is not reported as a click",
    );
    assert.equal(
      events.filter((event) => event.action === "details-close").length,
      1,
    );
    assert.ok(events.some((event) => event.target === "wumi-view-lab"));
    assert.ok(
      events.some((event) => event.target === catalog.topicControls[topic]),
    );
    assert.ok(!JSON.stringify(events).includes("private arbitrary"));
    assert.ok(!JSON.stringify(events).includes("private search query"));
    assert.equal(
      events
        .filter((event) => event.type === "dwell")
        .reduce((total, event) => total + event.value, 0),
      60,
      "idle tabs do not accumulate unlimited active time",
    );
    assert.ok(
      events.some(
        (event) => event.type === "click" && event.action === "chat-open",
      ),
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "pageview" &&
          event.path === "/work/wumi#section-0" &&
          event.from === "/writing",
      ),
    );
    focused = false;
    win.dispatchEvent(new Event("blur"));
    clock = 180000;
    [...timers.values()].at(-1)();
    await Promise.resolve();
    assert.equal(
      requests
        .flatMap((request) => request.payload.events)
        .filter((event) => event.type === "dwell")
        .reduce((total, event) => total + event.value, 0),
      60,
    );
    stop();
    stop = startAnalytics({ enabled: true });
    await Promise.resolve();
    assert.notEqual(
      requests.at(-1).payload.sid,
      firstSid,
      "a new bootstrap/reload is not linked to an earlier session",
    );
    assert.equal(requests.at(-1).payload.events[0].type, "pageview");
    stop();
    const pending = [];
    assign(
      "fetch",
      (url, options) =>
        new Promise((resolve) => pending.push({ options, resolve })),
    );
    stop = startAnalytics({ enabled: true });
    trackAnalyticsAction("chat-open");
    win.dispatchEvent(new Event("pagehide"));
    assert.equal(
      pending.length,
      2,
      "final clicks flush even while the initial page-view batch is in flight",
    );
    assert.equal(
      JSON.parse(pending[1].options.body).events[0].action,
      "chat-open",
    );
    pending.forEach(({ resolve }) =>
      resolve(Response.json({ accepted: 1 }, { status: 202 })),
    );
    await Promise.resolve();
  } finally {
    stop?.();
    for (const [name, descriptor] of saved)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
  }
});
