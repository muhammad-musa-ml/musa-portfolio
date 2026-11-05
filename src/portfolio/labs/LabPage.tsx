import { lazy, Suspense, useEffect, useRef } from "react";
import { RouteLink } from "../../lib/router";
import { LABS, type LabId } from "./catalog";
import "./labs.css";

const PathfindingLab = lazy(() => import("./PathfindingLab"));
const LearningLab = lazy(() => import("./LearningLab"));

export default function LabPage({
  kind,
  openChat,
}: {
  kind: LabId;
  openChat: () => void;
}) {
  const lab = LABS.find((item) => item.id === kind)!;
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
  }, [kind]);
  return (
    <main id="main" tabIndex={-1} ref={main} className="pf-interactive-lab">
      <div className="pf-lab-breadcrumb">
        <RouteLink href="/playground">← All playgrounds</RouteLink>
        <span>
          {lab.subject} / {lab.number}
        </span>
      </div>
      <header className="pf-interactive-intro">
        <h1>{lab.title}</h1>
        <p>{lab.description}</p>
      </header>
      <nav className="pf-lab-page-tabs" aria-label="Choose a browser lab">
        {LABS.map((item) => (
          <RouteLink
            key={item.id}
            href={`/playground/${item.id}`}
            aria-current={item.id === kind ? "page" : undefined}
          >
            {item.title}
          </RouteLink>
        ))}
      </nav>
      <Suspense
        fallback={
          <div role="status" className="pf-lab-preparing pf-glass">
            Preparing the experiment…
          </div>
        }
      >
        {kind === "pathfinding" ? <PathfindingLab /> : <LearningLab />}
      </Suspense>
      <aside className="pf-lab-afterword">
        <div>
          <span>A small model of a bigger idea.</span>
          <p>
            These labs run in your browser. They make the mechanics visible; the
            project notes explain where I’ve used related ideas.
          </p>
        </div>
        <div>
          <RouteLink href={`/work/${lab.project}`}>
            {lab.connection} ↗
          </RouteLink>
          <button onClick={openChat}>Ask MusA.I about my work ↗</button>
        </div>
      </aside>
    </main>
  );
}
