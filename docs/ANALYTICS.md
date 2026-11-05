# Portfolio analytics

The portfolio sends bounded first-party events to /api/analytics. Production storage is Upstash Redis REST. If credentials are absent or storage fails, the API explicitly returns 503; there is no production in-memory fallback or invented traffic.

## What is measured

- Known public page views and section/hash changes, with previous destination.
- Approved internal links, public project links, GitHub/LinkedIn/ORCID, résumé, email, and explicit theme/chat/search/cursor controls. Clicks have a validated action/destination and server receipt time; arbitrary DOM text and coordinates are not captured.
- Explicit public demo controls: WUMI viewer/consent, recorded defense mode, source-note steps, playground build/benchmark selectors, work filters and writing topics. Sliders record a committed public position, not continuous pointer samples. Re-selecting an unchanged tab does not create a change event.
- Marked experience/coursework, reproduction and synthetic access-history disclosures. Only a preceding summary activation records expand/collapse; automatic search-driven expansion is excluded.
- Scroll milestones at 25/50/75/100% for scrollable pages.
- Active seconds while the document is visible/focused, pausing after 60 seconds without activity.
- A coarse mobile/tablet/desktop layout class and referrer **hostname only**.
- Approximate city/region/country from Vercel's trusted request headers, only when the function runs on Vercel. IP addresses, latitude and longitude are never read into the analytics record.

A session is a random UUID in JavaScript memory. A reload creates a new session. There are no cookies, local/session storage identifiers, fingerprints, names, email addresses, chat contents, search terms, form values, or replay. A session is **not a person** or unique visitor identity. VPNs, proxies and mobile networks make network location approximate. Browser blocking, DNT/GPC, connection loss, caps and basic bot exclusions affect coverage. This is measured activity, not a complete census or guaranteed bot classification.

All query strings are removed except the five known public /playground?build= selectors. Hashes must be an exact public allowlisted anchor. Unknown paths and outbound links are not measured. Server validation independently rejects unexpected fields and targets.

## Production setup

Set these **server-only** variables in Vercel:

    UPSTASH_REDIS_REST_URL=https://YOUR-DATABASE.upstash.io
    UPSTASH_REDIS_REST_TOKEN=YOUR-SERVER-REST-TOKEN
    ANALYTICS_ADMIN_TOKEN=AT-LEAST-32-RANDOM-CHARACTERS
    ANALYTICS_SITE_ORIGIN=https://iammusa.vercel.app

The adapter also accepts KV_REST_API_URL and KV_REST_API_TOKEN. Do not use VITE_ prefixes or expose any token in the client. The admin token is independent of the Redis credential. Generate it locally with a cryptographically secure random generator and keep it out of Git, command output and browser URLs.

POST /api/analytics: same-origin JSON only; batches of 1–12 events / 12 KiB maximum. Status: 202 accepted, 204 privacy opt-out or basic bot exclusion, 400 invalid payload, 403 wrong origin, 413 too large, 429 capped, 503 unconfigured/unavailable.

GET /api/analytics-export?from=YYYY-MM-DD&to=YYYY-MM-DD: requires Authorization: Bearer ADMIN_TOKEN. No URL token or cookie auth. UTC range at most 30 days; 2,000 events per response. Follow nextCursor using the cursor query parameter until null. Export is never public or CORS-enabled.

Redis uses one atomic Lua operation per batch for deduplication/rates/append, with 30-day TTL on daily event lists. Bounds: 5,000 events/day, 600 events/minute globally, 60/minute per anonymous session, 600 events/session; stored records ≤1 KiB. These bound retained event volume; they do not guarantee a provider billing ceiling under malicious request traffic. Normal collector batching is 15 seconds and failures back off. No raw request/IP/UA logging is added by this code; infrastructure logging is controlled separately by the host.

## Client integration

Run once during production bootstrap, outside React StrictMode:

    import { startAnalytics, trackAnalyticsAction } from "./lib/analytics";
    const stop = startAnalytics({ enabled: import.meta.env.PROD });

The collector observes portfolio:navigate, popstate, hashchange and approved anchor clicks. It reads the sanitized URL after clicks to cover the playground's direct replaceState build selector. It does not patch browser history.

Call trackAnalyticsAction() in the actual handler for theme-dark, theme-light, chat-open, search-open, cursor-dot-on, or cursor-dot-off; this also covers keyboard shortcuts. Alternatively use data-analytics-action on a control, **not both** for the same action. Anchor clicks are automatic. The optional endpoint must remain same-origin.

Additional interactions call trackAnalyticsControl(id), checked against the generated controls allowlist. Writing topic choices call trackAnalyticsTopic(topic), which maps only known public categories to IDs; no search query is passed. Explicitly marked details use data-analytics-detail with a generated disclosure ID and are observed after user summary activation. These produce one click event with action control, details-open or details-close and an allowlisted target. Anchors retain their single automatic navigation/outbound event.

Regenerate the public allowlist after content/anchor/link changes:

    node server/analytics/build-catalog.mjs
    node server/analytics/build-catalog.mjs --check

## Private local dashboard

Put only the export admin token and optional endpoint into the ignored .env.local:

    ANALYTICS_ADMIN_TOKEN=THE-SAME-SERVER-ADMIN-TOKEN
    ANALYTICS_EXPORT_URL=https://iammusa.vercel.app/api/analytics-export

Run:

    node scripts/analytics-dashboard.mjs

Open http://127.0.0.1:5180. The server binds only to loopback, validates Host/Origin, sets a restrictive content policy, and keeps credentials in its server-side export proxy. It never sends the admin token to dashboard JavaScript. No live polling: refresh manually; identical reports are cached locally for 60 seconds. The dashboard includes traffic, pages, exact approved clicks, anonymous event journeys, coarse locations/devices/referrers, date range, and JSON export.

Missing configuration produces an explicit **Not connected** view and dashes, not fabricated numbers. A connected empty range shows zero measured activity. Provider errors have a separate connection state.

### Separate local receiver

    node scripts/analytics-dashboard.mjs --mode=local --port=5181

This labels the entire dashboard **Local test receiver** and persists only local test events to .analytics/local-events.ndjson. This folder must remain ignored. Nothing is seeded automatically and test events never enter live Redis. A Vite same-origin proxy can send /api/analytics to this server's /api/collect; enable the client only for that explicit local test. LOCAL_ANALYTICS_ORIGIN defaults to http://127.0.0.1:5174. The local store is a bounded file adapter, not a production backend.

## Verification

    node --test server/analytics/analytics.test.mjs server/analytics/client.test.mjs
    npx tsc -p tsconfig.app.json --noEmit
    node server/analytics/build-catalog.mjs --check

Tests cover query stripping, public allowlists, privacy signals, oversized payloads, origin/auth controls, location sanitization, explicit unconfigured state, Redis command contract, local durable deduplication and report totals/journeys. Live credentials are never used by tests. Verify an actual authenticated write/export after connecting Upstash; a passing mocked contract test cannot prove an external database is configured.
