import { catalog } from "./schema.mjs";
import { dateRange } from "./redis.mjs";

const label = (path) => {
  const url = new URL(path, "https://iammusa.vercel.app");
  return `${catalog.paths[url.pathname] || url.pathname}${url.search}${url.hash}`;
};
const actionLabels = {
  "theme-dark": "Switch to dark mode",
  "theme-light": "Switch to light mode",
  "chat-open": "Open MusA.I",
  "search-open": "Open site search",
  "cursor-dot-on": "Enable cursor dot",
  "cursor-dot-off": "Use system cursor",
  resume: "Open résumé",
  email: "Open email",
};
const outboundLabels = Object.fromEntries(
  Object.values(catalog.outbound).map((entry) => [entry.id, entry.label]),
);
export const clickLabel = (event) =>
  event.action === "navigate"
    ? `Navigate / ${label(event.target)}`
    : event.action === "outbound"
      ? outboundLabels[event.target] || event.target
      : event.action === "control"
        ? catalog.controls[event.target] || "Unknown control"
        : event.action === "details-open" || event.action === "details-close"
          ? (event.action === "details-open" ? "Expand / " : "Collapse / ") +
            (catalog.details[event.target] || "Unknown disclosure")
          : actionLabels[event.action] || event.action;
export function summarize(
  events,
  { from, to, source, connected = true, error = null },
) {
  const sessions = new Map(),
    pages = new Map(),
    clicks = new Map(),
    locations = new Map(),
    devices = new Map(),
    referrers = new Map();
  const timeline = new Map(
    dateRange(from, to).map((day) => [
      day,
      { day, pageviews: 0, sessions: new Set(), clicks: 0 },
    ]),
  );
  let pageviews = 0,
    clickCount = 0,
    dwellSeconds = 0;
  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  for (const event of events) {
    const day = event.at.slice(0, 10);
    if (!timeline.has(day)) continue;
    const session = sessions.get(event.sid) || {
      id: event.sid,
      start: event.at,
      end: event.at,
      device: event.device,
      referrer: event.referrer || "Direct / unknown",
      location: event.location,
      dwell: 0,
      events: [],
    };
    session.events.push(event);
    if (event.at < session.start) session.start = event.at;
    if (event.at > session.end) session.end = event.at;
    sessions.set(event.sid, session);
    timeline.get(day).sessions.add(event.sid);
    const path = event.path.split("#")[0];
    const page = pages.get(path) || {
      path,
      label: label(path),
      pageviews: 0,
      dwell: 0,
      completed: new Set(),
      readers: new Set(),
    };
    if (event.type === "pageview") {
      pageviews++;
      page.pageviews++;
      page.readers.add(event.sid);
      timeline.get(day).pageviews++;
    }
    if (event.type === "dwell") {
      dwellSeconds += event.value;
      page.dwell += event.value;
      session.dwell += event.value;
    }
    if (event.type === "scroll" && event.value === 100)
      page.completed.add(event.sid);
    if (event.type === "click") {
      clickCount++;
      timeline.get(day).clicks++;
      increment(clicks, clickLabel(event));
    }
    pages.set(path, page);
  }
  for (const session of sessions.values()) {
    increment(devices, session.device);
    increment(referrers, session.referrer);
    const loc = session.location || {};
    increment(
      locations,
      [loc.city, loc.region, loc.country].filter(Boolean).join(", ") ||
        "Unavailable",
    );
    session.events.sort((a, b) => a.seq - b.seq);
  }
  const rows = (map) =>
    [...map]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  return {
    from,
    to,
    source,
    connected,
    error,
    generatedAt: new Date().toISOString(),
    totals: {
      sessions: sessions.size,
      pageviews,
      clicks: clickCount,
      dwellSeconds,
      meanActiveSeconds: sessions.size
        ? Math.round(dwellSeconds / sessions.size)
        : 0,
    },
    timeline: [...timeline.values()].map((day) => ({
      ...day,
      sessions: day.sessions.size,
    })),
    pages: [...pages.values()]
      .map((page) => ({
        ...page,
        completed: page.completed.size,
        readers: page.readers.size,
      }))
      .sort((a, b) => b.pageviews - a.pageviews),
    clicks: rows(clicks),
    locations: rows(locations),
    devices: rows(devices),
    referrers: rows(referrers),
    sessions: [...sessions.values()]
      .sort((a, b) => b.end.localeCompare(a.end))
      .slice(0, 100)
      .map((session) => ({
        ...session,
        events: session.events.map((event) => ({
          type: event.type,
          seq: event.seq,
          at: event.at,
          path: event.path,
          label: event.type === "click" ? clickLabel(event) : label(event.path),
          value: event.value,
        })),
      })),
  };
}
