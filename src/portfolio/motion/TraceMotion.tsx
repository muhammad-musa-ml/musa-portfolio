import { useEffect, useRef, type ReactNode } from "react";
import "./trace.css";

function RouteSurface({
  children,
  route,
}: {
  children: ReactNode;
  route: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let waiting: MutationObserver | undefined;

    function prepare() {
      if (!element || preference.matches) return;
      // Wait for lazy route content before drawing its entrance. A status
      // placeholder is usable immediately and never masquerades as progress.
      const main = element.querySelector("main:not([role='status'])");
      if (!main) return;
      element.dataset.traceReady = "true";
      // During a native crossfade the snapshot supplies the entrance. Record
      // that choice on this surface so cleanup cannot start a second animation.
      if (document.documentElement.dataset.portfolioTransition)
        element.dataset.traceSnapshot = "true";
      waiting?.disconnect();
      const dividers = main.querySelectorAll<HTMLElement>(
        ".pf-section-heading, .pf-project-experiments-heading, .pf-related > h2",
      );
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("pf-trace-seen");
            observer?.unobserve(entry.target);
          }
        },
        { threshold: 0.2 },
      );
      for (const divider of dividers) {
        if (divider.classList.contains("pf-trace-seen")) continue;
        divider.classList.add("pf-trace-divider");
        observer.observe(divider);
      }
    }

    function changed() {
      observer?.disconnect();
      waiting?.disconnect();
      if (preference.matches) {
        delete element!.dataset.traceReady;
        return;
      }
      waiting = new MutationObserver(prepare);
      waiting.observe(element!, { childList: true, subtree: true });
      prepare();
    }

    changed();
    preference.addEventListener("change", changed);
    return () => {
      observer?.disconnect();
      waiting?.disconnect();
      preference.removeEventListener("change", changed);
    };
  }, []);

  return (
    <div
      ref={root}
      className="pf-trace-route"
      data-portfolio-trace
      data-portfolio-route={route}
    >
      <span className="pf-trace-rule" aria-hidden="true" />
      {children}
    </div>
  );
}

/** Route identity resets only the page; the header and background stay mounted. */
export function TraceRoute({
  route,
  enabled = true,
  children,
}: {
  route: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <RouteSurface key={route} route={route}>
      {children}
    </RouteSurface>
  );
}
