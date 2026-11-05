import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { SEARCH_ENTRIES, rankSearch, searchMeaning, retryMeaningSearch, type SearchEntry, type MeaningUpdate } from "./command-search";
import "./commands.css";

export type PortfolioCommandSection = {
  id: string;
  label: string;
  href?: string;
  hint?: string;
  shortcut?: string;
};

type Props = {
  onClose: () => void;
  onAskMusai: (question?: string) => void;
  navigateTo: (href: string) => void;
  sections?: PortfolioCommandSection[];
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  spotlightDot?: boolean;
  onToggleSpotlightDot?: () => void;
};

type Command = Omit<SearchEntry, "href" | "group"> & {
  group: SearchEntry["group"] | "Connect" | "Appearance" | "MusA.I" | "Local studies";
  shortcut?: string;
  href?: string;
  action?: "ask" | "theme" | "pointer" | "download";
  question?: string;
};

const DEFAULT_SECTIONS: PortfolioCommandSection[] = [
  {
    id: "story",
    label: "My story & experience",
    href: "/about#story",
    shortcut: "1",
    hint: "Education, research and work",
  },
  {
    id: "journeys",
    label: "Explore the work",
    href: "/work",
    shortcut: "2",
    hint: "Research, machine learning, building and teaching",
  },
  {
    id: "work",
    label: "Selected work",
    href: "/#work",
    shortcut: "3",
    hint: "The projects on the homepage",
  },
  {
    id: "toolkit",
    label: "My toolkit",
    href: "/about#toolkit",
    shortcut: "4",
    hint: "Languages, systems and tools",
  },
  {
    id: "certificates",
    label: "Certificates",
    href: "/about#certificates",
    shortcut: "5",
    hint: "Credentials and learning",
  },
  {
    id: "humanity",
    label: "Why I build",
    href: "/about#humanity",
    shortcut: "6",
    hint: "People, teaching and purpose",
  },
  {
    id: "contact",
    label: "Get in touch",
    href: "/#contact",
    shortcut: "7",
    hint: "Start a conversation",
  },
];

// Public destinations from the existing site; never import its research snapshot.
const CONNECTIONS = [
  {
    id: "github",
    label: "GitHub",
    detail: "Public code and repositories",
    href: "https://github.com/muhammad-musa-ml",
    keywords: "source repo software code",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    detail: "Experience and professional profile",
    href: "https://www.linkedin.com/in/mmusa2/",
    keywords: "social professional connect",
  },
  {
    id: "email",
    label: "Email me",
    detail: "mmusa2@wisc.edu",
    href: "mailto:mmusa2@wisc.edu",
    keywords: "contact mail message hire hiring reach",
  },
  {
    id: "orcid",
    label: "ORCID",
    detail: "Researcher profile and publications",
    href: "https://orcid.org/0009-0009-5542-8040",
    keywords: "publication paper research researcher",
  },
];

const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function relevance(command: Command, query: string) {
  const label = normalize(command.label);
  const haystack = normalize(
    `${command.label} ${command.detail} ${command.keywords} ${command.group}`,
  );
  if (label === query) return 6;
  if (label.startsWith(query)) return 5;
  if (label.includes(query)) return 4;
  if (haystack.includes(query)) return 3;
  if (query.split(/\s+/).every((term) => haystack.includes(term))) return 2;
  // Forgive short abbreviations without allowing a one-letter query to match everything.
  if (query.length >= 3 && !query.includes(" ")) {
    let index = 0;
    for (const letter of label) if (letter === query[index]) index++;
    if (index === query.length) return 1;
  }
  return 0;
}

export default function PortfolioCommands({
  onClose,
  onAskMusai,
  navigateTo,
  sections = DEFAULT_SECTIONS,
  theme,
  onToggleTheme,
  spotlightDot,
  onToggleSpotlightDot,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<MeaningUpdate>({ status: "idle", query: "", matches: [] });
  const [retry, setRetry] = useState(0);
  const searchQuery = query.trim().slice(0, 300);
  const latestQuery = useRef(searchQuery);
  latestQuery.current = searchQuery;

  useEffect(() => searchMeaning(searchQuery, (update) => {
    if (update.query === latestQuery.current) setMeaning(update);
  }), [searchQuery, retry]);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const id = useId();
  const listId = `${id}-results`;

  const commands = useMemo<Command[]>(() => {
    const pages = SEARCH_ENTRIES.filter(entry => entry.kind === "page");
    const result: Command[] = [
      ...pages,
      ...sections.map(
        (section): Command => ({
          id: `section-${section.id}`,
          label: section.label,
          detail: section.hint ?? "Jump to this section",
          href: section.href ?? `/#${section.id}`,
          shortcut: section.shortcut,
          keywords: section.id,
          group: "Sections",
        }),
      ),
      ...SEARCH_ENTRIES.filter(entry => entry.kind === "project" || entry.kind === "article"),
      {
        id: "resume",
        label: "Download my résumé",
        detail: "PDF",
        href: "/Muhammad-Musa-Resume.pdf",
        keywords: "cv resume experience qualifications",
        action: "download",
        group: "Connect",
      },
      ...CONNECTIONS.map(
        (connection): Command => ({ ...connection, group: "Connect" }),
      ),
      {
        id: "musai",
        label: "Ask MusA.I",
        detail: "Questions about my work, grounded in this portfolio",
        keywords: "chat twin assistant ask question ai",
        shortcut: "/",
        action: "ask",
        group: "MusA.I",
      },
    ];
    if (onToggleTheme)
      result.push({
        id: "theme",
        label: `Use ${theme === "light" ? "dark" : "light"} mode`,
        detail: "Change the color palette",
        action: "theme",
        keywords: "theme appearance light dark colors",
        group: "Appearance",
      });
    if (onToggleSpotlightDot)
      result.push({
        id: "pointer",
        label: spotlightDot
          ? "Hide the spotlight dot"
          : "Show the spotlight dot",
        detail: spotlightDot ? "Use the system cursor; keep the spotlight" : "Replace the system cursor with the spotlight dot",
        action: "pointer",
        keywords: "cursor mouse pointer dot system appearance",
        group: "Appearance",
      });
    if (import.meta.env.DEV)
      result.push(
        {
          id: "backgrounds",
          label: "Background studies",
          detail: "Compare the preserved spotlight options",
          href: "/backgrounds",
          keywords: "design background spotlight alternatives",
          group: "Local studies",
        },
        {
          id: "motion",
          label: "Motion studies",
          detail: "Compare 3D forms and transitions",
          href: "/motion-studio",
          keywords: "design animation three 3d four 4d trace",
          group: "Local studies",
        },
        {
          id: "samples",
          label: "All design samples",
          detail: "The earlier website studies",
          href: "/samples",
          keywords: "archive preserved design interference curio reading room",
          group: "Local studies",
        },
        {
          id: "interface-experiments",
          label: "Earlier playground experiments",
          detail: "The preserved demos, pathfinding and learning labs",
          href: "/playground/experiments",
          keywords: "archive experiment lab pathfinding learning demos",
          group: "Local studies",
        },
      );
    return [...result.filter(command => command.group === "Appearance"), ...result.filter(command => command.group !== "Appearance")];
  }, [sections, theme, onToggleTheme, spotlightDot, onToggleSpotlightDot]);

  const rows = useMemo<Command[]>(() => {
    if (!searchQuery) return commands;
    const matches = meaning.query === searchQuery && meaning.status === "ready" ? meaning.matches : [];
    const destinations = rankSearch(searchQuery, matches);
    const actions = commands.filter(command => command.action || command.group === "Connect" || command.group === "Local studies")
      .map(command => ({ ...command, score: relevance(command, normalize(searchQuery)) * 8 }))
      .filter(command => command.score > 0);
    const found: Command[] = [...destinations, ...actions].sort((a, b) => b.score - a.score).slice(0, 15);
    if (searchQuery.length >= 3) found.push({
      id: "question",
      label: `Ask MusA.I: “${searchQuery}”`,
      detail: "Have a conversation about my work",
      group: "MusA.I",
      keywords: "",
      action: "ask",
      question: searchQuery,
    });
    return found;
  }, [commands, searchQuery, meaning]);
  // Preserve the destination a visitor selects while semantic results arrive.
  const selected = Math.max(0, activeId ? rows.findIndex(row => row.id === activeId) : 0);
  const searchStatus = meaning.query === searchQuery ? meaning.status : "idle";
  const statusText = searchStatus === "loading"
    ? "Preparing meaning search for the first time. Quick matches are ready."
    : searchStatus === "searching" ? "Finding related work… Quick matches are ready."
    : searchStatus === "ready" ? "Matched by meaning and text. Your searches stay on this device."
    : searchStatus === "error" ? "Meaning search is unavailable. Text matching still works."
    : "Try a question, a skill, or something you want to explore.";

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => input.current?.focus());
    const keepFocus = (event: FocusEvent) => {
      if (dialog.current && !dialog.current.contains(event.target as Node))
        input.current?.focus();
    };
    document.addEventListener("focusin", keepFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", keepFocus);
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const row = list.current?.querySelector<HTMLElement>(
      `[data-command-index="${selected}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [selected, query]);

  function run(command: Command) {
    if (command.action === "ask") {
      onClose();
      // Give the closing dialog its focus/scroll cleanup before opening MusA.I.
      requestAnimationFrame(() => onAskMusai(command.question));
    } else if (command.action === "theme") {
      onToggleTheme?.();
      onClose();
    } else if (command.action === "pointer") {
      onToggleSpotlightDot?.();
      onClose();
    } else if (command.action === "download") {
      const anchor = document.createElement("a");
      anchor.href = command.href!;
      anchor.download = "Muhammad-Musa-Resume.pdf";
      anchor.click();
      onClose();
    } else if (command.href?.startsWith("https://")) {
      window.open(command.href, "_blank", "noopener,noreferrer");
      onClose();
    } else if (command.href?.startsWith("mailto:")) {
      window.location.href = command.href;
      onClose();
    } else if (command.href) {
      onClose();
      requestAnimationFrame(() => navigateTo(command.href!));
    }
  }

  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.nativeEvent.isComposing ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey
    )
      return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (rows.length)
        setActiveId(rows[(selected + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length].id);
    } else if (event.key === "Enter" && rows[selected]) {
      event.preventDefault();
      run(rows[selected]);
    }
  }

  function onDialogKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close.current();
    } else if (event.key === "Tab") {
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          "input,button,a[href],[tabindex]",
        ) ?? [],
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.hasAttribute("disabled") &&
          element.getClientRects().length > 0,
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  return (
    <div
      className="pf-command-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        className="pf-command-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={onDialogKey}
      >
        <header className="pf-command-header">
          <div>
            <h2 id={`${id}-title`}>Find your way.</h2>
            <p>Ask a question. Find the work behind the answer.</p>
          </div>
          <button
            className="pf-command-close"
            onClick={onClose}
            aria-label="Close command palette"
          >
            Esc <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="pf-command-search">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle
              cx="10.5"
              cy="10.5"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveId(null);
            }}
            onKeyDown={onInputKey}
            placeholder="What are you curious about?"
            maxLength={300}
            aria-label="Search questions, skills, projects, and writing"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={
              rows.length ? `${id}-command-${selected}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {searchQuery && <div className="pf-command-status">
          <span role="status" aria-live="polite">{statusText}</span>
          {searchStatus === "error" && <button onClick={() => { retryMeaningSearch(); setRetry(value => value + 1); }}>Retry</button>}
        </div>}
        <div
          ref={list}
          id={listId}
          className="pf-command-list"
          role="listbox"
          aria-label="Portfolio commands"
        >
          {rows.map((command, index) => (
            <div role="presentation" key={command.id}>
              {(searchQuery ? index === 0 || command.id === "question" : index === 0 || rows[index - 1].group !== command.group) && (
                <div className="pf-command-group" aria-hidden="true">
                  {searchQuery ? command.id === "question" ? "Keep exploring" : "Best matches" : command.group}
                </div>
              )}
              <button
                id={`${id}-command-${index}`}
                role="option"
                aria-selected={selected === index}
                tabIndex={-1}
                aria-label={`${command.label}, ${command.group}. ${command.detail}`}
                className="pf-command-option"
                data-command-index={index}
                onPointerMove={(event) => {
                  // Scrolling a keyboard-selected result under a stationary
                  // pointer should not change the selection again.
                  if (event.movementX || event.movementY) setActiveId(command.id);
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => run(command)}
              >
                <span className="pf-command-option-copy">
                  <strong>{command.label}</strong>
                  <span>{searchQuery && command.snippet ? command.group : command.detail}</span>
                  {searchQuery && command.snippet && <span className="pf-command-snippet">{command.snippet}</span>}
                  {searchQuery && command.href?.startsWith("/") && !command.action && <span className="pf-command-destination">{command.href}</span>}
                </span>
                {command.shortcut ? (
                  <kbd>{command.shortcut}</kbd>
                ) : (
                  <span className="pf-command-arrow" aria-hidden="true">
                    {command.href?.startsWith("https:") ? "↗" : "↵"}
                  </span>
                )}
              </button>
            </div>
          ))}
          {!rows.length && (
            <p className="pf-command-empty" role="status">
              No matches yet. Try a project name, a skill, or a longer question.
            </p>
          )}
        </div>
        <footer className="pf-command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
          <span>
            <kbd>1–7</kbd> on the page
          </span>
          <span>
            <kbd>/</kbd> MusA.I
          </span>
        </footer>
      </div>
    </div>
  );
}
