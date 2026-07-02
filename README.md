# musa.dev — a living portfolio

A 3D, scroll-driven portfolio for **Muhammad Musa** (CS grad researcher, UW–Madison)
with an honesty-first **AI twin** that answers questions about his work.

**Concept:** *human warmth × machine precision* — a neural constellation rendered in
Three.js, warm Fraunces serif against terminal mono, ink/amber/teal palette. The
visual argument is the thesis: AI for humanity.

## Features

- **Neural constellation background** — 2,400 GPU-shaded particles with connective
  links and travelling signal pulses; reacts to mouse and scroll (camera dives
  deeper as you read the story).
- **The Journey** — scroll-drawn timeline from Lahore to Madison, alternating
  milestone cards against ghost-outline years.
- **Experience / Projects** — expandable role cards and 3D-tilt project cards with
  a cursor-tracking glow.
- **AI for Humanity** — themes and receipts, pulled from real work (WUMI Health,
  LLM safety research, Shahmukhi NLP, ACM CSET '23).
- **The AI twin** (press `/` anywhere) — a chat stand-in grounded in
  `content/knowledge-base.md`. Its system prompt enforces an honesty policy: it
  answers what Musa has done with specifics, admits plainly what he hasn't, and
  only bridges via genuinely transferable experience.
- Custom cursor, film grain, smooth scroll (Lenis), reduced-motion support.

## Stack

Vite · React 18 · TypeScript · Three.js (@react-three/fiber) · motion · Lenis —
plus one Vercel edge function (`api/chat.ts`) for the AI.

## AI architecture ($0)

```
browser ──▶ /api/chat (Vercel edge)
               │  GROQ_API_KEY set? ──▶ Groq llama-3.3-70b (free tier, streams)
               │  no key?           ──▶ Pollinations.AI keyless relay
               ▼
        knowledge-base.md baked into the system prompt at build time
```

- **Zero-config default:** Pollinations.AI's anonymous tier (no key, ~1 req/15s).
- **Recommended upgrade (still free):** create a key at https://console.groq.com,
  add `GROQ_API_KEY` in Vercel → Project → Settings → Environment Variables,
  redeploy. You get llama-3.3-70b at 1,000 req/day with sub-second streaming.
- The endpoint refuses requests that don't carry the site's own system prompt,
  so it can't be farmed as a generic LLM relay.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 — /api/chat is emulated by a dev middleware
npm run build      # type-check + production build to dist/
```

## Deploy (free)

1. Push this repo to GitHub (already done if you're reading this there).
2. Sign in at https://vercel.com with GitHub → **Add New → Project** → import
   this repo → **Deploy**. Framework auto-detects as Vite; no settings needed.
3. Optional: add `GROQ_API_KEY` env var for the better free model.
4. Your site is live at `https://<project>.vercel.app` — put it on the résumé.

## Updating content

- `content/profile.json` — everything the site renders (journey, roles, projects,
  skills, humanity section).
- `content/knowledge-base.md` — everything the AI twin knows.
- `public/Muhammad-Musa-Resume.pdf` — the downloadable résumé.

Edit, commit, push — Vercel redeploys automatically.
