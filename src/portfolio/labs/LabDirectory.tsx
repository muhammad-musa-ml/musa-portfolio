import { RouteLink } from "../../lib/router";
import { LABS } from "./catalog";
import "./labs.css";

function PathPreview() {
  return (
    <svg className="pf-lab-card-art" viewBox="0 0 500 220" aria-hidden="true">
      <defs>
        <pattern
          id="lab-route-grid"
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M25 0H0V25"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".11"
          />
        </pattern>
      </defs>
      <rect width="500" height="220" fill="url(#lab-route-grid)" />
      <path
        d="M100 45V170H225V95H325V170H400"
        stroke="var(--pf-teal)"
        strokeOpacity=".16"
        strokeWidth="44"
        fill="none"
      />
      <path
        className="pf-route-preview-path"
        d="M100 45V170H225V95H325V170H400"
        stroke="var(--pf-accent)"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M145 20V120H185M270 145V220M370 20V120H440"
        stroke="var(--pf-muted)"
        strokeOpacity=".6"
        strokeWidth="10"
        fill="none"
      />
      <circle cx="100" cy="45" r="8" fill="var(--pf-teal)" />
      <circle
        cx="400"
        cy="170"
        r="9"
        fill="var(--pf-bg)"
        stroke="var(--pf-accent)"
        strokeWidth="3"
      />
    </svg>
  );
}

function LearningPreview() {
  return (
    <svg className="pf-lab-card-art" viewBox="0 0 500 220" aria-hidden="true">
      <path d="M0 220V0H300L200 220Z" fill="var(--pf-teal)" fillOpacity=".07" />
      <path
        d="M500 0V220H200L300 0Z"
        fill="var(--pf-accent)"
        fillOpacity=".07"
      />
      <path
        d="M300 0L200 220"
        stroke="var(--pf-text)"
        strokeWidth="1.4"
        strokeDasharray="4 7"
      />
      {[
        [80, 65],
        [120, 112],
        [163, 60],
        [195, 105],
        [142, 172],
        [232, 48],
        [90, 155],
        [215, 152],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill="var(--pf-teal)" />
      ))}
      {[
        [325, 57],
        [368, 105],
        [316, 157],
        [414, 67],
        [395, 176],
        [276, 124],
        [346, 192],
        [440, 136],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x - 5}
          y={y - 5}
          width="10"
          height="10"
          rx="2"
          fill="var(--pf-accent)"
        />
      ))}
    </svg>
  );
}

export default function LabDirectory() {
  return (
    <section className="pf-lab-directory" aria-label="Interactive browser labs">
      <div className="pf-lab-directory-heading">
        <span>Make an experiment of it.</span>
        <p>Real algorithms. Your decisions.</p>
      </div>
      <div className="pf-lab-directory-grid">
        {LABS.map((lab) => (
          <RouteLink
            key={lab.id}
            href={`/playground/${lab.id}`}
            className="pf-lab-card pf-glass"
          >
            <div className="pf-lab-card-top">
              <span>{lab.subject}</span>
              <span>{lab.number}</span>
            </div>
            {lab.id === "pathfinding" ? <PathPreview /> : <LearningPreview />}
            <div className="pf-lab-card-copy">
              <h2>{lab.title}</h2>
              <p>{lab.description}</p>
              <span className="pf-lab-card-action">
                {lab.action}
                <span aria-hidden="true">↗</span>
              </span>
            </div>
          </RouteLink>
        ))}
      </div>
    </section>
  );
}
