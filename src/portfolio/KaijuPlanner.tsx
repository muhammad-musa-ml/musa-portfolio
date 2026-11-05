import { useEffect, useRef, useState } from "react";
import { RouteLink } from "../lib/router";
import { trackAnalyticsControl } from "../lib/analytics";
import "./kaiju-planner.css";

function plannerUrl(): string | null {
  const configured = import.meta.env.VITE_KAIJU_APP_URL as string | undefined;
  if (!configured) return import.meta.env.DEV ? "http://127.0.0.1:8766/" : null;
  try {
    const url = new URL(configured);
    const local = ["127.0.0.1", "localhost"].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== "https:" && !(import.meta.env.DEV && local && url.protocol === "http:"))) return null;
    return url.href;
  } catch { return null; }
}

/** The public site embeds a separate service. No solver or recognizer is bundled here. */
export default function KaijuPlanner({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const url = plannerUrl();
  useEffect(() => {
    if (!open || !url) return;
    setReady(false); setSlow(false);
    const timeout = window.setTimeout(() => setSlow(true), 12_000);
    const origin = new URL(url).origin;
    const theme = () => frame.current?.contentWindow?.postMessage({
      type: "kaiju:theme", theme: document.querySelector(".pf")?.getAttribute("data-theme") === "light" ? "light" : "dark",
    }, origin);
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "kaiju:ready") { clearTimeout(timeout); setReady(true); setSlow(false); theme(); }
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
        <a href={url} target="_blank" rel="noreferrer">Open in its own tab ↗</a>
      </div>
      <iframe key={attempt} ref={frame} src={url} title="Kaiju Cats screenshot-to-plan workspace"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" allow="clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin" className="pf-kaiju-frame" />
    </>}
    <p className="pf-kaiju-caption">A working search tool, with an editable interpretation and a predicted replay. Review the screenshot reading before running a plan; a simulated score still needs comparison with the game.</p>
  </section>;
}
