import { useLayoutEffect, useRef } from "react";
import { RouteLink } from "../lib/router";

export type FluidTab = { id: string; label: string; href?: string };

/** Selection moves the surface; hovering never moves the current-page marker. */
export default function FluidTabs({
  items,
  value,
  onChange,
  label,
  className = "",
  onNavigate,
}: {
  items: FluidTab[];
  value: string;
  onChange?: (value: string) => void;
  label: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLSpanElement>(null);
  const measure = useRef<() => void>(() => {});
  const selected = useRef(value);
  const contentKey = items.map((item) => `${item.id}:${item.label}`).join("|");

  useLayoutEffect(() => {
    const element = root.current;
    const marker = surface.current;
    if (!element || !marker) return;
    let placed = false;
    let frame = 0;
    const update = () => {
      const active = Array.from(
        element.querySelectorAll<HTMLElement>("[data-fluid-tab]"),
      ).find((item) => item.dataset.fluidTab === selected.current);
      if (!active || !active.offsetWidth) {
        cancelAnimationFrame(frame);
        marker.style.opacity = "0";
        marker.dataset.ready = "false";
        placed = false;
        return;
      }
      marker.style.width = `${active.offsetWidth}px`;
      marker.style.height = `${active.offsetHeight}px`;
      marker.style.transform = `translate3d(${active.offsetLeft}px,${active.offsetTop}px,0)`;
      marker.style.opacity = "1";
      // The first visible position is placed without flying in from (0, 0).
      if (!placed) {
        placed = true;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          marker.dataset.ready = "true";
        });
      }
    };
    measure.current = update;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.querySelectorAll("[data-fluid-tab]"))
      observer.observe(child);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      measure.current = () => {};
    };
  }, [contentKey]);

  useLayoutEffect(() => {
    selected.current = value;
    measure.current();
  }, [value, contentKey]);

  return (
    <div ref={root} className={`pf-fluid-tabs ${className}`} aria-label={label}>
      <span ref={surface} aria-hidden="true" className="pf-fluid-surface" />
      {items.map((item) =>
        item.href ? (
          <RouteLink
            key={item.id}
            href={item.href}
            data-fluid-tab={item.id}
            aria-current={item.id === value ? "page" : undefined}
            onNavigate={onNavigate}
          >
            {item.label}
          </RouteLink>
        ) : (
          <button
            key={item.id}
            type="button"
            data-fluid-tab={item.id}
            aria-pressed={item.id === value}
            onClick={() => onChange?.(item.id)}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
