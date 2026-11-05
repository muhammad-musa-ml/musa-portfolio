import { useMemo, useState } from "react";
import { RouteLink } from "../lib/router";
import { PROJECTS } from "./content";
import FluidTabs from "./FluidTabs";
import "./work-index.css";

const GROUPS = [
  { id: "all", label: "Everything" },
  { id: "research", label: "Research" },
  { id: "ml", label: "Machine learning" },
  { id: "build", label: "Building systems" },
  { id: "teach", label: "Teaching & leading" },
];
const MEMBERS: Record<string, string[]> = {
  research: ["research", "reprod", "tap", "extremism", "sentiment-robustness"],
  ml: [
    "shahmukhi",
    "serving",
    "research",
    "satellite",
    "mask-detection",
    "sentiment-robustness",
  ],
  build: [
    "wumi",
    "gauntlet",
    "kiln",
    "open-source",
    "lookup",
    "serving",
    "voice-agent",
  ],
  teach: ["uav", "teaching"],
};
export default function WorkIndex() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      PROJECTS.filter((project) => {
        const group =
          category === "all" || MEMBERS[category]?.includes(project.id);
        const hay =
          `${project.name} ${project.summary} ${project.category} ${project.technologies.join(" ")}`.toLowerCase();
        return (
          group &&
          query
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .every((term) => hay.includes(term))
        );
      }),
    [category, query],
  );
  return (
    <main id="main" className="pf-work-index">
      <header className="pf-page-intro">
        <span>The work, with the reasoning</span>
        <h1>
          Follow a question.
          <br />
          See what I built.
        </h1>
        <p>
          Products, research, and the systems around them. Open a project for my
          contribution, technical decisions, results, and what I would change.
        </p>
      </header>
      <section
        className="pf-work-browser"
        aria-label="Browse projects"
        id="journeys"
      >
        <div className="pf-work-filters pf-glass">
          <FluidTabs
            items={GROUPS}
            value={category}
            onChange={setCategory}
            label="Filter projects by area"
          />
          <label>
            Find a project
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Python, healthcare, security…"
            />
          </label>
        </div>
        <p className="pf-work-count" role="status">
          {results.length} {results.length === 1 ? "project" : "projects"}
          {query ? ` matching “${query}”` : " to explore"}
        </p>
        {category === "teach" && (
          <aside className="pf-work-teaching">
            <h2>Teaching is engineering, too.</h2>
            <p>
              Assignments, grading systems, and a team of teaching assistants.
              My experience page covers the people and systems behind the
              classroom.
            </p>
            <RouteLink href="/about#experience">
              Explore teaching & leadership ↗
            </RouteLink>
          </aside>
        )}
        <div className="pf-work-results">
          {results.map((project) => (
            <RouteLink
              className="pf-work-index-row"
              key={project.id}
              href={`/work/${project.id}`}
            >
              <span>{project.category}</span>
              <div>
                <h2>{project.name}</h2>
                <p>{project.summary}</p>
                <ul aria-label="Technologies">
                  {project.technologies.slice(0, 4).map((tool) => (
                    <li key={tool}>{tool}</li>
                  ))}
                </ul>
              </div>
              <span aria-hidden="true">↗</span>
            </RouteLink>
          ))}
        </div>
        {!results.length && category !== "teach" && (
          <div className="pf-work-empty">
            <p>No projects match these filters.</p>
            <button
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Show all work
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
