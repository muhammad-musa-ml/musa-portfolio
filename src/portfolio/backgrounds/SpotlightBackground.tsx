import { useEffect, useRef } from "react";
import {
  createFieldTransform,
  getField,
  type BackgroundVariant,
  type Point3,
} from "./geometry";
import "./backgrounds.css";

export type { BackgroundVariant } from "./geometry";
export type BackgroundTheme = "dark" | "light";

export const BACKGROUND_OPTIONS: {
  id: BackgroundVariant;
  name: string;
  description: string;
}[] = [
  {
    id: "neural",
    name: "Synapse field",
    description:
      "A network suspended in depth. Follow a connection and another one appears.",
  },
  {
    id: "contours",
    name: "Signal atlas",
    description:
      "Fine lines fold into a continuous surface. A quiet landscape beneath the page.",
  },
  {
    id: "orbital",
    name: "Orbital archive",
    description: "Interlocking wire sculptures, revealed a little at a time.",
  },
  {
    id: "hypercube",
    name: "Hypercube",
    description:
      "Four-dimensional cubes rotate through a dimension you can’t see. Scroll to unfold the projection.",
  },
  {
    id: "attention",
    name: "Attention lattice",
    description:
      "Layers of tokens and weighted connections shift as you scroll. A glimpse inside a computational structure.",
  },
  {
    id: "tensor",
    name: "Tensor field",
    description:
      "An ordered tensor grid opens into a folded point cloud. Scroll to move between structure and possibility.",
  },
  {
    id: "latent",
    name: "A space of possibilities",
    description:
      "The selected background. A living point-cloud landscape, revealed only by the spotlight. Scroll to fold the surface.",
  },
];

export const BACKGROUND_PALETTES = {
  dark: {
    base: "#0b0c10",
    colors: ["#ffb454", "#63e2c6", "#f2ebdd"],
    cursor: "#ffb454",
  },
  light: {
    base: "#f0ede6",
    colors: ["#aa5b12", "#176e63", "#59686b"],
    cursor: "#aa5b12",
  },
} as const;

type Props = {
  variant: BackgroundVariant;
  theme: BackgroundTheme;
  /** Fit a positioned preview container instead of the viewport. */
  preview?: boolean;
  /** A centered reveal for a keyboard-operated demonstration. */
  reveal?: boolean;
  cursor?: boolean;
};

function blendColor(from: string, to: string, amount: number) {
  return (
    "#" +
    [1, 3, 5]
      .map((offset) => {
        const a = parseInt(from.slice(offset, offset + 2), 16);
        const b = parseInt(to.slice(offset, offset + 2), 16);
        return Math.round(a + (b - a) * amount)
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

/** Only geometry receives the alpha mask; empty pixels stay transparent. */
export default function SpotlightBackground({
  variant,
  theme,
  preview = false,
  reveal = false,
  cursor = true,
}: Props) {
  const element = useRef<HTMLCanvasElement>(null);
  const currentTheme = useRef(theme);
  const requestDraw = useRef<(() => void) | null>(null);

  useEffect(() => {
    currentTheme.current = theme;
    requestDraw.current?.();
  }, [theme]);

  useEffect(() => {
    const canvas = element.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const field = getField(variant);
    // Compile shared vertices once; scrolling does not allocate thousands of points.
    const vertices = [
      ...new Set([
        ...field.strokes.flatMap((stroke) => stroke.points),
        ...field.dots,
      ]),
    ];
    const vertexIds = new Map(vertices.map((point, index) => [point, index]));
    const strokes = field.strokes.map((stroke) => ({
      ...stroke,
      indices: stroke.points.map((point) => vertexIds.get(point)!),
    }));
    const dots = field.dots.map((dot) => ({
      ...dot,
      index: vertexIds.get(dot)!,
    }));
    const projected = new Float32Array(vertices.length * 3);
    const tones = new Float32Array(vertices.length);
    const transformed: Point3 = { x: 0, y: 0, z: 0 };
    // Keep the field and pointer alive across a theme change. Only its colors
    // blend, so switching modes cannot reset the spotlight to the page center.
    let lightness = currentTheme.current === "light" ? 1 : 0;
    let fromLightness = lightness;
    let targetLightness = lightness;
    let themeStarted = 0;
    let paintedLightness = -1;
    let colors: string[] = [];
    let coral = "";
    let latentColors: string[] = [];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const still = new URLSearchParams(window.location.search).has("still");
    let bounds = canvas.getBoundingClientRect();
    let width = bounds.width;
    let height = bounds.height;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let inView = true;
    let frame = 0;
    let idleTouch: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let targetScroll = window.scrollY / Math.max(window.innerHeight, 1);
    const pointer = {
      x: width / 2,
      y: height / 2,
      clientX: width / 2,
      clientY: height / 2,
      active: false,
      mouse: false,
    };
    const eased = {
      x: pointer.x,
      y: pointer.y,
      amount: 0,
      scroll: targetScroll,
    };

    function projectVertices(scroll: number, seconds: number) {
      // Perspective and parallax retain depth without running a WebGL renderer.
      const shiftX =
        reducedMotion.matches || still
          ? 0
          : (eased.x / Math.max(width, 1) - 0.5) * 0.07;
      const shiftY =
        reducedMotion.matches || still
          ? 0
          : (eased.y / Math.max(height, 1) - 0.5) * 0.045;
      const scale = Math.max(width / 3.5, height / 2.35);
      const transform = createFieldTransform(variant, scroll, seconds);
      for (let i = 0; i < vertices.length; i++) {
        transform(vertices[i], transformed);
        const depth =
          variant === "latent" ? 1 : 3.5 / Math.max(0.65, 3.5 - transformed.z);
        projected[i * 3] =
          width / 2 + (transformed.x + transformed.z * shiftX) * scale * depth;
        projected[i * 3 + 1] =
          height / 2 + (transformed.y + transformed.z * shiftY) * scale * depth;
        projected[i * 3 + 2] = depth;
        tones[i] = transformed.tone ?? 0;
      }
    }

    function draw(now: number) {
      frame = 0;
      if (disposed || document.hidden || !inView) return;
      const active = reveal || pointer.active;
      const targetX = reveal ? width / 2 : pointer.x;
      const targetY = reveal ? height / 2 : pointer.y;
      const instant = reducedMotion.matches || still;
      const desired = currentTheme.current === "light" ? 1 : 0;
      if (desired !== targetLightness) {
        fromLightness = lightness;
        targetLightness = desired;
        themeStarted = now;
      }
      const themeProgress = instant
        ? 1
        : Math.min(1, (now - themeStarted) / 520);
      const themeEase = themeProgress * themeProgress * (3 - 2 * themeProgress);
      lightness = fromLightness + (targetLightness - fromLightness) * themeEase;
      if (lightness !== paintedLightness) {
        colors = BACKGROUND_PALETTES.dark.colors.map((color, i) =>
          blendColor(color, BACKGROUND_PALETTES.light.colors[i], lightness),
        );
        coral = blendColor("#ff7a6b", "#a64332", lightness);
        latentColors = Array.from({ length: 32 }, (_, index) =>
          blendColor(colors[1], colors[0], index / 31),
        );
        paintedLightness = lightness;
      }
      const follow = instant ? 1 : 0.24;
      eased.x += (targetX - eased.x) * follow;
      eased.y += (targetY - eased.y) * follow;
      eased.amount += ((active ? 1 : 0) - eased.amount) * (instant ? 1 : 0.18);
      eased.scroll += (targetScroll - eased.scroll) * (instant ? 1 : 0.16);
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      context!.clearRect(0, 0, width, height);
      if (eased.amount < 0.002 && !active) {
        eased.amount = 0;
        return;
      }
      const phase = instant ? 0 : eased.scroll;
      projectVertices(phase, instant ? 0 : now / 1000);
      const radius = Math.min(
        preview ? 186 : 245,
        Math.max(123, Math.min(width, height) * 0.375),
      );
      context!.save();
      context!.beginPath();
      context!.arc(eased.x, eased.y, radius, 0, Math.PI * 2);
      context!.clip();
      context!.lineCap = "round";
      context!.lineJoin = "round";

      for (const stroke of strokes) {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (const index of stroke.indices) {
          minX = Math.min(minX, projected[index * 3]);
          maxX = Math.max(maxX, projected[index * 3]);
          minY = Math.min(minY, projected[index * 3 + 1]);
          maxY = Math.max(maxY, projected[index * 3 + 1]);
        }
        if (
          maxX < eased.x - radius ||
          minX > eased.x + radius ||
          maxY < eased.y - radius ||
          minY > eased.y + radius
        )
          continue;
        context!.beginPath();
        stroke.indices.forEach((index, step) =>
          step
            ? context!.lineTo(projected[index * 3], projected[index * 3 + 1])
            : context!.moveTo(projected[index * 3], projected[index * 3 + 1]),
        );
        if (stroke.closed) context!.closePath();
        context!.strokeStyle = colors[stroke.color];
        context!.lineWidth = stroke.width;
        const flow =
          stroke.flow === undefined
            ? 1
            : 0.64 + Math.cos(phase * 1.8 - stroke.flow) * 0.36;
        const gridFade =
          variant === "tensor" ? 1 - (1 - Math.cos(phase * 0.85)) * 0.3 : 1;
        context!.globalAlpha = Math.min(
          1,
          stroke.opacity * flow * gridFade * (1.3 - lightness * 0.15),
        );
        context!.stroke();
      }
      for (const dot of dots) {
        const x = projected[dot.index * 3],
          y = projected[dot.index * 3 + 1];
        if (Math.hypot(x - eased.x, y - eased.y) > radius + 4) continue;
        context!.globalAlpha = 0.75;
        context!.fillStyle =
          variant === "latent"
            ? dot.color === 0
              ? coral
              : latentColors[Math.round(tones[dot.index] * 31)]
            : colors[dot.color];
        const size = dot.size * projected[dot.index * 3 + 2];
        if (
          variant === "neural" ||
          variant === "attention" ||
          variant === "tensor"
        )
          context!.fillRect(x - size / 2, y - size / 2, size, size);
        else {
          context!.beginPath();
          context!.arc(x, y, size / 2, 0, Math.PI * 2);
          context!.fill();
        }
      }
      context!.restore();

      // destination-in alters the geometry's opacity, never the matte surface.
      // There is no ambient visibility and no colored overlay behind the cursor.
      const mask = context!.createRadialGradient(
        eased.x,
        eased.y,
        0,
        eased.x,
        eased.y,
        radius,
      );
      mask.addColorStop(0, "rgba(0,0,0,1)");
      mask.addColorStop(0.22, "rgba(0,0,0,0.98)");
      mask.addColorStop(0.55, "rgba(0,0,0,0.58)");
      mask.addColorStop(0.82, "rgba(0,0,0,0.13)");
      mask.addColorStop(1, "rgba(0,0,0,0)");
      context!.globalCompositeOperation = "destination-in";
      context!.globalAlpha = eased.amount;
      context!.fillStyle = mask;
      context!.fillRect(0, 0, width, height);
      context!.globalCompositeOperation = "source-over";
      context!.globalAlpha = 1;

      if (cursor && pointer.active && pointer.mouse && !reveal) {
        context!.fillStyle = colors[0];
        context!.beginPath();
        context!.arc(pointer.x, pointer.y, 2.5, 0, Math.PI * 2);
        context!.fill();
      }
      const moving =
        Math.abs(eased.x - targetX) + Math.abs(eased.y - targetY) > 0.15;
      const fading = Math.abs(eased.amount - (active ? 1 : 0)) > 0.002;
      const morphing =
        !instant && Math.abs(eased.scroll - targetScroll) > 0.001;
      const flowing = variant === "latent" && active && !instant;
      if (
        moving ||
        fading ||
        morphing ||
        flowing ||
        lightness !== targetLightness
      )
        schedule();
    }

    function schedule() {
      if (!frame && !disposed && !document.hidden && inView)
        frame = requestAnimationFrame(draw);
    }
    requestDraw.current = schedule;

    function resize() {
      bounds = canvas!.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      targetScroll = window.scrollY / Math.max(window.innerHeight, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      schedule();
    }

    function move(event: PointerEvent) {
      if (preview) bounds = canvas!.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      pointer.active = x >= 0 && x <= width && y >= 0 && y <= height;
      pointer.mouse =
        event.pointerType === "mouse" || event.pointerType === "pen";
      pointer.x = x;
      pointer.y = y;
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      if (idleTouch) clearTimeout(idleTouch);
      schedule();
    }

    function leave() {
      pointer.active = false;
      schedule();
    }

    function release(event: PointerEvent) {
      if (event.pointerType === "touch") idleTouch = setTimeout(leave, 900);
    }

    function visibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        pointer.active = false;
        eased.amount = 0;
      } else schedule();
    }

    function scrolled() {
      targetScroll = window.scrollY / Math.max(window.innerHeight, 1);
      if (preview) {
        bounds = canvas!.getBoundingClientRect();
        pointer.x = pointer.clientX - bounds.left;
        pointer.y = pointer.clientY - bounds.top;
        pointer.active =
          pointer.active &&
          pointer.x >= 0 &&
          pointer.x <= width &&
          pointer.y >= 0 &&
          pointer.y <= height;
      }
      if (!pointer.active && !reveal) eased.scroll = targetScroll;
      else schedule();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      if (inView) schedule();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    intersection.observe(canvas);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", leave, { passive: true });
    window.addEventListener("blur", leave);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", scrolled, { passive: true });
    document.addEventListener("mouseleave", leave);
    document.addEventListener("visibilitychange", visibility);
    reducedMotion.addEventListener("change", schedule);
    resize();

    return () => {
      disposed = true;
      requestDraw.current = null;
      cancelAnimationFrame(frame);
      if (idleTouch) clearTimeout(idleTouch);
      observer.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", leave);
      window.removeEventListener("blur", leave);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scrolled);
      document.removeEventListener("mouseleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      reducedMotion.removeEventListener("change", schedule);
    };
  }, [variant, preview, reveal, cursor]);

  return (
    <canvas
      ref={element}
      className={`portfolio-spotlight${preview ? " portfolio-spotlight--preview" : ""}`}
      data-background={variant}
      data-spotlight-radius="245"
      aria-hidden="true"
    />
  );
}
