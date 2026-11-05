import { useEffect, useMemo, useRef, useState } from "react";
import { RouteLink } from "../lib/router";
import {
  CREDENTIALS,
  EDUCATION,
  EXPERIENCE,
  PROFILE_LINKS,
  PUBLICATIONS,
  TOOLKIT,
  type Credential,
} from "./profile-details";
import { ProfileNumbers } from "./profile-summary";
import "./profile-sections.css";

function useSearchDestination(prefix: string, reset: () => void) {
  const latest = useRef(reset);
  latest.current = reset;
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash.startsWith(prefix)) latest.current();
    };
    window.addEventListener("portfolio:navigate", reveal);
    window.addEventListener("hashchange", reveal);
    return () => {
      window.removeEventListener("portfolio:navigate", reveal);
      window.removeEventListener("hashchange", reveal);
    };
  }, [prefix]);
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="pf-section-heading">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export function ExperienceSection() {
  return (
    <section id="experience" className="pf-section pf-profile-section">
      <SectionHeading
        title="Where I’ve done the work."
        description="The responsibilities behind the project names."
      />
      <div className="pf-experience-list">
        {EXPERIENCE.map((entry) => (
          <details key={entry.id} id={`experience-${entry.id}`} data-search-target className="pf-experience-entry">
            <summary>
              <span className="pf-experience-date">{entry.date}</span>
              <span className="pf-experience-title">
                <strong>{entry.role}</strong>
                <span>
                  {entry.organization} · {entry.location}
                </span>
              </span>
              <span className="pf-disclosure-mark" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="pf-experience-body">
              <p>{entry.summary}</p>
              <ul>
                {entry.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              {"href" in entry && (
                <RouteLink className="pf-action" href={entry.href}>
                  {entry.link} ↗
                </RouteLink>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

const ALIASES: Record<string, string> = {
  py: "python",
  ipynb: "jupyter",
  notebooks: "jupyter",
  colab: "jupyter",
  js: "javascript",
  ts: "typescript",
  k8s: "kubernetes",
  tf: "tensorflow",
  hf: "hugging face",
  postgres: "postgresql",
  sklearn: "scikit-learn",
  torch: "pytorch",
  cv: "vision",
  llms: "llm",
  embeddings: "retrieval",
  agentic: "agents",
  finetuning: "fine-tuning",
  stats: "statistics",
  prob: "probability",
  seeds: "peace",
  volunteering: "community",
};
function termsFor(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => ALIASES[term] || term);
}
function nearWord(word: string, term: string) {
  if (term.length < 4 || Math.abs(word.length - term.length) > 1) return false;
  let previous = Array.from({ length: term.length + 1 }, (_, i) => i);
  for (let i = 1; i <= word.length; i++) {
    const row = [i];
    for (let j = 1; j <= term.length; j++)
      row[j] = Math.min(
        row[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (word[i - 1] === term[j - 1] ? 0 : 1),
      );
    previous = row;
  }
  return previous[term.length] <= 1;
}
function matches(haystack: string, terms: string[]) {
  const lower = haystack.toLowerCase();
  return terms.every((term) =>
    term.length === 1
      ? lower.split(/[^a-z0-9+#.]+/).includes(term)
      : lower.includes(term) ||
        lower.split(/[^a-z0-9+#.]+/).some((word) => nearWord(word, term)),
  );
}

export function ToolkitSection() {
  const [query, setQuery] = useState("");
  useSearchDestination("#toolkit-", () => setQuery(""));
  const groups = useMemo(() => {
    const terms = termsFor(query);
    return TOOLKIT.map((group, index) => ({
      anchor: `toolkit-${index}`,
      ...group,
      shown: group.tools.filter((tool) =>
        matches(`${tool} ${group.name} ${group.tags}`, terms),
      ),
    })).filter((group) => group.shown.length);
  }, [query]);
  const count = groups.reduce((total, group) => total + group.shown.length, 0);
  return (
    <section id="toolkit" className="pf-section pf-profile-section">
      <SectionHeading
        title="Tools, with a reason."
        description="What I’ve used, grouped by the work it helps me do."
      />
      <div className="pf-profile-search">
        <label htmlFor="profile-tool-search">Find a tool or a field</label>
        <input
          id="profile-tool-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try Python, agents, databases…"
        />
        <span role="status">
          {count} {count === 1 ? "tool" : "tools"}
          {query ? " found" : " across five groups"}
        </span>
      </div>
      <div className="pf-tool-groups">
        {groups.map((group) => (
          <div className="pf-tool-group" key={group.name} id={group.anchor} data-search-target>
            <div>
              <h3>{group.name}</h3>
              <p>{group.why}</p>
              <RouteLink href={group.href}>{group.project} ↗</RouteLink>
            </div>
            <ul aria-label={`${group.name} tools`}>
              {group.shown.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
          </div>
        ))}
        {!count && (
          <p className="pf-profile-empty">
            No tools match that search. Try a broader field, or{" "}
            <button onClick={() => setQuery("")}>show the full toolkit</button>.
          </p>
        )}
      </div>
    </section>
  );
}

function CredentialViewer({
  credential,
  onClose,
}: {
  credential: Credential;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.showModal();
    close.current?.focus();
    return () => {
      panel?.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="pf-credential-dialog"
      aria-labelledby="credential-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="pf-credential-window">
        <header>
          <div>
            <h2 id="credential-title">{credential.name}</h2>
            <p>
              {credential.issuer} · {credential.issued}
            </p>
          </div>
          <button ref={close} onClick={onClose} aria-label="Close certificate">
            Close <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="pf-credential-image">
          <img
            src={credential.image}
            alt={`${credential.name}, issued to Muhammad Musa`}
          />
        </div>
        <footer>
          <a href={credential.file} target="_blank" rel="noreferrer">
            Open original {credential.file.endsWith(".pdf") ? "PDF" : "image"}{" "}
            ↗
          </a>
          {credential.verify && (
            <a href={credential.verify} target="_blank" rel="noreferrer">
              Verify with issuer ↗
            </a>
          )}
        </footer>
      </div>
    </dialog>
  );
}

export function CertificatesSection() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All certificates");
  const [selected, setSelected] = useState<Credential | null>(null);
  useSearchDestination("#credential-", () => {
    setQuery("");
    setGroup("All certificates");
  });
  const groups = [
    "All certificates",
    ...new Set(CREDENTIALS.map((item) => item.group)),
  ];
  const shown = CREDENTIALS.filter(
    (item) =>
      (group === "All certificates" || item.group === group) &&
      matches(
        `${item.name} ${item.issuer} ${item.tags} ${item.summary}`,
        termsFor(query),
      ),
  );
  return (
    <section id="certificates" className="pf-section pf-profile-section">
      <SectionHeading
        title="Still learning."
        description="Courses, community work and the original certificates behind them."
      />
      <div className="pf-profile-search">
        <label htmlFor="profile-certificate-search">Find a certificate</label>
        <input
          id="profile-certificate-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a subject or issuer…"
        />
        <span role="status">
          {shown.length} of {CREDENTIALS.length}
        </span>
      </div>
      <div
        className="pf-credential-filters"
        role="group"
        aria-label="Certificate category"
      >
        {groups.map((name) => (
          <button
            key={name}
            aria-pressed={group === name}
            onClick={() => setGroup(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="pf-credential-grid">
        {shown.map((item) => (
          <button
            key={item.id}
            id={`credential-${item.id}`}
            data-search-target
            className="pf-credential-card"
            onClick={() => setSelected(item)}
            aria-label={`View certificate: ${item.name}`}
          >
            <div className="pf-credential-thumb">
              <img
                src={item.image}
                alt=""
                loading="lazy"
                width="400"
                height="280"
              />
            </div>
            <span className="pf-credential-meta">
              {item.issuer} · {item.issued}
            </span>
            <strong>{item.name}</strong>
            <span>{item.summary}</span>
            <span className="pf-credential-open">View original ↗</span>
          </button>
        ))}
      </div>
      {!shown.length && (
        <p className="pf-profile-empty">
          No certificates match.{" "}
          <button
            onClick={() => {
              setQuery("");
              setGroup("All certificates");
            }}
          >
            Show all nine
          </button>
          .
        </p>
      )}
      {selected && (
        <CredentialViewer
          credential={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

export function PublicationsSection() {
  return (
    <section id="publications" className="pf-section pf-profile-section">
      <SectionHeading
        title="Work in print."
        description="Two contributions, with their format and my role made explicit."
      />
      <div className="pf-publications">
        {PUBLICATIONS.map((paper, index) => (
          <article key={paper.href} id={`publication-${index}`} data-search-target>
            <div>
              <span>{paper.venue}</span>
              <span>{paper.format}</span>
            </div>
            <h3>
              <a href={paper.href} target="_blank" rel="noreferrer">
                {paper.title} <span aria-hidden="true">↗</span>
              </a>
            </h3>
            <p>{paper.detail}</p>
            <small>{paper.role}</small>
            {"project" in paper && (
              <RouteLink className="pf-action" href={paper.project}>
                Inside the project ↗
              </RouteLink>
            )}
          </article>
        ))}
      </div>
      <a
        className="pf-action"
        href={PROFILE_LINKS.orcid}
        target="_blank"
        rel="noreferrer"
      >
        My ORCID record ↗
      </a>
    </section>
  );
}

export function ProfileDetailsPage() {
  useEffect(() => {
    const main = document.getElementById("main");
    main?.focus({ preventScroll: true });
  }, []);
  return (
    <main id="main" className="pf-profile-page" tabIndex={-1}>
      <header className="pf-page-intro">
        <span>Experience, education & the person behind the work</span>
        <h1>
          A few things
          <br />
          that shaped me.
        </h1>
        <p>
          I’m Muhammad Musa. I build software, study how language models fail,
          and teach computer science. The work has taken me from Lahore to
          Madison, with plenty of learning between the two.
        </p>
        <div className="pf-profile-links">
          <a href={PROFILE_LINKS.resume}>Résumé ↓</a>
          <a href={PROFILE_LINKS.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a href={PROFILE_LINKS.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
        </div>
      </header>
      <nav className="pf-profile-index" aria-label="On this page">
        {[
          ["story", "Story"],
          ["experience", "Experience"],
          ["education", "Education"],
          ["publications", "Publications"],
          ["toolkit", "Toolkit"],
          ["certificates", "Certificates"],
          ["humanity", "Why this work"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <section id="story" className="pf-section pf-profile-section">
        <SectionHeading
          title="A few turning points."
          description="The short version. The work and the people came together."
        />
        <ol className="pf-turning-points">
          <li>
            <span>2019 — 2023</span>
            <div>
              <h3>Learning by making.</h3>
              <p>
                At LUMS, I moved between computer-science coursework, research
                and teaching. I led a seven-person UAV team at TEKNOFEST and
                worked on blockchain credentials before graduating.
              </p>
            </div>
          </li>
          <li>
            <span>2022 — 2023</span>
            <div>
              <h3>Questions become research.</h3>
              <p>
                An ASONAM poster and a collaborative ransomware-provenance paper
                taught me to make the scope of a result as clear as the result
                itself.
              </p>
            </div>
          </li>
          <li>
            <span>2023 onward</span>
            <div>
              <h3>Lahore to Madison.</h3>
              <p>
                I began graduate study at UW–Madison and kept teaching alongside
                it. Building course infrastructure made reliability and clear
                explanations part of the same job.
              </p>
            </div>
          </li>
          <li>
            <span>2025 onward</span>
            <div>
              <h3>Taking responsibility for a product.</h3>
              <p>
                With WUMI Health, I brought the patient record, the interface
                and the permission model into one system. The useful question
                became what I could make dependable for the person using it.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <ExperienceSection />
      <section id="education" className="pf-section pf-profile-section">
        <SectionHeading
          title="The foundations."
          description="Two universities. A continuing education in how systems behave."
        />
        <div className="pf-education-list">
          {EDUCATION.map((entry, index) => (
            <article key={entry.school} id={`education-${index}`} data-search-target>
              <span>{entry.date}</span>
              <h3>{entry.school}</h3>
              <strong>{entry.degree}</strong>
              <p>{entry.detail}</p>
              <p className="pf-education-result">{entry.result}</p>
              <details>
                <summary>Selected coursework</summary>
                <ul>
                  {entry.courses.map((course) => (
                    <li key={course}>{course}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
        <details className="pf-recognition">
          <summary>Recognition along the way</summary>
          <ul>
            <li>Dean’s Honor List in every academic semester at LUMS.</li>
            <li>Top-15 Merit Scholarship, sophomore and junior years.</li>
            <li>
              TEKNOFEST UAV competition: team finished in the global top 20.
            </li>
            <li>Third place in a Stacks blockchain hackathon.</li>
          </ul>
        </details>
      </section>
      <PublicationsSection />
      <ToolkitSection />
      <CertificatesSection />
      <section
        id="humanity"
        className="pf-section pf-profile-section pf-purpose"
      >
        <SectionHeading
          title="Who is this useful for?"
          description="The question I want my work to answer."
        />
        <p className="pf-purpose-lead">
          A patient trying to carry their history between clinics. A student
          facing an unfamiliar idea. A speaker whose language is poorly
          represented in software.
        </p>
        <p>
          These are reasons I keep returning to healthcare, teaching, language
          technology and security. I like working on a system all the way
          through: the data, the failure case, the interface and the explanation
          someone else needs to trust it.
        </p>
        <div className="pf-purpose-links">
          <RouteLink href="/work/wumi">
            Patient control · WUMI Health ↗
          </RouteLink>
          <RouteLink href="/work/shahmukhi">
            Language access · Shahmukhi Punjabi ↗
          </RouteLink>
          <RouteLink href="/work/research">
            Safety & useful evaluation ↗
          </RouteLink>
        </div>
        <div className="pf-community-note">
          <h3>Outside the project brief.</h3>
          <p>
            The Bulandi Fellowship brought me into community education and
            dialogue. Student competitions taught me to coordinate a team.
            Teaching keeps giving me a practical test: can I help someone
            understand this well enough to build on it?
          </p>
        </div>
      </section>
    </main>
  );
}
