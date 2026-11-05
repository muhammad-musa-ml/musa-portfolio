import catalog from "./catalog.json" with { type: "json" };

export { catalog };
export const LIMITS = Object.freeze({
  bodyBytes: 12_288,
  batch: 12,
  retentionDays: 30,
  dailyEvents: 5_000,
  sessionEvents: 600,
  globalMinute: 600,
  sessionMinute: 60,
});
export const ACTIONS = Object.freeze([
  "navigate",
  "outbound",
  "control",
  "details-open",
  "details-close",
  "resume",
  "email",
  "theme-dark",
  "theme-light",
  "chat-open",
  "search-open",
  "cursor-dot-on",
  "cursor-dot-off",
]);
const types = new Set(["pageview", "section", "click", "scroll", "dwell"]);
const targets = new Set(
  Object.values(catalog.outbound).map((entry) => entry.id),
);
const eventKeys = new Set([
  "type",
  "seq",
  "path",
  "from",
  "action",
  "target",
  "value",
]);
const plain = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

/** Known public destinations only; free-form queries and unrecognized hashes never leave the browser. */
export function normalizeDestination(value) {
  if (
    typeof value !== "string" ||
    value.length > 512 ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return null;
  let url;
  try {
    url = new URL(value, "https://iammusa.vercel.app");
  } catch {
    return null;
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (!Object.hasOwn(catalog.paths, path)) return null;
  const build = path === "/playground" ? url.searchParams.get("build") : null;
  const query =
    build && catalog.builds.includes(build) ? `?build=${build}` : "";
  const hash = (catalog.hashes[path] || []).includes(url.hash.slice(1))
    ? url.hash
    : "";
  return `${path}${query}${hash}`;
}

export function outboundTarget(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return (
      catalog.outbound[`${url.origin}${url.pathname.replace(/\/+$/, "")}`]
        ?.id || null
    );
  } catch {
    return null;
  }
}

export function validateBatch(input) {
  if (
    !plain(input) ||
    Object.keys(input).some(
      (key) => !["v", "sid", "device", "referrer", "events"].includes(key),
    )
  )
    return null;
  if (
    input.v !== 1 ||
    typeof input.sid !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      input.sid,
    )
  )
    return null;
  if (!["mobile", "tablet", "desktop", "unknown"].includes(input.device))
    return null;
  // Host only, no referrer path, query, credentials or port. No IP addresses.
  const referrer = input.referrer || "";
  if (
    typeof referrer !== "string" ||
    referrer.length > 120 ||
    (referrer &&
      (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(
        referrer,
      ) ||
        referrer.endsWith(".local")))
  )
    return null;
  if (
    !Array.isArray(input.events) ||
    !input.events.length ||
    input.events.length > LIMITS.batch
  )
    return null;
  const events = [];
  for (const event of input.events) {
    if (
      !plain(event) ||
      Object.keys(event).some((key) => !eventKeys.has(key)) ||
      !types.has(event.type)
    )
      return null;
    if (
      !Number.isInteger(event.seq) ||
      event.seq < 1 ||
      event.seq > LIMITS.sessionEvents
    )
      return null;
    const path = normalizeDestination(event.path);
    if (!path || path !== event.path) return null;
    const clean = { type: event.type, seq: event.seq, path };
    if (event.type === "pageview" || event.type === "section") {
      if (event.from !== undefined) {
        if (
          typeof event.from !== "string" ||
          normalizeDestination(event.from) !== event.from
        )
          return null;
        clean.from = event.from;
      }
      if (
        event.action !== undefined ||
        event.target !== undefined ||
        event.value !== undefined
      )
        return null;
    } else if (event.type === "click") {
      if (
        !ACTIONS.includes(event.action) ||
        event.value !== undefined ||
        event.from !== undefined
      )
        return null;
      clean.action = event.action;
      if (event.action === "navigate") {
        if (
          !event.target ||
          normalizeDestination(event.target) !== event.target
        )
          return null;
        clean.target = event.target;
      } else if (event.action === "outbound") {
        if (!targets.has(event.target)) return null;
        clean.target = event.target;
      } else if (event.action === "control") {
        if (
          typeof event.target !== "string" ||
          !Object.hasOwn(catalog.controls, event.target)
        )
          return null;
        clean.target = event.target;
      } else if (
        event.action === "details-open" ||
        event.action === "details-close"
      ) {
        if (
          typeof event.target !== "string" ||
          !Object.hasOwn(catalog.details, event.target)
        )
          return null;
        clean.target = event.target;
      } else if (event.target !== undefined) return null;
    } else {
      if (
        event.action !== undefined ||
        event.target !== undefined ||
        event.from !== undefined
      )
        return null;
      if (event.type === "scroll" && ![25, 50, 75, 100].includes(event.value))
        return null;
      if (
        event.type === "dwell" &&
        (!Number.isInteger(event.value) || event.value < 1 || event.value > 60)
      )
        return null;
      clean.value = event.value;
    }
    events.push(clean);
  }
  return {
    v: 1,
    sid: input.sid.toLowerCase(),
    device: input.device,
    referrer: referrer.toLowerCase(),
    events,
  };
}

export function privacyOptOut(headers) {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

export function trustedLocation(headers, isVercel) {
  if (!isVercel) return { country: "", region: "", city: "" };
  const read = (name, max) => {
    const raw = headers.get(name) || "";
    let decoded;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return "";
    }
    return decoded.length <= max &&
      /^[\p{L}\p{M}\p{N} .,'’()\-]*$/u.test(decoded)
      ? decoded
      : "";
  };
  const country = read("x-vercel-ip-country", 2).toUpperCase();
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : "",
    region: read("x-vercel-ip-country-region", 40),
    city: read("x-vercel-ip-city", 80),
  };
}
