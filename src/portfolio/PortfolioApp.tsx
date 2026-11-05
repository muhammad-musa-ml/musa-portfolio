import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { navigate, restoreHash, RouteLink, usePath } from "../lib/router";
import SpotlightBackground, {
  BACKGROUND_OPTIONS,
  type BackgroundTheme,
  type BackgroundVariant,
} from "./backgrounds/SpotlightBackground";
import { ARTICLES, BIO, PROJECTS, type PortfolioProject } from "./content";
import ProjectDemo, { DEMOS, type DemoKind } from "./Demos";
import { LABS } from "./labs/catalog";
import { TraceRoute } from "./motion/TraceMotion";
import PortfolioHeader from "./PortfolioHeader";
import ThemeIcon from "./ThemeIcon";
import { ProfileNumbers, ProfileSummary } from "./profile-summary";
import { trackAnalyticsAction } from "../lib/analytics";
import "./portfolio.css";
import "./home-refresh.css";
import "./theme-motion.css";

const PortfolioCommands = lazy(() => import("./PortfolioCommands"));
const BuildsPlayground = lazy(() => import("./BuildsPlayground"));
const WorkIndex = lazy(() => import("./WorkIndex"));
const AboutPage = lazy(() =>
  import("./profile-sections").then((module) => ({
    default: module.ProfileDetailsPage,
  })),
);
const SECTION_ROUTES: Record<string, string> = {
  "1": "/about#story",
  "2": "/work",
  "3": "/#work",
  "4": "/about#toolkit",
  "5": "/about#certificates",
  "6": "/about#humanity",
  "7": "/#contact",
};
const StudioPage = import.meta.env.DEV
  ? lazy(() => import("./StudioPage"))
  : null;
const ArticleSearch = lazy(() => import("./ArticleSearch"));
const ChatPanel = lazy(() => import("../components/chat/ChatPanel"));
const LabPage = import.meta.env.DEV
  ? lazy(() => import("./labs/LabPage"))
  : null;
const LabDirectory = import.meta.env.DEV
  ? lazy(() => import("./labs/LabDirectory"))
  : null;

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={down ? { transform: "rotate(90deg)" } : undefined}
    >
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function Footer({ openChat }: { openChat: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <footer className="pf-footer" id="contact">
      <div>
        <span>Have a question worth following?</span>
        <a href="mailto:mmusa2@wisc.edu">
          Let’s talk.
          <Arrow />
        </a>
      </div>
      <nav aria-label="Elsewhere">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText("mmusa2@wisc.edu");
              setCopied(true);
            } catch {
              window.location.href = "mailto:mmusa2@wisc.edu";
            }
          }}
          aria-label="Copy email address"
        >
          {copied ? "Email copied" : "Copy email"}
        </button>
        <a
          href="https://github.com/muhammad-musa-ml"
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
        <a
          href="https://www.linkedin.com/in/mmusa2/"
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn ↗
        </a>
        <a href="/Muhammad-Musa-Resume.pdf" target="_blank" rel="noreferrer">
          Résumé ↓
        </a>
        <a
          href="https://orcid.org/0009-0009-5542-8040"
          target="_blank"
          rel="noreferrer"
        >
          ORCID ↗
        </a>
        <button onClick={openChat}>Ask MusA.I</button>
      </nav>
      <div className="pf-footer-end">
        <span>
          Muhammad Musa · Ctrl / ⌘ K to search · / MusA.I · 1–7 jump sections
        </span>
        {import.meta.env.DEV && (
          <RouteLink href="/backgrounds">
            Explore the hidden layer <Arrow />
          </RouteLink>
        )}
      </div>
    </footer>
  );
}

function ProjectLink({
  project,
  children = "Inside the project",
}: {
  project: PortfolioProject;
  children?: string;
}) {
  return (
    <RouteLink className="pf-action" href={`/work/${project.id}`}>
      {children}
      <Arrow />
    </RouteLink>
  );
}

function LiveProjectLink({ project }: { project: PortfolioProject }) {
  const website = project.links.find((link) => link.label === "Visit website");
  return website ? (
    <a
      className="pf-action pf-live-project"
      href={website.url}
      target="_blank"
      rel="noreferrer"
    >
      Visit {project.name} <span aria-hidden="true">↗</span>
    </a>
  ) : null;
}

function Home({ openChat }: { openChat: () => void }) {
  const featured = PROJECTS.filter((project) => project.featured);
  return (
    <main id="main">
      <section className="pf-hero pf-hero-complete" id="intro">
        <div className="pf-hero-introduction">
          <div className="pf-position">
            <span className="pf-role-line">
              AI/ML engineer. Researcher. Teacher.
            </span>
            <p>
              Computer science.
              <br />
              Human consequences.
            </p>
            <span>
              I build systems for the people on the other side of the
              screen—from safer language models to patient-owned health records.
            </span>
            <div className="pf-hero-actions">
              <RouteLink className="pf-solid-button" href="/work">
                Explore my work <Arrow />
              </RouteLink>
              <a
                className="pf-action"
                href="/Muhammad-Musa-Resume.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Read my résumé <Arrow />
              </a>
            </div>
            <nav className="pf-hero-socials" aria-label="Connect with me">
              <a
                href="https://github.com/muhammad-musa-ml"
                target="_blank"
                rel="noreferrer"
              >
                GitHub ↗
              </a>
              <a
                href="https://www.linkedin.com/in/mmusa2/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn ↗
              </a>
              <a href="mailto:mmusa2@wisc.edu">Email ↗</a>
            </nav>
          </div>
          <aside className="pf-intro-evidence">
            <span>A little context</span>
            <p>
              From Lahore to Madison.
              <br />
              Research, engineering, and the classroom.
            </p>
            <ProfileNumbers />
            <RouteLink href="/about">
              The experience behind the numbers <Arrow />
            </RouteLink>
          </aside>
        </div>
        <h1 className="pf-name" aria-label="Muhammad Musa">
          MUSA
        </h1>
        <div className="pf-hero-foot">
          <span>
            Interested in AI/ML engineering
            <br />& applied research opportunities.
          </span>
          <RouteLink href="/#work">
            Selected work <Arrow down />
          </RouteLink>
        </div>
      </section>
      <p className="pf-assistant-invite">
        Questions about my work?{" "}
        <button onClick={openChat}>
          Ask MusA.I <Arrow />
        </button>
      </p>
      <section className="pf-work pf-section" id="work">
        <div className="pf-section-heading">
          <h2>Ideas, put to work.</h2>
          <p>
            Different problems.
            <br />A few decisions that made the difference.
          </p>
        </div>
        {featured.map((project) => (
          <article className="pf-project" key={project.id}>
            <div className="pf-project-copy">
              <span>{project.category}</span>
              <h3>{project.headline}</h3>
              <p>{project.summary}</p>
              <div className="pf-project-actions">
                <ProjectLink project={project} />
                <LiveProjectLink project={project} />
              </div>
              <small>{project.status}</small>
            </div>
            <div className="pf-project-art">
              {project.demo ? (
                <ProjectDemo kind={project.demo} />
              ) : (
                <p>{project.outcome}</p>
              )}
            </div>
          </article>
        ))}
      </section>
      <section className="pf-other pf-section">
        <div className="pf-section-heading">
          <h2>Still curious.</h2>
          <p>
            A few more threads
            <br />
            I’ve followed.
          </p>
        </div>
        <div>
          {PROJECTS.filter((project) => !project.featured)
            .slice(0, 5)
            .map((project) => (
              <RouteLink
                className="pf-other-row"
                key={project.id}
                href={`/work/${project.id}`}
              >
                <span>{project.category}</span>
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.summary}</p>
                </div>
                <Arrow />
              </RouteLink>
            ))}
        </div>
      </section>
      <div className="pf-browse-all">
        <RouteLink className="pf-action" href="/work">
          Browse all {PROJECTS.length} projects <Arrow />
        </RouteLink>
      </div>
      <ProfileSummary />
      <section className="pf-writing-preview pf-section">
        <div className="pf-section-heading">
          <h2>Thinking out loud.</h2>
          <RouteLink className="pf-action" href="/writing">
            All the notes <Arrow />
          </RouteLink>
        </div>
        <div className="pf-note-grid">
          {ARTICLES.slice(0, 3).map((article) => (
            <RouteLink
              className="pf-note-card"
              href={`/writing/${article.slug}`}
              key={article.slug}
            >
              <span>
                {article.topics[0]} · {article.minutes} min
              </span>
              <h3>{article.title}</h3>
              <p>{article.dek}</p>
              <Arrow />
            </RouteLink>
          ))}
        </div>
      </section>
      <section className="pf-about pf-section" id="about">
        <div>
          <span>Researcher. Engineer. Teacher.</span>
          <h2>
            Good questions
            <br />
            keep me going.
          </h2>
          <div className="pf-place">
            <span>Lahore</span>
            <i />
            <span>Madison</span>
          </div>
        </div>
        <div>
          <p className="pf-about-intro">{BIO.intro}</p>
          {BIO.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="pf-about-links">
            <RouteLink href="/about">
              Experience, skills & credentials <Arrow />
            </RouteLink>
            <a
              href="/Muhammad-Musa-Resume.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Read my résumé <Arrow />
            </a>
            <a href="mailto:mmusa2@wisc.edu">
              Get in touch <Arrow />
            </a>
          </div>
        </div>
      </section>
      <section className="pf-fit pf-section">
        <h2>Where I can help.</h2>
        <div>
          <article>
            <h3>Make the research testable.</h3>
            <p>
              I care about the baseline, the failure case, and the metric that
              makes a result less convenient—and more useful.
            </p>
          </article>
          <article>
            <h3>Carry an idea into a system.</h3>
            <p>
              From data boundaries to the interface, I like doing the connective
              work that makes a product hold together.
            </p>
          </article>
          <article>
            <h3>Make the reasoning clear.</h3>
            <p>
              Teaching keeps me honest. If I can’t explain a decision, I
              probably need to understand it better.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

function ProjectPage({ id }: { id: string }) {
  const project = PROJECTS.find((item) => item.id === id);
  if (!project) return <NotFound />;
  const related = ARTICLES.filter((article) => article.projectId === id);
  return (
    <main id="main" className="pf-detail-page">
      <RouteLink className="pf-back" href="/work">
        ← All work
      </RouteLink>
      <header className="pf-detail-heading">
        <span>{project.category}</span>
        <h1>{project.headline}</h1>
        <p>{project.summary}</p>
        <LiveProjectLink project={project} />
      </header>
      <section
        className="pf-project-facts pf-glass"
        id="project-overview"
        data-search-target
        aria-label="Project overview"
      >
        <div>
          <span>My role</span>
          <p>{project.role}</p>
        </div>
        <div>
          <span>Where it stands</span>
          <p>{project.status}</p>
        </div>
      </section>
      {project.demo && (
        <section className="pf-detail-demo">
          <ProjectDemo kind={project.demo} />
          <div>
            <h2>Try the idea.</h2>
            <p>
              This small interaction makes one of the project’s decisions
              tangible. The note inside explains what it demonstrates and what
              it leaves out.
            </p>
            <RouteLink
              className="pf-action"
              href={`/playground?build=${project.id}`}
            >
              Open in the playground <Arrow />
            </RouteLink>
          </div>
        </section>
      )}
      <div className="pf-project-story">
        <aside>
          <h2>The stack</h2>
          <ul>
            {project.technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
          {project.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.label} ↗
            </a>
          ))}
        </aside>
        <article>
          <section id="project-outcome" data-search-target>
            <h2>What changed.</h2>
            <p>{project.outcome}</p>
          </section>
          {project.sections.map((section, index) => (
            <section key={section.title} id={`section-${index}`} data-search-target>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </article>
      </div>
      {related.length > 0 && (
        <section className="pf-related">
          <h2>The thinking behind it.</h2>
          {related.map((article) => (
            <RouteLink
              className="pf-action"
              key={article.slug}
              href={`/writing/${article.slug}`}
            >
              {article.title}
              <Arrow />
            </RouteLink>
          ))}
        </section>
      )}
    </main>
  );
}

function Writing() {
  const [results, setResults] = useState(ARTICLES);
  return (
    <main id="main" className="pf-writing-page">
      <header className="pf-page-intro">
        <span>Notes from the work</span>
        <h1>
          A question.
          <br />
          Then a closer look.
        </h1>
        <p>
          Things I’ve built, ideas I’ve tested, and the decisions I’d make
          differently. The technical details, with the reasons behind them.
        </p>
      </header>
      <Suspense fallback={<p>Loading search…</p>}>
        <ArticleSearch articles={ARTICLES} onResults={setResults} />
      </Suspense>
      <div className="pf-writing-list" aria-live="polite">
        {results.map((article) => (
          <RouteLink
            className="pf-writing-row"
            key={article.slug}
            href={`/writing/${article.slug}`}
          >
            <div>
              <span>{article.topics.join(" / ")}</span>
              <h2>{article.title}</h2>
              <p>{article.dek}</p>
            </div>
            <div className="pf-reading-time">
              {article.minutes} min
              <Arrow />
            </div>
          </RouteLink>
        ))}
        {results.length === 0 && (
          <div className="pf-empty">
            <h2>No note matches yet.</h2>
            <p>
              Try a broader idea, clear a topic filter, or explore the full
              collection.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function ArticlePage({ slug }: { slug: string }) {
  const article = ARTICLES.find((item) => item.slug === slug);
  if (!article) return <NotFound />;
  const project = PROJECTS.find((item) => item.id === article.projectId);
  return (
    <main id="main" className="pf-article-page">
      <RouteLink className="pf-back" href="/writing">
        ← All writing
      </RouteLink>
      <header className="pf-article-heading">
        <span>
          {article.topics.join(" / ")} · {article.minutes} min read
        </span>
        <h1>{article.title}</h1>
        <p>{article.dek}</p>
        <div>
          Muhammad Musa
          {import.meta.env.DEV && (
            <span className="pf-draft">Preview draft</span>
          )}
        </div>
      </header>
      {article.projectId === "kaiju-cats" && <section className="pf-article-playground pf-glass" id="try-planner" data-search-target aria-label="Try Kaiju Cats in the Playground">
        <div><span>Try the build</span><p>Upload your own screenshot, edit the board, and inspect a plan one turn at a time.</p></div>
        <RouteLink className="pf-solid-button" href="/playground?build=kaiju-cats">Open in Playground <span aria-hidden="true">↗</span></RouteLink>
      </section>}
      <div className="pf-article-layout">
        <aside>
          <nav aria-label="In this article">
            <span>In this note</span>
            {article.projectId === "kaiju-cats" && <RouteLink href="/playground?build=kaiju-cats">Try the planner</RouteLink>}
            {article.sections.map((section, i) => (
              <a key={section.heading} href={`#section-${i}`}>
                {section.heading}
              </a>
            ))}
            <a href="#sources">Sources & further reading</a>
          </nav>
        </aside>
        <article className="pf-prose">
          {article.sections.map((section, i) => (
            <section key={section.heading} id={`section-${i}`} data-search-target>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.code && (
                <pre>
                  <code>{section.code}</code>
                </pre>
              )}
            </section>
          ))}
          <section id="sources" data-search-target>
            <h2>Sources & further reading</h2>
            <ul>
              {article.references.map((reference) => (
                <li key={reference.url}>
                  <a href={reference.url} target="_blank" rel="noreferrer">
                    {reference.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
          {project && (
            <div className="pf-article-project pf-glass">
              <span>From this project</span>
              <h3>{project.name}</h3>
              <p>{project.summary}</p>
              <ProjectLink project={project} />
            </div>
          )}
        </article>
      </div>
    </main>
  );
}

function InterfaceExperiments() {
  const requested = new URLSearchParams(window.location.search).get("demo");
  const [selected, setSelected] = useState<DemoKind>(
    DEMOS.some((demo) => demo.id === requested)
      ? (requested as DemoKind)
      : "consent",
  );
  const current = DEMOS.find((demo) => demo.id === selected)!;
  const project = PROJECTS.find((item) => item.demo === selected);
  return (
    <main id="main" className="pf-playground-page">
      <header className="pf-page-intro">
        <span>The playground · learn by changing something</span>
        <h1>
          Don’t just read it.
          <br />
          Pull a thread.
        </h1>
        <p>
          Draw the problem. Change the data. Follow the consequence. Working
          experiments in search, learning, and the systems I build.
        </p>
      </header>
      {LabDirectory && (
        <Suspense fallback={<p>Opening the local experiments…</p>}>
          <LabDirectory />
        </Suspense>
      )}
      <div className="pf-project-experiments-heading">
        <h2>Inside the projects.</h2>
        <p>Three smaller experiments with the decisions behind my work.</p>
      </div>
      <div className="pf-playground-layout">
        <nav className="pf-playground-tabs" aria-label="Choose an experiment">
          {DEMOS.map((demo) => (
            <button
              aria-pressed={selected === demo.id}
              key={demo.id}
              onClick={() => {
                setSelected(demo.id);
                window.history.replaceState(
                  {},
                  "",
                  `/playground/experiments?demo=${demo.id}`,
                );
              }}
            >
              <span>{demo.name}</span>
              <small>{demo.description}</small>
              <Arrow />
            </button>
          ))}
        </nav>
        <section
          key={selected}
          className="pf-playground-stage pf-trace-panel"
          aria-label={current.name}
        >
          <ProjectDemo key={selected} kind={selected} />
          {project && (
            <ProjectLink project={project}>Read the project notes</ProjectLink>
          )}
        </section>
      </div>
      {import.meta.env.DEV && (
        <aside className="pf-playground-note">
          <h2>One more thing to explore.</h2>
          <p>
            The hidden background is an experiment too. Seven different
            structures, revealed by the same spotlight.
          </p>
          <RouteLink className="pf-action" href="/backgrounds">
            Open the background studio <Arrow />
          </RouteLink>
        </aside>
      )}
    </main>
  );
}

function BackgroundLab({
  variant,
  setVariant,
  theme,
  toggleTheme,
  reveal,
  setReveal,
}: {
  variant: BackgroundVariant;
  setVariant: (variant: BackgroundVariant) => void;
  theme: BackgroundTheme;
  toggleTheme: () => void;
  reveal: boolean;
  setReveal: (show: boolean) => void;
}) {
  const option = BACKGROUND_OPTIONS.find((item) => item.id === variant)!;
  return (
    <main id="main" className="pf-background-lab">
      <div className="pf-lab-stage">
        <div className="pf-lab-copy">
          <span>The hidden layer · seven working directions</span>
          <h1>
            Something
            <br />
            beneath the surface.
          </h1>
          <p>
            Move your cursor to discover it.
            <br />
            Scroll to change its structure.
          </p>
        </div>
        <div className="pf-lab-caption" aria-live="polite">
          <h2>{option.name}</h2>
          <p>{option.description}</p>
        </div>
        <div className="pf-lab-controls pf-glass">
          <div className="pf-lab-variants" aria-label="Choose a background">
            {BACKGROUND_OPTIONS.map((item, i) => (
              <button
                key={item.id}
                aria-pressed={variant === item.id}
                onClick={() => setVariant(item.id)}
              >
                <span
                  className={`pf-variant-icon pf-variant-icon--${item.id}`}
                  aria-hidden="true"
                >
                  {["⌘", "≋", "◎", "◇", "⋮", "▦", "∿"][i]}
                </span>
                {item.name}
              </button>
            ))}
          </div>
          <div className="pf-lab-options">
            <button onClick={() => setReveal(!reveal)} aria-pressed={reveal}>
              {reveal ? "Follow my pointer" : "Show a centered spotlight"}
            </button>
            <button onClick={toggleTheme}>
              <ThemeIcon theme={theme} />
              {theme === "dark" ? "Try light" : "Try dark"}
            </button>
            <RouteLink href="/motion-studio">Hero & motion studies →</RouteLink>
            <RouteLink className="pf-solid-button" href="/">
              View on my site <Arrow />
            </RouteLink>
          </div>
        </div>
        <p className="pf-lab-help">
          Nothing outside the spotlight. On touchscreens, tap the surface or use
          the centered reveal. Scroll down to see the form change.
        </p>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main id="main" className="pf-page-intro">
      <span>Nothing at this address</span>
      <h1>
        That thread
        <br />
        ends here.
      </h1>
      <p>The page may have moved. The work and writing are still here.</p>
      <RouteLink className="pf-action" href="/">
        Back to the beginning <Arrow />
      </RouteLink>
    </main>
  );
}

function savedValue(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function PortfolioApp() {
  const path = usePath();
  const lab = import.meta.env.DEV
    ? LABS.find((item) => path === `/playground/${item.id}`)
    : undefined;
  const [theme, setTheme] = useState<BackgroundTheme>(() =>
    savedValue("musa-theme") === "light" ? "light" : "dark",
  );
  const [variant, setVariant] = useState<BackgroundVariant>(() => {
    if (!import.meta.env.DEV) return "latent";
    const saved = savedValue("musa-background-studio");
    return BACKGROUND_OPTIONS.some((option) => option.id === saved)
      ? (saved as BackgroundVariant)
      : "latent";
  });
  const [reveal, setReveal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<string | undefined>();
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [spotlightDot, setSpotlightDot] = useState(
    () => savedValue("musa-spotlight-dot") !== "false",
  );
  const openChat = useCallback((question?: string) => {
    trackAnalyticsAction("chat-open");
    setCommandsOpen(false);
    setChatPrefill(question);
    setChatOpen(true);
  }, []);
  const openCommands = useCallback(() => {
    trackAnalyticsAction("search-open");
    setChatOpen(false);
    setCommandsOpen(true);
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    trackAnalyticsAction(next === "dark" ? "theme-dark" : "theme-light");
    setTheme(next);
  };
  const toggleSpotlightDot = () => {
    trackAnalyticsAction(spotlightDot ? "cursor-dot-off" : "cursor-dot-on");
    setSpotlightDot(!spotlightDot);
  };
  const previousPath = useRef(path);
  const isLab = import.meta.env.DEV && path === "/backgrounds";
  const isMotionStudio = import.meta.env.DEV && path === "/motion-studio";
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.defaultPrevented ||
        document.querySelector("dialog[open]")
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (commandsOpen) setCommandsOpen(false);
        else openCommands();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        chatOpen ||
        commandsOpen ||
        target?.closest(
          'input,textarea,select,[contenteditable="true"],[role="grid"],[role="slider"]',
        )
      )
        return;
      if (event.key === "/") {
        event.preventDefault();
        openChat();
      } else if (SECTION_ROUTES[event.key]) {
        event.preventDefault();
        navigate(SECTION_ROUTES[event.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen, commandsOpen, openChat, openCommands]);
  useEffect(() => {
    document.body.classList.add("portfolio-active");
    return () => document.body.classList.remove("portfolio-active");
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("musa-theme", theme);
      if (import.meta.env.DEV)
        localStorage.setItem("musa-background-studio", variant);
      localStorage.setItem("musa-spotlight-dot", String(spotlightDot));
    } catch {
      /* The selected appearance still works without storage. */
    }
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.colorScheme = "";
    };
  }, [theme, variant, spotlightDot]);
  useEffect(() => {
    const project = PROJECTS.find((item) => path === `/work/${item.id}`);
    const article = ARTICLES.find((item) => path === `/writing/${item.slug}`);
    const label =
      article?.title ||
      project?.name ||
      lab?.title ||
      (
        {
          "/work": "Work",
          "/about": "About",
          "/writing": "Writing",
          "/playground": "Playground",
          ...(import.meta.env.DEV
            ? {
                "/playground/experiments": "Interface experiments",
                "/backgrounds": "Background studio",
                "/motion-studio": "Motion studio",
              }
            : {}),
        } as Record<string, string>
      )[path];
    document.title = label
      ? `${label} — Muhammad Musa`
      : "Muhammad Musa — Computer science. Human consequences.";
    const sectionDescriptions: Record<string, string> = {
      "/work":
        "Browse my projects in research, machine learning, engineering and teaching, with technical decisions and evidence.",
      "/about":
        "My experience, education, publications, toolkit and credentials—from Lahore to Madison.",
      "/writing":
        "Things I’ve built, ideas I’ve tested, and the decisions I’d make differently. The technical details, with the reasons behind them.",
      "/playground":
        "Explore the products and systems I built, their public interfaces, original benchmark results, code and project walkthroughs.",
      ...(import.meta.env.DEV
        ? {
            "/backgrounds":
              "Seven hidden background studies, revealed by a spotlight and transformed by scrolling.",
            "/motion-studio":
              "Compare three interactive 3D and 4D hero studies, plus three page transitions.",
          }
        : {}),
    };
    const description =
      article?.dek ||
      project?.summary ||
      lab?.description ||
      sectionDescriptions[path] ||
      BIO.paragraphs[0];
    const url = new URL(path, "https://iammusa.vercel.app").href;
    const metadata = [
      ["name", "description", description],
      ["property", "og:title", document.title],
      ["property", "og:description", description],
      ["property", "og:url", url],
      ["property", "og:type", article ? "article" : "website"],
      ["name", "twitter:title", document.title],
      ["name", "twitter:description", description],
    ];
    for (const [attribute, name, content] of metadata) {
      const tag =
        document.querySelector<HTMLMetaElement>(
          `meta[${attribute}="${name}"]`,
        ) || document.createElement("meta");
      tag.setAttribute(attribute, name);
      tag.content = content;
      if (!tag.isConnected) document.head.append(tag);
    }
    const canonical =
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ||
      document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = url;
    if (!canonical.isConnected) document.head.append(canonical);
    // Keep metadata in step with client-side navigation as well as direct visits.
    const schema =
      document.querySelector<HTMLScriptElement>(
        'script[type="application/ld+json"]',
      ) || document.createElement("script");
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": article
        ? "BlogPosting"
        : path === "/"
          ? "ProfilePage"
          : "WebPage",
      url,
      name: article?.title || project?.name || label || "Muhammad Musa",
      description,
      ...(article
        ? {
            headline: article.title,
            author: { "@type": "Person", name: "Muhammad Musa" },
            mainEntityOfPage: url,
            keywords: article.topics,
          }
        : path === "/"
          ? {
              mainEntity: { "@type": "Person", name: "Muhammad Musa", url },
            }
          : {}),
    });
    if (!schema.isConnected) document.head.append(schema);
    const element = document.querySelector<HTMLElement>("#main");
    element?.setAttribute("tabindex", "-1");
    if (previousPath.current !== path) {
      element?.focus({ preventScroll: true });
      previousPath.current = path;
    }
    restoreHash();
    // Font metrics can move a directly linked section after the lazy page mounts.
    let canceled = false;
    const initialHash = window.location.hash;
    if (initialHash)
      void document.fonts.ready.then(() => {
        if (!canceled && window.location.hash === initialHash) restoreHash();
      });
    return () => {
      canceled = true;
    };
  }, [path]);
  return (
    <div className="pf" data-theme={theme}>
      <a className="pf-skip" href="#main">
        Skip to content
      </a>
      {!isMotionStudio && (
        <SpotlightBackground
          variant={isLab ? variant : "latent"}
          theme={theme}
          reveal={isLab && reveal}
          cursor={spotlightDot}
        />
      )}
      <div className="pf-content">
        <PortfolioHeader
          theme={theme}
          openChat={() => openChat()}
          openCommands={openCommands}
          toggle={toggleTheme}
        />
        <TraceRoute route={path} enabled={!isLab && !isMotionStudio}>
          {isLab ? (
            <BackgroundLab
              {...{ variant, setVariant, theme, reveal, setReveal }}
              toggleTheme={() =>
                setTheme((value) => (value === "dark" ? "light" : "dark"))
              }
            />
          ) : isMotionStudio && StudioPage ? (
            <Suspense fallback={<p>Loading the visual studies…</p>}>
              <StudioPage
                theme={theme}
                toggleTheme={() =>
                  setTheme((value) => (value === "dark" ? "light" : "dark"))
                }
              />
            </Suspense>
          ) : path === "/" ? (
            <Home openChat={() => openChat()} />
          ) : path === "/work" ? (
            <Suspense
              fallback={
                <main id="main" className="pf-page-intro" role="status">
                  Opening the work…
                </main>
              }
            >
              <WorkIndex />
            </Suspense>
          ) : path === "/about" ? (
            <Suspense
              fallback={
                <main id="main" className="pf-page-intro" role="status">
                  Opening my background…
                </main>
              }
            >
              <AboutPage />
            </Suspense>
          ) : path === "/writing" ? (
            <Writing />
          ) : path.startsWith("/writing/") ? (
            <ArticlePage slug={path.slice(9)} />
          ) : path.startsWith("/work/") ? (
            <ProjectPage id={path.slice(6)} />
          ) : lab && LabPage ? (
            <Suspense
              fallback={
                <main id="main" className="pf-lab-preparing" role="status">
                  Preparing the experiment…
                </main>
              }
            >
              <LabPage kind={lab.id} openChat={() => openChat()} />
            </Suspense>
          ) : path === "/playground" ? (
            <Suspense
              fallback={
                <main id="main" className="pf-page-intro" role="status">
                  Opening the playground…
                </main>
              }
            >
              <BuildsPlayground />
            </Suspense>
          ) : import.meta.env.DEV && path === "/playground/experiments" ? (
            <InterfaceExperiments />
          ) : (
            <NotFound />
          )}
        </TraceRoute>
        {!isLab && <Footer openChat={() => openChat()} />}
      </div>
      {commandsOpen && (
        <Suspense
          fallback={
            <div role="status" className="pf-chat-loading pf-glass">
              Opening site search…
            </div>
          }
        >
          <PortfolioCommands
            onClose={() => setCommandsOpen(false)}
            onAskMusai={openChat}
            navigateTo={navigate}
            theme={theme}
            onToggleTheme={toggleTheme}
            spotlightDot={spotlightDot}
            onToggleSpotlightDot={toggleSpotlightDot}
          />
        </Suspense>
      )}
      {chatOpen && (
        <Suspense
          fallback={
            <div role="status" className="pf-chat-loading pf-glass">
              Opening MusA.I…
            </div>
          }
        >
          <ChatPanel
            transitionStyle="trace"
            initialQuestion={chatPrefill}
            onClose={() => setChatOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
