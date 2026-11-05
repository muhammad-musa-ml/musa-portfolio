// Shared History-API router. The portfolio crossfades its page surface only;
// historical studies retain their native document transition.
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

export function getPath(): string {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "" ? "/" : path;
}

const listeners = new Set<() => void>();
let cancelAnchorWait: (() => void) | undefined;
let cancelPageWait: (() => void) | undefined;
type PageTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
};
let transition: PageTransition | undefined;
let navigationId = 0;

function finishNavigation(hash: string, smooth: boolean) {
  cancelAnchorWait?.();
  const behavior =
    smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "smooth"
      : "auto";
  if (!hash) {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return;
  }
  const reveal = () => {
    const target = document.getElementById(id);
    if (!target) return false;
    target.scrollIntoView({ behavior, block: "start" });
    return true;
  };
  if (reveal()) return;
  const observer = new MutationObserver(() => {
    if (reveal()) cancelAnchorWait?.();
  });
  const timer = window.setTimeout(() => cancelAnchorWait?.(), 3000);
  observer.observe(document.getElementById("root") ?? document.body, {
    childList: true,
    subtree: true,
  });
  cancelAnchorWait = () => {
    observer.disconnect();
    clearTimeout(timer);
    cancelAnchorWait = undefined;
  };
}

/** Restore direct-load anchors, including sections on lazy routes. */
export function restoreHash() {
  if (window.location.hash) finishNavigation(window.location.hash, false);
}

function notify() {
  flushSync(() => listeners.forEach((listener) => listener()));
}

function waitForPage(path: string) {
  const ready = () => {
    const surface = document.querySelector<HTMLElement>(
      "[data-portfolio-route]",
    );
    return (
      surface?.dataset.portfolioRoute === path &&
      surface.querySelector("main:not([role='status'])")
    );
  };
  if (ready()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (ready()) done();
    });
    const timer = window.setTimeout(done, 650);
    function done() {
      observer.disconnect();
      clearTimeout(timer);
      if (cancelPageWait === done) cancelPageWait = undefined;
      resolve();
    }
    cancelPageWait = done;
    observer.observe(document.getElementById("root") ?? document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function portfolioPage(path: string) {
  return (
    !/^\/(samples|journeys)(\/|$)/.test(path) &&
    path !== "/backgrounds" &&
    path !== "/motion-studio"
  );
}

function stopTransition() {
  navigationId++;
  cancelPageWait?.();
  transition?.skipTransition();
  transition = undefined;
  delete document.documentElement.dataset.portfolioTransition;
}

function changePage(update: () => void, path: string, after: () => void) {
  stopTransition();
  const id = navigationId;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startViewTransition = (
    document as Document & {
      startViewTransition?: (
        update: () => void | Promise<void>,
      ) => PageTransition;
    }
  ).startViewTransition?.bind(document);
  const portfolioActive = document.body.classList.contains("portfolio-active");
  const portfolio =
    portfolioActive &&
    !!document.querySelector("[data-portfolio-route]") &&
    portfolioPage(path);
  const oldBounds = portfolio
    ? document
        .querySelector<HTMLElement>("[data-portfolio-route]")!
        .getBoundingClientRect()
    : undefined;
  if (startViewTransition && !reduced && (!portfolioActive || portfolio)) {
    if (portfolio)
      document.documentElement.dataset.portfolioTransition = "true";
    try {
      const current = startViewTransition(async () => {
        // A newer click must never be overwritten by a skipped older transition.
        if (id !== navigationId) return;
        update();
        if (portfolio) await waitForPage(path);
        if (id !== navigationId) return;
        after();
        if (oldBounds) {
          const bounds = document
            .querySelector<HTMLElement>("[data-portfolio-route]")
            ?.getBoundingClientRect();
          if (bounds) {
            // The group sits at the new page's position. Preserve the old
            // snapshot's viewport position when leaving a deeply scrolled page.
            document.documentElement.style.setProperty(
              "--pf-route-old-offset",
              `${oldBounds.top - bounds.top}px`,
            );
          }
        }
        const main = document.querySelector<HTMLElement>(
          "main:not([role='status'])",
        );
        main?.setAttribute("tabindex", "-1");
        main?.focus({ preventScroll: true });
      });
      transition = current;
      // A hidden tab, rapid click, or unsupported capture can skip the animation.
      // The DOM update still runs; skipped animations are not application errors.
      void current.ready.catch(() => {});
      const cleanup = () => {
        if (transition !== current) return;
        transition = undefined;
        delete document.documentElement.dataset.portfolioTransition;
      };
      void current.finished.then(cleanup, cleanup);
      return;
    } catch {
      delete document.documentElement.dataset.portfolioTransition;
    }
  }
  update();
  after();
}

export function navigate(path: string, options?: { replace?: boolean }) {
  const destination = new URL(path, window.location.href);
  const destinationPath = destination.pathname.replace(/\/+$/, "") || "/";
  const samePage = getPath() === destinationPath;
  if (samePage) {
    stopTransition();
    if (
      window.location.pathname +
        window.location.search +
        window.location.hash !==
      path
    )
      window.history[options?.replace ? "replaceState" : "pushState"](
        {},
        "",
        path,
      );
    notify();
    finishNavigation(destination.hash, true);
    return;
  }
  changePage(
    () => {
      window.history[options?.replace ? "replaceState" : "pushState"](
        {},
        "",
        path,
      );
      notify();
    },
    destinationPath,
    () => finishNavigation(destination.hash, false),
  );
}

function onPopState() {
  const path = getPath();
  if (
    document.querySelector<HTMLElement>("[data-portfolio-route]")?.dataset
      .portfolioRoute === path
  ) {
    stopTransition();
    notify();
    restoreHash();
    return;
  }
  changePage(notify, path, restoreHash);
}

export function usePath(): string {
  const [path, setPath] = useState(getPath);
  useEffect(() => {
    const onChange = () => setPath(getPath());
    if (listeners.size === 0) window.addEventListener("popstate", onPopState);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
      if (listeners.size === 0)
        window.removeEventListener("popstate", onPopState);
    };
  }, []);
  return path;
}

export function RouteLink({
  href,
  children,
  onNavigate,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0 ||
      rest.target === "_blank" ||
      rest.download !== undefined
    )
      return;
    event.preventDefault();
    onNavigate?.();
    navigate(href);
  };
  return (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
