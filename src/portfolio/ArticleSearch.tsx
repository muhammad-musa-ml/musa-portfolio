import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Article } from "./content";
import FluidTabs from "./FluidTabs";
import type {
  SearchDocument,
  SearchWorkerRequest,
  SearchWorkerResponse,
} from "./search.worker";
import "./search.css";

type Props = { articles: Article[]; onResults: (articles: Article[]) => void };
type SearchStatus = "off" | "loading" | "ready" | "error";
type Ranking = { query: string; matches: { slug: string; score: number }[] };
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "with",
  "you",
]);

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function searchText(article: Article) {
  return normalize(
    [
      article.title,
      article.dek,
      ...article.topics,
      ...article.sections.flatMap((section) => [
        section.heading,
        ...section.paragraphs,
      ]),
    ].join(" "),
  );
}

function documentsFor(articles: Article[]): SearchDocument[] {
  return articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    summary: `${article.dek} ${article.topics.join(", ")}`,
    // The model has a short context; index passages instead of truncating an article.
    passages: article.sections.flatMap((section) => {
      const words = `${section.heading}. ${section.paragraphs.join(" ")}`.split(
        /\s+/,
      );
      const passages: string[] = [];
      for (let i = 0; i < words.length; i += 140)
        passages.push(words.slice(i, i + 170).join(" "));
      return passages;
    }),
  }));
}

export default function ArticleSearch({ articles, onResults }: Props) {
  const inputId = useId();
  const helpId = useId();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<SearchStatus>("off");
  const [progress, setProgress] = useState<{
    message: string;
    percent?: number;
  }>({ message: "" });
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [searching, setSearching] = useState(false);
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  const normalizedQuery = normalize(query);
  const latestQuery = useRef(normalizedQuery);
  latestQuery.current = normalizedQuery;
  const topics = useMemo(
    () => [...new Set(articles.flatMap((article) => article.topics))],
    [articles],
  );
  const primaryTopics = useMemo(
    () => [
      ...new Set(articles.map((article) => article.topics[0]).filter(Boolean)),
    ],
    [articles],
  );
  const indexed = useMemo(
    () =>
      articles.map((article) => ({
        article,
        text: searchText(article),
        title: normalize(article.title),
      })),
    [articles],
  );
  const tokens = useMemo(
    () =>
      (normalizedQuery.match(/[\p{L}\p{N}]+/gu) ?? []).filter(
        (token) => !STOP_WORDS.has(token),
      ),
    [normalizedQuery],
  );
  const lexical = useMemo(
    () =>
      indexed.map((entry) => ({
        ...entry,
        score: tokens.length
          ? tokens.reduce(
              (total, token) =>
                total +
                (entry.title.includes(token)
                  ? 3
                  : entry.text.includes(token)
                    ? 1
                    : 0),
              0,
            )
          : 0,
      })),
    [indexed, tokens],
  );
  const usingMeaning =
    status === "ready" &&
    !!normalizedQuery &&
    ranking?.query === normalizedQuery;

  const results = useMemo(() => {
    const candidates = lexical.filter(
      (entry) => !topic || entry.article.topics.includes(topic),
    );
    if (!normalizedQuery) return candidates.map((entry) => entry.article);
    if (usingMeaning && ranking) {
      const semantic = new Map(
        ranking.matches.map((match) => [match.slug, match.score]),
      );
      return candidates
        .map((entry) => ({
          article: entry.article,
          score:
            (semantic.get(entry.article.slug) ?? -1) +
            Math.min(entry.score, 6) * 0.025,
          relevant:
            (semantic.get(entry.article.slug) ?? -1) >= 0.22 || entry.score > 0,
        }))
        .filter((entry) => entry.relevant)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.article);
    }
    return candidates
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.article);
  }, [lexical, topic, normalizedQuery, usingMeaning, ranking]);

  useEffect(() => {
    onResults(results);
  }, [results, onResults]);

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  function disable() {
    worker.current?.terminate();
    worker.current = null;
    request.current++;
    setStatus("off");
    setRanking(null);
    setSearching(false);
  }

  function enable() {
    worker.current?.terminate();
    setStatus("loading");
    setProgress({ message: "Preparing meaning search…" });
    setRanking(null);
    try {
      const next = new Worker(new URL("./search.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = next;
      const failed = () => {
        if (worker.current !== next) return;
        next.terminate();
        worker.current = null;
        setStatus("error");
        setSearching(false);
        setRanking(null);
      };
      next.onerror = (event) => {
        console.warn("Meaning search could not start:", event.message);
        failed();
      };
      next.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
        if (worker.current !== next) return;
        const message = event.data;
        if (message.type === "progress")
          setProgress({ message: message.message, percent: message.percent });
        else if (message.type === "ready") setStatus("ready");
        else if (message.type === "error") {
          console.warn("Meaning search is unavailable:", message.message);
          failed();
        } else if (
          message.type === "results" &&
          message.id === request.current &&
          message.query === latestQuery.current
        ) {
          setRanking({ query: message.query, matches: message.matches });
          setSearching(false);
        }
      };
      next.postMessage({
        type: "init",
        documents: documentsFor(articles),
      } satisfies SearchWorkerRequest);
    } catch {
      worker.current = null;
      setStatus("error");
    }
  }

  useEffect(() => {
    const id = ++request.current;
    if (status !== "ready" || !normalizedQuery) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      worker.current?.postMessage({
        type: "search",
        id,
        query: normalizedQuery,
      } satisfies SearchWorkerRequest);
    }, 280);
    return () => clearTimeout(timer);
  }, [normalizedQuery, status]);

  return (
    <section className="pf-article-search" aria-label="Find an article">
      <label htmlFor={inputId}>What are you interested in?</label>
      <div className="pf-search-input-wrap">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.4 15.4 5.1 5.1" />
        </svg>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try reliable pipelines, language equity, or consent…"
          aria-describedby={helpId}
          autoComplete="off"
          maxLength={300}
        />
        {query && (
          <button
            type="button"
            className="pf-search-clear"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>
      <div className="pf-search-topics" aria-label="Filter articles by topic">
        <FluidTabs
          items={[
            { id: "", label: "All topics" },
            ...primaryTopics.map((item) => ({ id: item, label: item })),
          ]}
          value={topic}
          onChange={(value) => setTopic(topic === value ? "" : value)}
          label="Article topics"
        />
        {topics.length > primaryTopics.length && (
          <select
            className="pf-search-topic-select"
            aria-label="Browse all topics"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          >
            <option value="">More topics</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="pf-meaning-control">
        <div id={helpId}>
          {status === "off" && (
            <p>
              Search the words now, or search by meaning. Meaning search
              downloads a model and runtime (tens of MB) from Hugging Face and
              its CDN; your query stays in this browser.
            </p>
          )}
          {status === "loading" && (
            <div className="pf-search-progress">
              <p role="status">
                {progress.message}
                {progress.percent !== undefined ? ` ${progress.percent}%` : ""}
              </p>
              <progress
                aria-label={progress.message}
                max={100}
                value={progress.percent}
              />
              <small>Text search is available while this loads.</small>
            </div>
          )}
          {status === "ready" && (
            <p>
              Meaning search is ready. It compares ideas using a model running
              in your browser.
            </p>
          )}
          {status === "error" && (
            <p role="status">
              Meaning search couldn’t load on this connection or device. Text
              search and topic filters still work.
            </p>
          )}
        </div>
        {status === "off" || status === "error" ? (
          <button type="button" className="pf-meaning-button" onClick={enable}>
            {status === "error"
              ? "Retry meaning search"
              : "Enable meaning search"}
          </button>
        ) : (
          <button type="button" className="pf-meaning-button" onClick={disable}>
            {status === "loading" ? "Cancel download" : "Use text search"}
          </button>
        )}
      </div>
      <p className="pf-search-count" role="status" aria-live="polite">
        {searching
          ? "Finding related articles… Showing text matches while I look."
          : `${results.length} ${results.length === 1 ? "article" : "articles"}${usingMeaning ? " · sorted by meaning" : normalizedQuery ? " · text matches" : ""}${topic ? ` · ${topic}` : ""}`}
      </p>
    </section>
  );
}
