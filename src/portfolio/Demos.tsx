import { useState } from "react";
import { trackAnalyticsControl } from "../lib/analytics";

export type DemoKind = "consent" | "defense" | "provenance";
export const DEMOS: { id: DemoKind; name: string; description: string }[] = [
  {
    id: "consent",
    name: "A record with boundaries",
    description: "Change a permission. See exactly who can read what.",
  },
  {
    id: "defense",
    name: "The cost of a defense",
    description: "Compare recorded results. Look beyond the headline number.",
  },
  {
    id: "provenance",
    name: "Follow the source",
    description: "Move from an idea to the evidence that supports it.",
  },
];

function Consent() {
  const [viewer, setViewer] = useState("Clinic");
  const [access, setAccess] = useState({ Clinic: true, Lab: false });
  const [events, setEvents] = useState([
    "Record created. Access belongs to the patient.",
  ]);
  const allowed = viewer === "Patient" || access[viewer as keyof typeof access];
  function toggle(team: keyof typeof access) {
    trackAnalyticsControl(
      "wumi-" + team.toLowerCase() + "-" + (access[team] ? "revoke" : "grant"),
    );
    setAccess((current) => ({ ...current, [team]: !current[team] }));
    setEvents((current) =>
      [
        `${team} access ${access[team] ? "revoked" : "granted"} by the patient.`,
        ...current,
      ].slice(0, 4),
    );
  }
  return (
    <div className="pf-consent-demo">
      <div className="pf-demo-caption">
        <b>wumi</b>
        <span>A synthetic record</span>
      </div>
      <div className="pf-demo-tabs" aria-label="View record as">
        {["Patient", "Clinic", "Lab"].map((role) => (
          <button
            key={role}
            aria-pressed={viewer === role}
            onClick={() => {
              if (viewer !== role)
                trackAnalyticsControl("wumi-view-" + role.toLowerCase());
              setViewer(role);
            }}
          >
            {role}
          </button>
        ))}
      </div>
      <div
        key={`${viewer}-${allowed}`}
        className={`pf-record pf-trace-panel ${allowed ? "" : "pf-record--locked"}`}
        aria-live="polite"
      >
        <span>{viewer} view</span>
        <strong>
          {allowed ? "One connected record." : "This record is private."}
        </strong>
        {allowed ? (
          <dl>
            <div>
              <dt>Patient</dt>
              <dd>Alex Morgan · demo</dd>
            </div>
            <div>
              <dt>Latest entry</dt>
              <dd>Routine checkup</dd>
            </div>
            <div>
              <dt>Next step</dt>
              <dd>Follow-up scheduled</dd>
            </div>
          </dl>
        ) : (
          <p>
            The patient has not shared this record with the{" "}
            {viewer.toLowerCase()}. Changing the viewer does not grant access.
          </p>
        )}
      </div>
      <div className="pf-permissions">
        <span>Patient controls</span>
        {(["Clinic", "Lab"] as const).map((team) => (
          <button
            className="pf-permission"
            key={team}
            role="switch"
            aria-checked={access[team]}
            onClick={() => toggle(team)}
          >
            <span>Share with {team.toLowerCase()}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
      <details
        className="pf-demo-audit"
        data-analytics-detail="wumi-access-history"
      >
        <summary>Access history</summary>
        <ol aria-live="polite">
          {events.map((event, i) => (
            <li key={`${event}-${i}`}>{event}</li>
          ))}
        </ol>
      </details>
      <small className="pf-demo-note">
        An interactive explanation of consent. All information is synthetic; no
        health records are fetched or stored.
      </small>
    </div>
  );
}

const DEFENSE_RESULTS = [
  {
    name: "No defense",
    success: 12,
    count: 6,
    explanation:
      "Six of fifty attack attempts succeeded in this recorded test. This is the baseline for this paired experiment.",
  },
  {
    name: "Prompt defense",
    success: 38,
    count: 19,
    explanation:
      "Nineteen attacks succeeded. A defensive prompt alone made this particular run worse, which is why I test the defense rather than trust its wording.",
  },
  {
    name: "Fused defense",
    success: 0,
    count: 0,
    explanation:
      "No attacks succeeded in this run. On the clean-query evaluation, 76% of queries lost at least one retrieved chunk. Blocking useful retrieval also has a cost.",
  },
];
function Defense() {
  const [mode, setMode] = useState(0);
  const result = DEFENSE_RESULTS[mode];
  return (
    <div className="pf-defense-demo">
      <div className="pf-demo-caption">
        <b>Attack / defense</b>
        <span>Recorded experiment</span>
      </div>
      <div className="pf-demo-tabs" aria-label="Defense configuration">
        {DEFENSE_RESULTS.map((item, i) => (
          <button
            key={item.name}
            aria-pressed={mode === i}
            onClick={() => {
              if (mode !== i)
                trackAnalyticsControl(
                  ["defense-baseline", "defense-prompt", "defense-fused"][i],
                );
              setMode(i);
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div key={mode} className="pf-experiment-result pf-trace-panel">
        <strong>
          {result.success}
          <span>%</span>
        </strong>
        <p>
          attack success
          <br />
          in this test
        </p>
      </div>
      <div className="pf-experiment-grid" aria-hidden="true">
        {Array.from({ length: 50 }, (_, i) => (
          <i className={i < result.count ? "hit" : ""} key={i} />
        ))}
      </div>
      <p className="pf-demo-explanation" aria-live="polite">
        {result.explanation}
      </p>
      <small className="pf-demo-note">
        T2 paired ablation · n = 50 · llama3.2:3b · Phase 3.1. These are stored
        results, not a live model run. False-positive metrics from other
        experiments are not interchangeable.
      </small>
    </div>
  );
}

const SOURCES = [
  {
    topic: "Search",
    title: "A good result needs a route back.",
    note: "A useful search result should preserve its original source, not just repeat a summary. I keep that connection visible in Kiln and these project notes.",
    source: "Google Search Central",
    detail:
      "The JavaScript SEO basics describe how Google crawls, renders and indexes JavaScript pages. This supports the discoverability part of the note; it does not verify any project outcome.",
    url: "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics",
  },
  {
    topic: "Interaction",
    title: "Movement should answer an action.",
    note: "The spotlight reveals a slowly moving landscape. Outside the reveal, the page stays matte. Reduced-motion preferences keep the reveal and hold the landscape still.",
    source: "MDN Web Docs",
    detail:
      "prefers-reduced-motion communicates a visitor’s request to reduce non-essential movement. The background keeps the reveal and removes its automatic movement.",
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion",
  },
  {
    topic: "Retrieval",
    title: "Similar meaning, different words.",
    note: "A visitor might ask about protecting medical information without typing “consent”. Embeddings can connect that intent to the right technical note.",
    source: "Hugging Face",
    detail:
      "Transformers.js feature extraction can turn text into normalized vectors. Comparing those vectors supports local semantic ranking; it is not a guarantee of factual accuracy.",
    url: "https://huggingface.co/docs/transformers.js/api/pipelines",
  },
];
function Provenance() {
  const [selected, setSelected] = useState(0);
  const [step, setStep] = useState(false);
  const item = SOURCES[selected];
  return (
    <div className="pf-source-demo">
      <div className="pf-demo-caption">
        <b>kiln</b>
        <span>Keep the source</span>
      </div>
      <div className="pf-demo-tabs" aria-label="Choose a research note">
        {SOURCES.map((source, i) => (
          <button
            key={source.topic}
            aria-pressed={selected === i}
            onClick={() => {
              setSelected(i);
              if (selected !== i)
                trackAnalyticsControl(
                  [
                    "kiln-note-search",
                    "kiln-note-interaction",
                    "kiln-note-retrieval",
                  ][i],
                );
              setStep(false);
            }}
          >
            {source.topic}
          </button>
        ))}
      </div>
      <div
        key={`${selected}-${step}`}
        className="pf-source-paper pf-trace-panel"
        aria-live="polite"
      >
        <span>{step ? item.source : "A research note"}</span>
        <h3>{item.title}</h3>
        <p>{step ? item.detail : item.note}</p>
        {step && (
          <a href={item.url} target="_blank" rel="noreferrer">
            Read the original source ↗
          </a>
        )}
      </div>
      <button
        className="pf-text-button"
        onClick={() => {
          trackAnalyticsControl(step ? "kiln-source-hide" : "kiln-source-show");
          setStep(!step);
        }}
      >
        {step ? "Return to the note" : "Follow the source"}{" "}
        <span aria-hidden="true">→</span>
      </button>
      <small className="pf-demo-note">
        An illustrative source trail with real references. It does not reproduce
        Kiln’s full library or search engine.
      </small>
    </div>
  );
}

export default function ProjectDemo({ kind }: { kind: DemoKind }) {
  return (
    <div className={`pf-demo pf-glass pf-demo--${kind}`}>
      {kind === "consent" ? (
        <Consent />
      ) : kind === "defense" ? (
        <Defense />
      ) : (
        <Provenance />
      )}
    </div>
  );
}
