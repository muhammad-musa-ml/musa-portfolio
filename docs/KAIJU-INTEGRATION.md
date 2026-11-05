# Kaiju Cats integration

The portfolio includes a project, a technical article and an embedded planner, all served by the existing `my-portfolio` Vercel project at `iammusa.vercel.app`. Visitors use the planner inside `/playground?build=kaiju-cats` or the article. MusA.I links to these internal destinations. The original engine source remains outside this public repository.

## Local preview

- Article: http://127.0.0.1:5174/writing/three-cats-fifteen-turns
- Playground: http://127.0.0.1:5174/playground?build=kaiju-cats
- Separate planner: http://127.0.0.1:8766/

Run the portfolio with `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`. The companion is in the owner's existing `Rob/hosted` workspace; run `npm start` there. Its README documents Node/Python requirements and deployment. The existing original Python app on port 8765 is unchanged.

Development uses the loopback companion. Production loads `/kaiju/` on the portfolio's own origin, and the embedded workspace calls `/api/kaiju/*`. No `VITE_KAIJU_APP_URL` setting is needed.

## Public/private boundary

The public portfolio contains prose, a game screenshot, and the iframe wrapper. It contains no recognition, simulation or optimization implementation. The companion's browser files contain presentation and editing controls; its simulator, search workers and recognizer execute on the server and are denied by the static asset allowlist. A browser must receive its interface JavaScript, but it does not need the solver source.

The iframe accepts readiness messages only from the expected origin and its own frame window. Theme changes are sent to that exact origin. The child independently validates the portfolio origin and parent window. Uploads and raw board contents are not sent to portfolio analytics.

Never copy the private engine into this repository. Never put backend credentials or deployment bypass tokens in a `VITE_` variable. The release staging directory is outside both repositories, contains no Git history or credentials, and supplies private files only to server functions. Public build output contains the planner's interface and example data only.

## Public hosting steps

1. Run the public test suite and production build in the curated release checkout. Review and stage the intended public files with Git. The staging script uses Git's tracked-file list as its source manifest, including reviewed working-copy changes.
2. Run `node scripts/stage-private-release.mjs --kaiju-root "<private hosted folder>" --output "<new staging folder outside both source folders>"`. The output must be a new directory. The script includes only the required private engine and public interface files, namespaces the APIs, and prepares Vercel routing and function configuration.
3. In the staging directory, run `npx vercel link --yes --project my-portfolio --scope musa19`, then `npx vercel deploy --prod --yes --scope musa19`. Do not create another project. The existing eight server variables stay on `my-portfolio`.
4. Verify a real embedded screenshot upload, a fresh search, cancellation, both saved replays and a downloaded plan. Verify private source URLs return 404 and no private implementation appears in static assets. Test the article, playground and MusA.I links on the production domain.

Automatic Git deployments are disabled because the public repository intentionally lacks the private engine. Always deploy the staged package; a plain frontend deployment would remove the private server functions.

## Verification record — 2026-11-05

A fresh browser upload of the original example screenshot was recognized, its B1 tile was reviewed and saved, and the available money was kept at $100. Existing commands yielded $100 in refunds, for a total plan budget of $200. A new 60-second search evaluated 6,360,064 candidates and returned a predicted score of **194,750**, costing **$200**, with **3/3 cats home**. The exported plan was independently replayed with the original engine and reproduced that score, cost and arrival order: Red turn 13, Green turn 15, Blue turn 15. The replay slider reached turn 15 and displayed the matching final powers.

This new QA run is separate from the article's historical saved result of 213,625. Neither is represented as an observed Roblox result or a proven optimum. Recognition on other camera angles still needs review and potentially manual alignment.

The companion automated suite covers the original rules, saved replay parity, actual streamed search, cancellation cleanup, concurrent-request limits, malformed input and source denial. Portfolio tests, production build and semantic-search evaluation also cover the new public content. Browser verification distinguishes the embedded view/theme handshake from the standalone upload/search/export workflow.
