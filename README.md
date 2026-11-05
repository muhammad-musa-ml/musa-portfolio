# Muhammad Musa's portfolio

The approved Interference design at [iammusa.vercel.app](https://iammusa.vercel.app): work, technical writing, interactive project explanations, experience and MusA.I. Historical design studies remain in the development workspace; production has no study navigation or alternate-design routes.

## Run locally

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

Vite runs the same streaming chat handler as production. Copy `.env.example` settings into the ignored `.env.local` to connect services. Never put credentials in variables prefixed `VITE_`.

## MusA.I

The browser sends a bounded conversation to `/api/chat`. The server supplies the instructions and retrieves evidence from the curated public portfolio: all 17 projects, six articles, experience, education, skills, credentials and publications. Answers stream as they arrive, with clickable source links. The client supports Stop, Retry and long conversations; raw model reasoning is never displayed.

The default model is Groq's `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as its secondary model. Add `GROQ_API_KEY` in Vercel's project environment variables and redeploy. An independent Gemini fallback is opt-in; verify its account is on the intended free tier before enabling it. Free services have changing quotas and cannot guarantee uninterrupted generation.

If no provider can answer, MusA.I returns clearly labeled public portfolio notes and links immediately. If the API itself is unreachable, the browser can retrieve public notes locally. It does not fabricate an answer, send requests to an anonymous relay or replace an interrupted partial answer with another model's text.

Implementation, provider references, request limits and tests: [MusA.I server guide](server/musai/README.md).

## Private analytics dashboard

```sh
npm run analytics
```

Open [the live-data dashboard](http://127.0.0.1:5180). It runs only on your computer. It shows page visits, approved links and controls clicked, section navigation, active time, scroll depth, approximate location and anonymous visit journeys. It does not collect identities, chat messages, search terms, raw IP addresses or session recordings. Reloads start a new anonymous session; session counts are not unique people.

Production collection requires a free Upstash Redis database and a private export token. Put the same `ANALYTICS_ADMIN_TOKEN` in Vercel and `.env.local`; Redis credentials belong only on the server. The dashboard explicitly shows **Not connected** until configuration is complete. See [setup and operation](docs/ANALYTICS.md).

For isolated browser testing, enable the three local-test flags in `.env.example`, run `npm run analytics:local`, and open [the local test dashboard](http://127.0.0.1:5181). Its events are stored in the ignored `.analytics/` directory and never enter production reports.

## Content and checks

Public content lives in `src/portfolio/content.ts` and `src/portfolio/profile-details.ts`. After changing it:

```sh
npm run sync:public-knowledge
npm run search:build
npm run musai:build
node server/analytics/build-catalog.mjs
npm test
npm run build
```

The build type-checks, verifies public knowledge/search/analytics indexes, prerenders public routes and checks production assets. The original `sync:knowledge` command belongs to historical studies; it is not the production data pipeline.

## Deployment

The public GitHub repository contains the portfolio and its integration code. Kaiju's simulator, optimizer and recognizer remain private. Production uses a staged package that combines the reviewed public checkout with the private engine, then deploys everything to the existing `my-portfolio` Vercel project. Kaiju runs inside the portfolio at `/playground?build=kaiju-cats`, with its workspace at `/kaiju/` and server functions under `/api/kaiju/`.

Automatic Git deployments are disabled in `vercel.json`: a public-repository-only build cannot include the private engine. Follow [the staging instructions](docs/KAIJU-INTEGRATION.md) for releases. Historical design studies remain in the development workspace. Never publish `.env.local`, `.analytics/`, private engine files, private snapshots, transcripts or credentials. The local dashboard files are tooling; they are not part of the public Vite output.
