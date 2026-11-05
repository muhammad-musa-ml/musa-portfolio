import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ARTICLES, PROJECTS } from "./content";
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

type Command = {
  id: string;
  label: string;
  detail: string;
  group:
    | "Go somewhere"
    | "Sections"
    | "Projects"
    | "Writing"
    | "Connect"
    | "Appearance"
    | "MusA.I";
  keywords: string;
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
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const id = useId();
  const listId = `${id}-results`;

  const commands = useMemo<Command[]>(() => {
    const pages: Command[] = [
      {
        id: "home",
        label: "Home",
        detail: "An introduction to my work",
        href: "/",
        keywords: "top intro overview musa",
        group: "Go somewhere",
      },
      {
        id: "all-work",
        label: "All work",
        detail: "Projects, research and the decisions behind them",
        href: "/work",
        keywords:
          "projects portfolio journeys evidence research machine learning building teaching",
        group: "Go somewhere",
      },
      {
        id: "writing",
        label: "Writing",
        detail: "Technical notes and things I have learned",
        href: "/writing",
        keywords: "blogs articles notes reading",
        group: "Go somewhere",
      },
      {
        id: "playground",
        label: "Playground",
        detail: "Explore things I have built",
        href: "/playground",
        keywords: "try demo experiment interactive build",
        group: "Go somewhere",
      },
      {
        id: "about",
        label: "About me",
        detail: "Experience, skills and the person behind the work",
        href: "/about",
        keywords:
          "biography story education experience toolkit certificates humanity hire",
        group: "Go somewhere",
      },
    ];
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
      ...PROJECTS.map(
        (project): Command => ({
          id: `project-${project.id}`,
          label: project.name,
          detail: project.category,
          href: `/work/${project.id}`,
          keywords: `${project.headline} ${project.summary} ${project.technologies.join(" ")}`,
          group: "Projects",
        }),
      ),
      ...ARTICLES.map(
        (article): Command => ({
          id: `article-${article.slug}`,
          label: article.title,
          detail: `${article.minutes} min · ${article.topics[0]}`,
          href: `/writing/${article.slug}`,
          keywords: `${article.dek} ${article.topics.join(" ")}`,
          group: "Writing",
        }),
      ),
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
        detail: "Keep the spotlight; change its pointer marker",
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
          group: "Appearance",
        },
        {
          id: "motion",
          label: "Motion studies",
          detail: "Compare 3D forms and transitions",
          href: "/motion-studio",
          keywords: "design animation three 3d four 4d trace",
          group: "Appearance",
        },
        {
          id: "samples",
          label: "All design samples",
          detail: "The earlier website studies",
          href: "/samples",
          keywords: "archive preserved design interference curio reading room",
          group: "Appearance",
        },
        {
          id: "interface-experiments",
          label: "Earlier playground experiments",
          detail: "The preserved demos, pathfinding and learning labs",
          href: "/playground/experiments",
          keywords: "archive experiment lab pathfinding learning demos",
          group: "Appearance",
        },
      );
    return result;
  }, [sections, theme, onToggleTheme, spotlightDot, onToggleSpotlightDot]);

  const rows = useMemo(() => {
    const text = normalize(query);
    const found = text
      ? commands
          .map((command, index) => ({
            command,
            index,
            score: relevance(command, text),
          }))
          .filter((row) => row.score > 0)
          .sort((a, b) => b.score - a.score || a.index - b.index)
          .map((row) => row.command)
      : commands;
    if (query.trim().length >= 3)
      return [
        ...found,
        {
          id: "question",
          label: `Ask MusA.I: “${query.trim()}”`,
          detail: "Send this as a question about my work",
          group: "MusA.I",
          keywords: "",
          action: "ask",
          question: query.trim(),
        } satisfies Command,
      ];
    return found;
  }, [commands, query]);
  const selected = Math.min(active, Math.max(0, rows.length - 1));

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
        setActive(
          (selected + (event.key === "ArrowDown" ? 1 : -1) + rows.length) %
            rows.length,
        );
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
            <p>A page, a project, or a question for MusA.I.</p>
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
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search the portfolio…"
            aria-label="Search pages, projects, and writing"
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
        <div
          ref={list}
          id={listId}
          className="pf-command-list"
          role="listbox"
          aria-label="Portfolio commands"
        >
          {rows.map((command, index) => (
            <div role="presentation" key={command.id}>
              {(index === 0 || rows[index - 1].group !== command.group) && (
                <div className="pf-command-group" aria-hidden="true">
                  {command.group}
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
                  if (event.movementX || event.movementY) setActive(index);
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => run(command)}
              >
                <span className="pf-command-option-copy">
                  <strong>{command.label}</strong>
                  <span>{command.detail}</span>
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
