import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { RouteLink } from "../lib/router";
import type { BackgroundTheme } from "./backgrounds/SpotlightBackground";
import type { VisualVariant } from "./visuals/VisualStudy";
import "./studio.css";

const VisualStudy = lazy(() => import("./visuals/VisualStudy"));
const OPTIONS: { id: VisualVariant; name: string; idea: string }[] = [
  {
    id: "hypercube",
    name: "Beyond three dimensions",
    idea: "A four-dimensional structure, projected into a space you can explore.",
  },
  {
    id: "tokens",
    name: "Inside the attention",
    idea: "A sculptural view of information moving through a system.",
  },
  {
    id: "latent",
    name: "A space of possibilities",
    idea: "A landscape of points that changes its shape without a cut.",
  },
];
const MOTIONS = [
  {
    id: "trace",
    name: "Trace",
    copy: "A line finds the shape. The content follows.",
  },
  {
    id: "fold",
    name: "Unfold",
    copy: "A pane opens in depth, then settles into the page.",
  },
  {
    id: "resolve",
    name: "Resolve",
    copy: "A pattern comes into focus, with the reading kept steady.",
  },
];

export default function StudioPage({ theme, toggleTheme }: { theme: BackgroundTheme; toggleTheme: () => void }) {
  const [selected, setSelected] = useState<VisualVariant>("hypercube");
  const [progress, setProgress] = useState(0);
  const [motion, setMotion] = useState("trace");
  const [replay, setReplay] = useState(0);
  const [manual, setManual] = useState(false);
  const track = useRef<HTMLElement>(null);
  useEffect(() => {
    if (manual) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!track.current) return;
      const bounds = track.current.getBoundingClientRect();
      const range = Math.max(1, bounds.height - window.innerHeight);
      setProgress(Math.max(0, Math.min(1, -bounds.top / range)));
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      cancelAnimationFrame(frame);
    };
  }, [manual]);
  const current = OPTIONS.find((option) => option.id === selected)!;
  return (
    <main id="main" className="pf-studio">
      <header className="pf-page-intro">
        <span>The motion studio · working options</span>
        <h1>
          Make the unseen
          <br />
          visible.
        </h1>
        <p>
          Three alternatives to the infinity sculpture. Scroll through the form,
          or use the timeline. These are studies to choose from, not additions
          to the homepage.
        </p>
        <RouteLink className="pf-action" href="/backgrounds">
          Compare the hidden backgrounds →
        </RouteLink>
      </header>
      <section className="pf-studio-track" ref={track}>
        <div className="pf-studio-sticky">
          <div
            className="pf-studio-switcher pf-glass"
            aria-label="Choose a hero study"
          >
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                aria-pressed={option.id === selected}
              >
                {option.name}
              </button>
            ))}
            <button className="pf-studio-theme" onClick={toggleTheme}>{theme === "dark" ? "Try light" : "Try dark"}</button>
          </div>
          <div className="pf-studio-canvas">
            <Suspense
              fallback={
                <div className="pf-visual-loading" role="status">
                  Preparing this study…
                </div>
              }
            >
              <VisualStudy
                variant={selected}
                theme={theme}
                progress={progress}
              />
            </Suspense>
          </div>
          <div className="pf-studio-caption">
            <div>
              <h2>{current.name}</h2>
              <p>{current.idea}</p>
            </div>
            <span>
              {Math.round(progress * 100)}%
              <small>{manual ? "Your timeline" : "Scroll to transform"}</small>
            </span>
          </div>
          <div className="pf-studio-timeline">
            <label htmlFor="visual-progress">Explore the transformation</label>
            <input
              id="visual-progress"
              type="range"
              min="0"
              max="100"
              value={Math.round(progress * 100)}
              onChange={(event) => {
                setManual(true);
                setProgress(Number(event.target.value) / 100);
              }}
            />
            {manual && (
              <button onClick={() => setManual(false)}>Follow scrolling</button>
            )}
          </div>
          <span className="pf-studio-scroll-note">
            Keep scrolling. One continuous transformation, no scene cut.
          </span>
        </div>
      </section>
      <section className="pf-motion-options pf-section">
        <div className="pf-section-heading">
          <h2>How it moves.</h2>
          <p>
            Small moments for opening
            <br />a page or revealing a project.
          </p>
        </div>
        <div className="pf-motion-layout">
          <nav aria-label="Choose a transition">
            {MOTIONS.map((option) => (
              <button
                key={option.id}
                aria-pressed={motion === option.id}
                onClick={() => {
                  setMotion(option.id);
                  setReplay((value) => value + 1);
                }}
              >
                <strong>{option.name}</strong>
                <span>{option.copy}</span>
              </button>
            ))}
          </nav>
          <div className="pf-motion-preview pf-glass">
            <div
              key={`${motion}-${replay}`}
              className={`pf-motion-sample pf-motion-sample--${motion}`}
            >
              <span>From a question to a working system.</span>
              <h3>
                Ideas,
                <br />
                put to work.
              </h3>
              <div aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <button
              className="pf-text-button"
              onClick={() => setReplay((value) => value + 1)}
            >
              Replay this transition <span>↻</span>
            </button>
          </div>
        </div>
        <p className="pf-studio-disclosure">
          These transitions demonstrate timing and movement. They do not pretend
          to be real loading progress. Reduced-motion preferences show the
          settled state.
        </p>
      </section>
      <section className="pf-studio-sources pf-section">
        <h2>Where the ingredients come from.</h2>
        <p>
          The forms and choreography are made for this portfolio. Reusable
          geometry and noise helpers come from the MIT-licensed Three.js
          examples, with source credits alongside the implementation. A useful
          reference is a starting point; the result still needs to fit the work.
        </p>
        <div>
          <a
            href="https://github.com/mrdoob/three.js/tree/dev/examples"
            target="_blank"
            rel="noreferrer"
          >
            Three.js examples ↗
          </a>
          <a
            href="https://r3f.docs.pmnd.rs/advanced/scaling-performance"
            target="_blank"
            rel="noreferrer"
          >
            Demand rendering ↗
          </a>
          <a
            href="https://kiln-by-m.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            The Kiln reference library ↗
          </a>
        </div>
      </section>
    </main>
  );
}
