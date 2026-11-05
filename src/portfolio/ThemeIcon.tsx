import { useId } from "react";
import type { BackgroundTheme } from "./backgrounds/SpotlightBackground";

/** One persistent shape: the rays fold away while the moon's cutout slides in. */
export default function ThemeIcon({ theme }: { theme: BackgroundTheme }) {
  const mask = useId();
  return (
    <svg
      className="pf-theme-glyph"
      data-theme={theme}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <mask
          id={mask}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
        >
          <rect width="24" height="24" fill="white" stroke="none" />
          <circle
            className="pf-theme-cutout"
            cx="18"
            cy="6"
            r="7"
            fill="black"
            stroke="none"
          />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <circle
          className="pf-theme-disc"
          cx="12"
          cy="12"
          r="5"
          fill="currentColor"
          stroke="none"
        />
      </g>
      <path
        className="pf-theme-rays"
        d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
