import { useEffect, useRef, useState } from "react";
import { RouteLink } from "../lib/router";
import { trackAnalyticsControl } from "../lib/analytics";
import { startPlannerDownload, validatePlannerDownload } from "./kaiju-download.mjs";
import "./kaiju-planner.css";

function plannerUrl(): string {
  return import.meta.env.DEV
    ? "http://127.0.0.1:8766/"
    : new URL("/kaiju/", window.location.origin).href;
}

/** Production runs inside this portfolio; the private engine stays in server functions. */
export default function KaijuPlanner({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [download, setDownload] = useState<{ url: string; filename: string } | null>(null);
  const downloadUrl = useRef<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const url = plannerUrl();
  useEffect(() => () => { if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current); }, []);
  useEffect(() => {
    if (!open || !url) return;
    setReady(false); setSlow(false);
    const timeout = window.setTimeout(() => setSlow(true), 12_000);
    const origin = new URL(url).origin;
    const handledDownloads = new Set<string>();
    let lastDownload = 0;
    const theme = () => frame.current?.contentWindow?.postMessage({
      type: "kaiju:theme", theme: document.querySelector(".pf")?.getAttribute("data-theme") === "light" ? "light" : "dark", downloadRelay: origin === window.location.origin ? 1 : 0,
    }, origin);
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "kaiju:ready") { clearTimeout(timeout); setReady(true); setSlow(false); theme(); }
      if (origin !== window.location.origin || event.data?.type !== "kaiju:download") return;
      const file = validatePlannerDownload(event, origin, frame.current?.contentWindow || null);
      if (!file || handledDownloads.has(file.requestId) || Date.now() - lastDownload < 500) return;
      lastDownload = Date.now();
      if (handledDownloads.size >= 100) handledDownloads.clear();
      handledDownloads.add(file.requestId);
      const nextUrl = startPlannerDownload(file);
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = nextUrl;
      setDownload({ url: nextUrl, filename: file.filename });
      frame.current?.contentWindow?.postMessage({ type: "kaiju:download-ready", requestId: file.requestId }, origin);
    };
    window.addEventListener("message", receive);
    const root = document.querySelector(".pf");
    const observer = new MutationObserver(theme);
    if (root) observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { window.removeEventListener("message", receive); observer.disconnect(); clearTimeout(timeout); };
  }, [open, url, attempt]);

  return <section className="pf-kaiju" aria-label="Try the Kaiju Cats planner" id="try-planner" data-search-target>
    <div className="pf-kaiju-toolbar">
      <div><span className="pf-kaiju-kicker">Kaiju Cats · interactive build</span><h2>Give the city a plan.</h2></div>
      <RouteLink href="/writing/three-cats-fifteen-turns#section-0">Read how I built it ↗</RouteLink>
    </div>
    <ol className="pf-kaiju-steps" aria-label="How to use the planner">
      <li><span>01</span> Add a screenshot</li><li><span>02</span> Check the board & budget</li><li><span>03</span> Search, then inspect the replay</li>
    </ol>
    {!open || !url ? <div className="pf-kaiju-cover">
      <img src="/images/kaiju-board.png" alt="The example Kaiju Cats board: three colored cats, buildings, power plants, obstacles and matching beds." width="1888" height="957" loading="lazy" />
      <div className="pf-kaiju-launch">
        {url ? <button className="pf-solid-button" onClick={() => { trackAnalyticsControl("kaiju-open"); setOpen(true); }}>Open the planner <span aria-hidden="true">↗</span></button>
          : <p>The interactive planner is not connected on this deployment yet. The build story and example remain available below.</p>}
        <span>Screenshot → editable board → command placements</span>
      </div>
    </div> : <>
      <div className="pf-kaiju-status" role="status">
        {ready ? <span>Planner ready · your search starts when you choose</span> : <span>{slow ? "The planner is taking longer to connect." : "Opening the planner…"}</span>}
        {slow && !ready && <button onClick={() => { trackAnalyticsControl("kaiju-reconnect"); setAttempt(value => value + 1); }}>Reconnect</button>}
        {download && <a href={download.url} download={download.filename}>Download {download.filename === "kaiju-plan.json" ? "plan & replay" : "board"} JSON</a>}
        <RouteLink href="/writing/three-cats-fifteen-turns">Read the build story →</RouteLink>
      </div>
      <iframe key={attempt} ref={frame} src={url} title="Kaiju Cats screenshot-to-plan workspace"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" allow="clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin" className="pf-kaiju-frame" />
    </>}
    <p className="pf-kaiju-caption">A working search tool, with an editable interpretation and a predicted replay. Review the screenshot reading before running a plan; a simulated score still needs comparison with the game.</p>
  </section>;
}
