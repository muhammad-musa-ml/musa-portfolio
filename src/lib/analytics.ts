import {
  ACTIONS,
  catalog,
  LIMITS,
  normalizeDestination,
  outboundTarget,
} from "../../server/analytics/schema.mjs";

type Action =
  | "theme-dark"
  | "theme-light"
  | "chat-open"
  | "search-open"
  | "cursor-dot-on"
  | "cursor-dot-off";
type AnalyticsEvent = {
  type: "pageview" | "section" | "click" | "scroll" | "dwell";
  seq: number;
  path: string;
  from?: string;
  action?: string;
  target?: string;
  value?: number;
};
type Options = { enabled: boolean; endpoint?: string };
let actionSink: ((action: Action) => void) | undefined;
let controlSink: ((id: string) => void) | undefined;
let stopRunning: (() => void) | undefined;

export function trackAnalyticsAction(action: Action) {
  actionSink?.(action);
}

/** Only IDs generated from the approved public interface are accepted. */
export function trackAnalyticsControl(id: string) {
  if (Object.prototype.hasOwnProperty.call(catalog.controls, id))
    controlSink?.(id);
}

export function trackAnalyticsTopic(topic: string) {
  if (Object.prototype.hasOwnProperty.call(catalog.topicControls, topic))
    trackAnalyticsControl(catalog.topicControls[topic]);
}

/** Anonymous, best-effort first-party measurements. Nothing survives a reload. */
export function startAnalytics({
  enabled,
  endpoint = "/api/analytics",
}: Options) {
  stopRunning?.();
  const optedOut = () =>
    navigator.doNotTrack === "1" ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true;
  if (
    !enabled ||
    optedOut() ||
    !crypto.randomUUID ||
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//")
  )
    return () => {};
  const sid = crypto.randomUUID();
  // Coarse layout class only: no user agent, exact dimensions, screen or hardware data.
  const device = matchMedia("(max-width: 600px)").matches
    ? "mobile"
    : matchMedia("(max-width: 1000px)").matches
      ? "tablet"
      : "desktop";
  let referrer = "";
  try {
    const host = new URL(document.referrer).hostname.toLowerCase();
    if (
      host !== location.hostname &&
      host.length <= 120 &&
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(host) &&
      !host.endsWith(".local")
    )
      referrer = host;
  } catch {
    /* Direct visit. */
  }
  let path = normalizeDestination(
    `${location.pathname}${location.search}${location.hash}`,
  );
  let seq = 0;
  let queue: AnalyticsEvent[] = [];
  let sending = 0;
  let stopped = false;
  let backoffUntil = 0;
  let lastActivity = performance.now();
  let lastTick = lastActivity;
  let dwellRemainder = 0;
  let wasActive = !document.hidden && document.hasFocus();
  let scrollFrame = 0;
  let milestones = new Set<number>();
  const pendingDetails = new WeakMap<
    HTMLDetailsElement,
    { open: boolean; at: number; event: MouseEvent }
  >();

  const push = (event: Omit<AnalyticsEvent, "seq" | "path">) => {
    if (stopped || optedOut() || !path || seq >= LIMITS.sessionEvents) return;
    queue.push({ ...event, seq: ++seq, path });
    if (queue.length > LIMITS.batch * 5) queue.shift();
    if (queue.length >= LIMITS.batch) void flush();
  };
  const flush = async (leaving = false) => {
    if (
      stopped ||
      (sending > 0 && !leaving) ||
      !queue.length ||
      performance.now() < backoffUntil
    )
      return;
    if (optedOut()) {
      queue = [];
      return;
    }
    const events = queue.splice(0, LIMITS.batch);
    sending++;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ v: 1, sid, device, referrer, events }),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        keepalive: true,
      });
      if (!response.ok)
        backoffUntil =
          performance.now() + (response.status === 429 ? 60_000 : 120_000);
    } catch {
      backoffUntil = performance.now() + 120_000;
    } finally {
      sending--;
      // No durable retry queue or endless requests while storage is unavailable.
      if (
        !leaving &&
        sending === 0 &&
        queue.length >= LIMITS.batch &&
        performance.now() >= backoffUntil
      )
        void flush();
    }
  };
  const dwell = () => {
    const now = performance.now();
    if (wasActive && path) {
      dwellRemainder += Math.max(
        0,
        Math.min(now, lastActivity + 60_000) - lastTick,
      );
      const seconds = Math.min(60, Math.floor(dwellRemainder / 1000));
      if (seconds > 0) {
        push({ type: "dwell", value: seconds });
        dwellRemainder -= seconds * 1000;
      }
    }
    lastTick = now;
  };
  const activity = () => {
    lastActivity = performance.now();
  };
  const visibility = () => {
    dwell();
    wasActive = !document.hidden && document.hasFocus();
    if (wasActive) activity();
    else void flush(true);
  };
  const route = () => {
    const next = normalizeDestination(
      `${location.pathname}${location.search}${location.hash}`,
    );
    if (next === path) return;
    dwell();
    const from = path;
    path = next;
    dwellRemainder = 0;
    milestones = new Set();
    if (next)
      push({
        type:
          from?.split("#")[0] === next.split("#")[0] ? "section" : "pageview",
        ...(from ? { from } : {}),
      });
  };
  const click = (event: MouseEvent) => {
    // Build selectors use replaceState directly; read the sanitized URL after their handler.
    queueMicrotask(route);
    if (!(event.target instanceof Element)) return;
    const summary = event.target.closest("summary");
    const detail = summary?.closest<HTMLDetailsElement>(
      "details[data-analytics-detail]",
    );
    if (detail && !event.target.closest("a,button,input,select")) {
      const id = detail.dataset.analyticsDetail;
      if (id && Object.prototype.hasOwnProperty.call(catalog.details, id))
        pendingDetails.set(detail, {
          open: detail.open,
          at: performance.now(),
          event,
        });
      return;
    }
    const explicit = event.target.closest<HTMLElement>(
      "[data-analytics-action]",
    )?.dataset.analyticsAction;
    if (
      explicit &&
      ACTIONS.includes(explicit) &&
      ![
        "navigate",
        "outbound",
        "control",
        "details-open",
        "details-close",
      ].includes(explicit)
    ) {
      push({ type: "click", action: explicit });
      return;
    }
    const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor) return;
    let url: URL;
    try {
      url = new URL(anchor.href, location.href);
    } catch {
      return;
    }
    if (
      url.protocol === "mailto:" &&
      url.pathname.toLowerCase() === "mmusa2@wisc.edu"
    )
      push({ type: "click", action: "email" });
    else if (
      url.origin === location.origin &&
      url.pathname === "/Muhammad-Musa-Resume.pdf"
    )
      push({ type: "click", action: "resume" });
    else if (url.origin === location.origin) {
      const target = normalizeDestination(
        `${url.pathname}${url.search}${url.hash}`,
      );
      if (target) push({ type: "click", action: "navigate", target });
    } else {
      const target = outboundTarget(url.href);
      if (target) push({ type: "click", action: "outbound", target });
    }
  };
  const disclosure = (event: Event) => {
    if (!(event.target instanceof HTMLDetailsElement)) return;
    const detail = event.target;
    const pending = pendingDetails.get(detail);
    pendingDetails.delete(detail);
    if (
      !pending ||
      pending.event.defaultPrevented ||
      performance.now() - pending.at > 1000 ||
      pending.open === detail.open
    )
      return;
    const id = detail.dataset.analyticsDetail;
    if (id && Object.prototype.hasOwnProperty.call(catalog.details, id))
      push({
        type: "click",
        action: detail.open ? "details-open" : "details-close",
        target: id,
      });
  };
  const scroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      if (range < innerHeight * 0.15) return;
      const percentage = Math.min(
        100,
        Math.round((Math.max(0, scrollY) / range) * 100),
      );
      for (const value of [25, 50, 75, 100])
        if (percentage >= value && !milestones.has(value)) {
          milestones.add(value);
          push({ type: "scroll", value });
        }
    });
  };
  const pagehide = () => {
    dwell();
    void flush(true);
    wasActive = false;
  };
  const tick = () => {
    dwell();
    void flush();
  };
  actionSink = (action) => push({ type: "click", action });
  controlSink = (id) => {
    push({ type: "click", action: "control", target: id });
    queueMicrotask(route);
  };
  const interval = window.setInterval(tick, 15_000);
  window.addEventListener("portfolio:navigate", route);
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);
  window.addEventListener("click", click, { capture: true, passive: true });
  window.addEventListener("toggle", disclosure, true);
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("pointerdown", activity, { passive: true });
  window.addEventListener("pointermove", activity, { passive: true });
  window.addEventListener("keydown", activity, { passive: true });
  window.addEventListener("focus", visibility);
  window.addEventListener("blur", visibility);
  window.addEventListener("pageshow", visibility);
  window.addEventListener("pagehide", pagehide);
  document.addEventListener("visibilitychange", visibility);
  push({ type: "pageview" });
  void flush();
  stopRunning = () => {
    dwell();
    void flush(true);
    stopped = true;
    actionSink = undefined;
    controlSink = undefined;
    clearInterval(interval);
    cancelAnimationFrame(scrollFrame);
    window.removeEventListener("portfolio:navigate", route);
    window.removeEventListener("popstate", route);
    window.removeEventListener("hashchange", route);
    window.removeEventListener("click", click, true);
    window.removeEventListener("toggle", disclosure, true);
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("pointerdown", activity);
    window.removeEventListener("pointermove", activity);
    window.removeEventListener("keydown", activity);
    window.removeEventListener("focus", visibility);
    window.removeEventListener("blur", visibility);
    window.removeEventListener("pageshow", visibility);
    window.removeEventListener("pagehide", pagehide);
    document.removeEventListener("visibilitychange", visibility);
    stopRunning = undefined;
  };
  return stopRunning;
}
