# Kaiju Cats integration

The portfolio adds a project, a technical article and an embedded planner. The original tool and the companion service remain outside this public repository.

## Local preview

- Article: http://127.0.0.1:5174/writing/three-cats-fifteen-turns
- Playground: http://127.0.0.1:5174/playground?build=kaiju-cats
- Separate planner: http://127.0.0.1:8766/

Run the portfolio with `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`. The companion is in the owner's existing `Rob/hosted` workspace; run `npm start` there. Its README documents Node/Python requirements and deployment. The existing original Python app on port 8765 is unchanged.

Development defaults to the loopback companion. Production requires the real HTTPS service root in `VITE_KAIJU_APP_URL` at build time. An unconfigured production build displays the example and connection status instead of linking visitors to their own localhost.

## Public/private boundary

The public portfolio contains prose, a game screenshot, and the iframe wrapper. It contains no recognition, simulation or optimization implementation. The companion's browser files contain presentation and editing controls; its simulator, search workers and recognizer execute on the server and are denied by the static asset allowlist. A browser must receive its interface JavaScript, but it does not need the solver source.

The iframe accepts readiness messages only from the configured service origin and its own frame window. Theme changes are sent to that exact origin. The child independently validates the portfolio origin and parent window. The origin-only cross-origin referrer allows this handshake without sharing the article path. Uploads and raw board contents are not sent to portfolio analytics.

Never copy the `Rob` workspace into this repository. Never put backend credentials or deployment bypass tokens in a `VITE_` variable. A private companion repository, or a direct deployment from its local folder, can host a publicly usable app without publishing its server source.

## Public hosting steps

1. Sign in to the owner's Vercel account. Create a separate project from the private companion folder/repository, keeping its repository private. Use its included configuration: static output `public`, Node search/replay APIs and Python recognition API. No paid upgrade is required by the implementation; check the account's actual limits before deploying.
2. Verify the deployed service with an actual screenshot, bounded search, cancellation, replay and export. Verify private source URLs return 404. The local tests do not establish that Vercel packaged worker files or Python dependencies correctly.
3. Set `VITE_KAIJU_APP_URL` to the verified companion HTTPS root in the portfolio's Production environment and rebuild the curated portfolio release.
4. Check the live article and playground, both themes, embedded upload and downloads. A new host/domain also needs the companion's frame-ancestor and parent-origin allowlists updated.

At implementation time there is no deployed companion URL and the Vercel account is not authenticated in the available browser. Therefore the integration is locally usable and prepared for deployment, but is not yet available to public visitors. This account configuration is the remaining deployment dependency.

## Verification record — 2026-11-05

A fresh browser upload of the original example screenshot was recognized, its B1 tile was reviewed and saved, and the available money was kept at $100. Existing commands yielded $100 in refunds, for a total plan budget of $200. A new 60-second search evaluated 6,360,064 candidates and returned a predicted score of **194,750**, costing **$200**, with **3/3 cats home**. The exported plan was independently replayed with the original engine and reproduced that score, cost and arrival order: Red turn 13, Green turn 15, Blue turn 15. The replay slider reached turn 15 and displayed the matching final powers.

This new QA run is separate from the article's historical saved result of 213,625. Neither is represented as an observed Roblox result or a proven optimum. Recognition on other camera angles still needs review and potentially manual alignment.

The companion automated suite covers the original rules, saved replay parity, actual streamed search, cancellation cleanup, concurrent-request limits, malformed input and source denial. Portfolio tests, production build and semantic-search evaluation also cover the new public content. Browser verification distinguishes the embedded view/theme handshake from the standalone upload/search/export workflow.
