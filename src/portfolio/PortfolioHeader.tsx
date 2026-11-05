import { useEffect, useRef, useState } from "react";
import { RouteLink, usePath } from "../lib/router";
import FluidTabs from "./FluidTabs";
import ThemeIcon from "./ThemeIcon";
import type { BackgroundTheme } from "./backgrounds/SpotlightBackground";
import "./navigation.css";

const PAGES = [
  { id: "home", label: "Home", href: "/" },
  { id: "work", label: "Work", href: "/work" },
  { id: "writing", label: "Writing", href: "/writing" },
  { id: "playground", label: "Playground", href: "/playground" },
  { id: "about", label: "About", href: "/about" },
];

export default function PortfolioHeader({
  theme,
  toggle,
  openChat,
  openCommands,
}: {
  theme: BackgroundTheme;
  toggle: () => void;
  openChat: () => void;
  openCommands: () => void;
}) {
  const path = usePath();
  const active =
    PAGES.find((item) => item.id !== "home" && path.startsWith(item.href))
      ?.id ?? "home";
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      if (progress.current)
        progress.current.style.transform = `scaleX(${range > 0 ? Math.min(1, scrollY / range) : 0})`;
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const size = new ResizeObserver(scroll);
    size.observe(document.body);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        opener.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <header ref={header} className="pf-header pf-header-persistent">
      <RouteLink
        className="pf-wordmark"
        href="/"
        aria-label="Muhammad Musa, home"
      >
        Muhammad Musa<span>.</span>
      </RouteLink>
      <nav
        id="portfolio-navigation"
        className={`pf-nav pf-glass ${open ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <FluidTabs
          items={PAGES}
          value={active}
          label="Portfolio pages"
          onNavigate={() => setOpen(false)}
        />
        <div className="pf-mobile-links">
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
          <button
            onClick={() => {
              setOpen(false);
              opener.current?.focus();
              openChat();
            }}
          >
            MusA.I
          </button>
        </div>
      </nav>
      <div className="pf-header-actions">
        <button
          className="pf-search-trigger"
          onClick={openCommands}
          aria-label="Open command palette"
          title="Search the site · Ctrl / ⌘ K"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
          <kbd>Ctrl K</kbd>
        </button>
        <button
          className="pf-theme"
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <ThemeIcon theme={theme} />
        </button>
        <button
          className="pf-musai-trigger"
          onClick={openChat}
          aria-label="Open MusA.I"
          title="Open MusA.I · /"
        >
          MusA.I <span aria-hidden="true">↗</span>
        </button>
        <button
          ref={opener}
          className="pf-menu"
          aria-expanded={open}
          aria-controls="portfolio-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <div ref={progress} className="pf-reading-progress" aria-hidden="true" />
    </header>
  );
}
