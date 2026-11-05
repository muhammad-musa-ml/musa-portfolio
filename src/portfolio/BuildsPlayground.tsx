import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { RouteLink } from "../lib/router";
import { trackAnalyticsControl } from "../lib/analytics";
import ProjectDemo from "./Demos";
import { PROJECTS } from "./content";
import {
  BUILDS,
  CACHE_RESULTS,
  LOOKUP_SOURCE,
  SERVING_RESULTS,
  SERVING_SOURCE,
  type BuildId,
} from "./builds-content";
import "./builds-playground.css";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}

function KilnLaunch() {
  const [query, setQuery] = useState("");
  const searchId = useId();
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackAnalyticsControl("kiln-search-open");
    window.open(
      `https://kiln-by-m.vercel.app/${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  return (
    <div className="pf-build-kiln">
      <div className="pf-build-library-mark" aria-hidden="true">
        <span>k</span>
        <i />
        <i />
        <i />
      </div>
      <div className="pf-build-library-copy">
        <span className="pf-build-live">
          <i /> Open on the web
        </span>
        <h3>
          A saved link is
          <br />
          only the beginning.
        </h3>
        <p>
          Search my public collection. Open a source, read the guide, and follow
          the files that came out of it.
        </p>
        <form onSubmit={search} className="pf-build-search">
          <label htmlFor={searchId}>What would you like to find in Kiln?</label>
          <div>
            <input
              id={searchId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try design, agents, or 3D…"
              maxLength={200}
            />
            <button type="submit">
              Search Kiln <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
        <div className="pf-build-quicklinks" aria-label="Explore Kiln topics">
          {["Design", "Agents", "3D"].map((topic) => (
            <ExternalLink
              key={topic}
              href={`https://kiln-by-m.vercel.app/?q=${encodeURIComponent(topic.toLowerCase())}`}
            >
              {topic}
            </ExternalLink>
          ))}
        </div>
        <small>
          The real library opens in a new tab. The public version is a curated
          snapshot; my private intake and editing tools stay local.
        </small>
      </div>
    </div>
  );
}

function ResultBars({
  rows,
  maximum,
  unit,
}: {
  rows: { label: string; value: number; text: string }[];
  maximum: number;
  unit: string;
}) {
  return (
    <div className="pf-build-bars" aria-label={unit}>
      {rows.map((row, index) => (
        <div
          className="pf-build-bar"
          key={row.label}
          style={
            {
              "--bar-width": `${(row.value / maximum) * 100}%`,
              "--bar-color":
                index === 0
                  ? "var(--pf-accent)"
                  : index === 1
                    ? "var(--pf-teal)"
                    : "var(--pf-muted)",
            } as CSSProperties
          }
        >
          <div>
            <span>{row.label}</span>
            <strong>
              {row.text} <small>{unit}</small>
            </strong>
          </div>
          <span className="pf-build-bar-track" aria-hidden="true">
            <i />
          </span>
        </div>
      ))}
    </div>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  async function copy() {
    trackAnalyticsControl("lookup-copy-command");
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      setState("manual");
    }
  }
  return (
    <div className="pf-build-command">
      <pre>
        <code>{command}</code>
      </pre>
      <button onClick={copy}>
        {state === "copied" ? "Copied" : "Copy command"}
      </button>
      <span role="status">
        {state === "manual"
          ? "Select the command above to copy it."
          : state === "copied"
            ? "Command copied to your clipboard."
            : ""}
      </span>
    </div>
  );
}

// Only committed public slider positions are recorded, never drag/pointer samples.
function useCommittedMetric(
  prefix: "lookup-cache-" | "serving-workers-",
  initial: number,
) {
  const previous = useRef(initial);
  return (position: number) => {
    if (position !== previous.current) {
      trackAnalyticsControl(prefix + position);
      previous.current = position;
    }
  };
}

function CacheResults() {
  const [position, setPosition] = useState(2);
  const commit = useCommittedMetric("lookup-cache-", 2);
  const row = CACHE_RESULTS[position];
  const id = useId();
  return (
    <div className="pf-build-instrument">
      <div className="pf-build-instrument-top">
        <span>Cache size → hit rate</span>
        <span>Recorded · 5 repetitions</span>
      </div>
      <div className="pf-build-slider">
        <label htmlFor={id}>
          Cache capacity <strong>{row.size.toLocaleString()} entries</strong>
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={4}
          step={1}
          value={position}
          aria-valuetext={`${row.size} cache entries`}
          onChange={(event) => setPosition(Number(event.target.value))}
          onPointerUp={(event) => commit(Number(event.currentTarget.value))}
          onKeyUp={(event) => commit(Number(event.currentTarget.value))}
          onBlur={(event) => commit(Number(event.currentTarget.value))}
        />
        <div aria-hidden="true">
          <span>10</span>
          <span>100</span>
          <span>1,000</span>
          <span>3,000</span>
          <span>10,000</span>
        </div>
      </div>
      <ResultBars
        maximum={100}
        unit="% hits"
        rows={[
          {
            label: "Server LRU",
            value: row.server * 100,
            text: (row.server * 100).toFixed(2),
          },
          {
            label: "Client LRU",
            value: row.lru * 100,
            text: (row.lru * 100).toFixed(2),
          },
          {
            label: "Client FIFO",
            value: row.fifo * 100,
            text: (row.fifo * 100).toFixed(2),
          },
        ]}
      />
      <p className="pf-build-insight" aria-live="polite">
        {position === 4
          ? "The curves meet here: the cache holds every parcel this workload touches. The eviction policy has nothing left to improve."
          : "Two independently implemented LRU caches produce similar hit rates. The FIFO comparison makes the effect of the eviction policy visible."}
      </p>
      <p className="pf-build-scope">
        Medians from five runs of 30,000 requests, drawn from 71,201 parcel IDs
        with Zipf skew 1.1. One Windows laptop, Docker Desktop. This viewer
        reads recorded measurements; it is not running the service.
      </p>
      <div className="pf-build-source">
        <ExternalLink href={LOOKUP_SOURCE}>
          Read the original results and ranges
        </ExternalLink>
        <ExternalLink href="https://github.com/muhammad-musa-ml/replicated-lookup-service/blob/main/bench/results/hitrate.csv">
          Raw CSV
        </ExternalLink>
      </div>
      <details
        className="pf-build-reproduce"
        data-analytics-detail="lookup-reproduction"
      >
        <summary>Run the actual service</summary>
        <p>
          The repository includes the three implementations, conformance checks
          and failover scripts. Docker Compose is required; the first build
          downloads the public Madison tables.
        </p>
        <CopyCommand
          command={
            "git clone https://github.com/muhammad-musa-ml/replicated-lookup-service\ncd replicated-lookup-service\ndocker compose up -d --build"
          }
        />
        <ExternalLink href="https://github.com/muhammad-musa-ml/replicated-lookup-service#run-it">
          Setup, API examples and cleanup instructions
        </ExternalLink>
      </details>
    </div>
  );
}

function ServingResults() {
  const [position, setPosition] = useState(0);
  const commit = useCommittedMetric("serving-workers-", 0);
  const [metric, setMetric] = useState<0 | 1>(0);
  const row = SERVING_RESULTS[position];
  const id = useId();
  return (
    <div className="pf-build-instrument">
      <div className="pf-build-instrument-top">
        <span>Qwen2.5-1.5B · 6 GB GPU</span>
        <span>Recorded · 5 repetitions</span>
      </div>
      <div className="pf-build-metrics" aria-label="Choose serving measurement">
        <button
          aria-pressed={metric === 0}
          onClick={() => {
            if (metric !== 0) trackAnalyticsControl("serving-throughput");
            setMetric(0);
          }}
        >
          Output throughput
        </button>
        <button
          aria-pressed={metric === 1}
          onClick={() => {
            if (metric !== 1) trackAnalyticsControl("serving-latency");
            setMetric(1);
          }}
        >
          Time to first token
        </button>
      </div>
      <div className="pf-build-slider">
        <label htmlFor={id}>
          Concurrent workers <strong>{row.workers}</strong>
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={4}
          step={1}
          value={position}
          aria-valuetext={`${row.workers} concurrent workers`}
          onChange={(event) => setPosition(Number(event.target.value))}
          onPointerUp={(event) => commit(Number(event.currentTarget.value))}
          onKeyUp={(event) => commit(Number(event.currentTarget.value))}
          onBlur={(event) => commit(Number(event.currentTarget.value))}
        />
        <div aria-hidden="true">
          <span>1</span>
          <span>2</span>
          <span>4</span>
          <span>8</span>
          <span>16</span>
        </div>
      </div>
      <ResultBars
        maximum={metric === 0 ? 1100 : 650}
        unit={metric === 0 ? "tok/s" : "ms"}
        rows={[
          {
            label: "FP16",
            value: row.fp16[metric],
            text: row.fp16[metric].toLocaleString(),
          },
          {
            label: "AWQ · 4 bit",
            value: row.awq[metric],
            text: row.awq[metric].toLocaleString(),
          },
          {
            label: "GPTQ · 4 bit",
            value: row.gptq[metric],
            text: row.gptq[metric].toLocaleString(),
          },
        ]}
      />
      <p className="pf-build-insight" aria-live="polite">
        {metric === 0
          ? "The 4-bit arms generate more output tokens in this setup. That does not mean the first token arrives sooner—or that quality is unchanged."
          : "Lower is faster here. First-token latency and output throughput answer different questions; more tokens per second can still come with a longer initial wait."}
      </p>
      <div className="pf-build-quality">
        <span>Separate quality check</span>
        <p>
          MMLU subset accuracy: FP16 <b>58.6%</b>, AWQ <b>56.8%</b>, GPTQ{" "}
          <b>57.5%</b> over 285 questions. These are reported medians, not
          general model rankings.
        </p>
      </div>
      <p className="pf-build-scope">
        Closed-loop measurements on one Windows 11 laptop, with 128-token
        outputs. Precision variants use the publisher’s weights. The graphs show
        medians; the source includes run ranges and measurement conditions.
      </p>
      <div className="pf-build-source">
        <ExternalLink href={SERVING_SOURCE}>
          Read the original measurement tables
        </ExternalLink>
        <ExternalLink href="https://github.com/muhammad-musa-ml/vllm-serving-bench">
          Code and reproduction guide
        </ExternalLink>
      </div>
    </div>
  );
}

function Workbench({ selected }: { selected: BuildId }) {
  if (selected === "kiln") return <KilnLaunch />;
  if (selected === "lookup") return <CacheResults />;
  if (selected === "serving") return <ServingResults />;
  return (
    <div className="pf-build-walkthrough">
      <ProjectDemo kind={selected === "research" ? "defense" : "consent"} />
      <p className="pf-build-scope">
        {selected === "research"
          ? "The displayed rates are from the public paired T2 ablation (50 attack-paired queries). This page does not send attacks to a live model."
          : "This is an explanation of the real product’s permission model. It does not connect to WUMI or handle medical records. The full application is still in development."}
      </p>
      {selected === "research" && (
        <div className="pf-build-source">
          <ExternalLink href="https://github.com/muhammad-musa-ml/IPI-763">
            Research code
          </ExternalLink>
          <ExternalLink href="https://github.com/muhammad-musa-ml/IPI-763/blob/main/docs/phase5_honest_fpr.md">
            The clean-query utility analysis
          </ExternalLink>
        </div>
      )}
    </div>
  );
}

export default function BuildsPlayground() {
  const requestedBuild = () => {
    const params = new URLSearchParams(window.location.search);
    const legacy: Record<string, BuildId> = {
      consent: "wumi",
      defense: "research",
      provenance: "kiln",
    };
    const id = params.get("build") ?? legacy[params.get("demo") ?? ""];
    return BUILDS.some((build) => build.id === id) ? (id as BuildId) : "kiln";
  };
  const [selected, selectBuild] = useState<BuildId>(requestedBuild);
  useEffect(() => {
    const restore = () => selectBuild(requestedBuild());
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  function setSelected(id: BuildId) {
    if (id !== selected) trackAnalyticsControl("playground-build-" + id);
    selectBuild(id);
    window.history.replaceState({}, "", `/playground?build=${id}`);
  }
  const current = BUILDS.find((item) => item.id === selected) ?? BUILDS[0];
  const website = PROJECTS.find(
    (project) => project.id === current.id,
  )?.links.find((link) => link.label === "Visit website");
  const reduceMotion = useReducedMotion();
  return (
    <main id="main" className="pf-builds">
      <section className="pf-page-intro pf-builds-intro">
        <span>The playground</span>
        <h1>
          Open it.
          <br />
          Try it. Inspect it.
        </h1>
        <p>
          A way into things I’ve built: a live research library, measurements
          from my systems, and walkthroughs of the decisions inside my products.
        </p>
      </section>
      <section
        className="pf-builds-desk pf-section"
        aria-label="Explore my built projects"
      >
        <nav
          className="pf-builds-picker"
          aria-label="Choose a project to explore"
        >
          {BUILDS.map((build) => (
            <button
              key={build.id}
              type="button"
              aria-pressed={current.id === build.id}
              aria-controls="build-workbench"
              onClick={() => setSelected(build.id)}
            >
              {current.id === build.id && (
                <motion.span
                  className="pf-build-selected"
                  layoutId="build-selected"
                  transition={{
                    duration: reduceMotion ? 0 : 0.35,
                    ease: [0.2, 0.65, 0.2, 1],
                  }}
                />
              )}
              <span className="pf-build-choice">
                <span>{build.kind}</span>
                <strong>{build.name}</strong>
                <small>{build.mode}</small>
              </span>
              <span className="pf-build-choice-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          ))}
        </nav>
        <div id="build-workbench" className="pf-build-workbench pf-glass">
          <header className="pf-build-workbench-header">
            <span>{current.mode}</span>
            <div className="pf-build-destinations">
              {website && (
                <ExternalLink href={website.url}>
                  Visit {current.name}
                </ExternalLink>
              )}
              <RouteLink href={`/work/${current.id}`}>
                The project notes <span aria-hidden="true">→</span>
              </RouteLink>
            </div>
          </header>
          <div
            key={current.id}
            className="pf-build-workbench-body pf-trace-panel"
          >
            <div className="pf-build-workbench-intro">
              <h2>{current.heading}</h2>
              <p>{current.description}</p>
            </div>
            <Workbench selected={current.id} />
          </div>
        </div>
      </section>
      <section className="pf-section pf-builds-more">
        <div className="pf-section-heading">
          <h2>Keep following the work.</h2>
          <p>The implementation, the paper, and the choices behind each.</p>
        </div>
        <div className="pf-builds-more-links">
          <RouteLink href="/work/reprod">
            <span>Published research</span>
            <strong>REPROD</strong>
            <p>
              Execution provenance, collection code and the released dataset.
            </p>
          </RouteLink>
          <RouteLink href="/work/open-source">
            <span>Open-source contributions</span>
            <strong>Small fixes, real boundaries</strong>
            <p>
              Reproductions, scoped patches and the evidence behind the pull
              requests.
            </p>
          </RouteLink>
          <RouteLink href="/writing">
            <span>Technical writing</span>
            <strong>The reasoning behind it</strong>
            <p>What changed, what failed, and what I would do differently.</p>
          </RouteLink>
        </div>
      </section>
    </main>
  );
}
