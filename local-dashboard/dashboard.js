const $ = (selector) => document.querySelector(selector);
const number = (value) => new Intl.NumberFormat().format(value);
const duration = (seconds) =>
  seconds < 60
    ? seconds + "s"
    : Math.floor(seconds / 60) + "m " + Math.round(seconds % 60) + "s";
const date = (value) =>
  new Date(value + "T12:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const empty = (message = "No recorded activity in this range.") =>
  node("p", "empty", message);
const today = () => new Date().toISOString().slice(0, 10);
function setRange(days) {
  const end = new Date();
  $("#to").value = today();
  $("#from").value = new Date(end.getTime() - (days - 1) * 86400000)
    .toISOString()
    .slice(0, 10);
}
setRange(7);
$("#to").max = today();
$("#from").max = today();
function table(headers, rows) {
  const element = node("table");
  const head = node("thead"),
    top = node("tr");
  headers.forEach((heading) => {
    const cell = node("th", "", heading);
    cell.scope = "col";
    top.append(cell);
  });
  head.append(top);
  const body = node("tbody");
  rows.forEach((row) => {
    const tr = node("tr");
    row.forEach((value) => {
      const cell = node("td");
      cell.append(
        value instanceof Node ? value : document.createTextNode(String(value)),
      );
      tr.append(cell);
    });
    body.append(tr);
  });
  element.append(head, body);
  return element;
}
function rank(target, rows, limit = 10) {
  const container = $(target);
  if (!rows.length) {
    container.replaceChildren(empty());
    return;
  }
  const list = node("ol", "rank-list");
  const maximum = Math.max(...rows.map((row) => row.count));
  rows.slice(0, limit).forEach((row) => {
    const li = node("li"),
      name = node("div", "rank-name");
    name.append(
      node("span", "", row.name),
      node("strong", "", number(row.count)),
    );
    const track = node("i", "rank-track"),
      bar = node("i", "rank-bar");
    bar.style.width = (row.count / maximum) * 100 + "%";
    li.append(name, track, bar);
    list.append(li);
  });
  container.replaceChildren(list);
}
function chart(days, connected) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = (tag, attributes) => {
    const element = document.createElementNS(namespace, tag);
    for (const [key, value] of Object.entries(attributes))
      element.setAttribute(key, value);
    return element;
  };
  const figure = svg("svg", {
    viewBox: "0 0 1100 240",
    role: "img",
    "aria-label": "Daily page views and anonymous sessions",
  });
  const max = Math.max(
    4,
    ...days.map((day) => day.pageviews),
    ...days.map((day) => day.sessions),
  );
  const left = 36,
    right = 1080,
    top = 16,
    bottom = 202;
  const x = (index) =>
    days.length === 1
      ? (left + right) / 2
      : left + (index / (days.length - 1)) * (right - left);
  const y = (value) => bottom - (value / max) * (bottom - top);
  for (let i = 0; i <= 4; i++) {
    const value = (max * i) / 4;
    figure.append(
      svg("line", {
        x1: left,
        y1: y(value),
        x2: right,
        y2: y(value),
        stroke: "#f2ebdd14",
      }),
    );
    const text = svg("text", { x: 2, y: y(value) + 4 });
    text.textContent = String(Math.round(value));
    figure.append(text);
  }
  for (const [key, color] of [
    ["pageviews", "#ffb454"],
    ["sessions", "#63e2c6"],
  ]) {
    figure.append(
      svg("polyline", {
        points: days
          .map((day, index) => x(index) + "," + y(day[key]))
          .join(" "),
        fill: "none",
        stroke: color,
        "stroke-width": 2,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      }),
    );
    days.forEach((day, index) => {
      const dot = svg("circle", {
        cx: x(index),
        cy: y(day[key]),
        r: 3,
        fill: color,
      });
      const title = svg("title", {});
      title.textContent =
        date(day.day) +
        ": " +
        day[key] +
        (key === "pageviews" ? " page views" : " sessions");
      dot.append(title);
      figure.append(dot);
    });
  }
  const stride = Math.max(1, Math.ceil(days.length / 8));
  days.forEach((day, index) => {
    if (index % stride && index !== days.length - 1) return;
    const text = svg("text", {
      x: x(index),
      y: 231,
      "text-anchor":
        index === 0 ? "start" : index === days.length - 1 ? "end" : "middle",
    });
    text.textContent = date(day.day);
    figure.append(text);
  });
  $("#chart").replaceChildren(figure);
  if (!connected || !days.some((day) => day.pageviews))
    $("#chart").append(
      node(
        "p",
        "chart-empty",
        connected
          ? "No recorded visits in this range."
          : "Connect analytics to see the arrival pattern.",
      ),
    );
  $("#daily-table").replaceChildren(
    table(
      ["UTC date", "Page views", "Sessions", "Clicks"],
      days.map((day) => [day.day, day.pageviews, day.sessions, day.clicks]),
    ),
  );
}
function sessions(rows, total) {
  $("#journey-count").textContent =
    (rows.length < total ? "Latest " + rows.length + " of " : "") +
    number(total) +
    " sessions";
  const container = $("#session-list");
  if (!rows.length) {
    container.replaceChildren(
      empty(
        "Journeys appear after measured visits arrive. No sample visitors are mixed into live data.",
      ),
    );
    return;
  }
  container.replaceChildren(
    ...rows.map((session) => {
      const details = node("details", "session"),
        summary = node("summary"),
        identity = node("span", "session-id");
      identity.append(
        node("strong", "", "Session " + session.id.slice(0, 8)),
        node(
          "small",
          "",
          new Date(session.start).toLocaleString() + " · " + session.device,
        ),
      );
      const paths = session.events.filter((event) =>
        ["pageview", "section"].includes(event.type),
      );
      const journey = node("span", "session-path");
      paths.slice(0, 4).forEach((event, index) => {
        if (index) journey.append(node("i", "", "→"));
        journey.append(node("span", "", event.label));
      });
      if (paths.length > 4)
        journey.append(node("i", "", "+" + (paths.length - 4)));
      const location = [session.location?.city, session.location?.country]
        .filter(Boolean)
        .join(", ");
      summary.append(
        identity,
        journey,
        node("span", "session-place", location || "Location unavailable"),
        node("span", "session-time", duration(session.dwell)),
      );
      const list = node("ol", "event-list");
      session.events.slice(-100).forEach((event) => {
        const row = node("li");
        row.dataset.type = event.type;
        const time = node(
          "time",
          "",
          new Date(event.at).toLocaleTimeString(undefined, { hour12: false }),
        );
        time.dateTime = event.at;
        const type =
          event.type === "pageview"
            ? "Page view"
            : event.type === "section"
              ? "Section"
              : event.type === "dwell"
                ? "Active time"
                : event.type === "scroll"
                  ? "Scroll"
                  : "Click";
        const description =
          event.type === "dwell"
            ? duration(event.value) + " on " + event.label
            : event.type === "scroll"
              ? "Reached " + event.value + "% of " + event.label
              : event.label;
        row.append(
          time,
          node("span", "event-type", type),
          node("strong", "", description),
        );
        list.append(row);
      });
      details.append(
        summary,
        list,
        node(
          "p",
          "session-notice",
          session.referrer +
            " · Event times are server receipt times; events can arrive in 15-second batches." +
            (session.events.length > 100
              ? " Showing the latest 100 events."
              : ""),
        ),
      );
      return details;
    }),
  );
}
let requestNumber = 0;
async function load(refresh = false) {
  const from = $("#from").value,
    to = $("#to").value;
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  const notice = $("#notice");
  if (!Number.isFinite(days) || days < 1 || days > 30) {
    notice.hidden = false;
    notice.textContent = "Choose a valid range of 1–30 days.";
    return;
  }
  const current = ++requestNumber;
  const button = $("#refresh");
  button.disabled = true;
  button.textContent = "Loading…";
  $("#main").setAttribute("aria-busy", "true");
  try {
    const response = await fetch(
      "/api/report?" +
        new URLSearchParams({ from, to, ...(refresh ? { refresh: "1" } : {}) }),
      { signal: AbortSignal.timeout(60_000), cache: "no-store" },
    );
    const data = await response.json();
    if (current !== requestNumber) return;
    if (!response.ok)
      throw new Error(data.error || "Could not load the report.");
    $("#source").textContent = data.source;
    $("#connection").dataset.connected = String(data.connected);
    $("#connection span").textContent = data.connected
      ? data.source === "Local test receiver"
        ? "Local receiver ready"
        : "Connected"
      : "Not connected";
    notice.hidden = !data.error && data.source !== "Local test receiver";
    notice.textContent =
      data.error ||
      "Local test receiver. These events come only from your local test setup; they are separate from the live portfolio.";
    for (const [id, value] of [
      ["sessions-total", number(data.totals.sessions)],
      ["views-total", number(data.totals.pageviews)],
      ["clicks-total", number(data.totals.clicks)],
      ["active-total", duration(data.totals.meanActiveSeconds)],
    ])
      $("#" + id).textContent = data.connected ? value : "—";
    $("#range-label").textContent =
      date(from) + " – " + date(to) + ", " + to.slice(0, 4) + " · UTC";
    chart(data.timeline, data.connected);
    $("#pages-table").replaceChildren(
      data.pages.length
        ? table(
            ["Page", "Views", "Active time", "Bottom reached"],
            data.pages.map((page) => {
              const name = node("div", "", page.label);
              name.append(node("small", "", page.path));
              return [
                name,
                number(page.pageviews),
                duration(page.dwell),
                page.completed + " / " + page.readers + " sessions",
              ];
            }),
          )
        : empty(),
    );
    rank("#click-list", data.clicks);
    rank("#location-list", data.locations);
    rank("#device-list", data.devices);
    rank("#referrer-list", data.referrers);
    sessions(data.sessions, data.totals.sessions);
    $("#updated").textContent =
      "Report loaded " +
      new Date(data.generatedAt).toLocaleString() +
      ". Refresh is manual; the dashboard does not poll the live database.";
    $("#export").href = "/api/export?" + new URLSearchParams({ from, to });
    $("#export").setAttribute("aria-disabled", String(!data.connected));
  } catch (error) {
    if (current !== requestNumber) return;
    notice.hidden = false;
    notice.textContent =
      error.name === "TimeoutError"
        ? "The export took too long. Try a shorter date range or check the server connection."
        : error.message;
    $("#connection").dataset.connected = "false";
    $("#connection span").textContent = "Connection failed";
    $("#export").setAttribute("aria-disabled", "true");
  } finally {
    if (current === requestNumber) {
      button.disabled = false;
      button.textContent = "Refresh";
      $("#main").removeAttribute("aria-busy");
    }
  }
}
$("#range").addEventListener("submit", (event) => {
  event.preventDefault();
  void load(true);
});
document.querySelectorAll("[data-days]").forEach((button) =>
  button.addEventListener("click", () => {
    setRange(Number(button.dataset.days));
    void load();
  }),
);
void load();
