# Deploy the private planner inside the portfolio

The public Git repository contains the portfolio and the assembly script. The private Kaiju engine remains in its existing workspace. A fresh, local release directory combines them only for deployment to the existing **my-portfolio** Vercel project. Visitors use the embedded planner and `/api/kaiju/*` on `iammusa.vercel.app`; no separate Vercel project is needed.

Before assembly, review the public changes and add intended new/deleted files to the Git index. The script uses the index as its source-file manifest but copies current working-file contents. It refuses untracked source files so a new required module cannot silently be omitted. Never git-add the private engine or credentials.

From the curated release checkout:

```powershell
node --test scripts/stage-private-release.test.mjs
node scripts/stage-private-release.mjs --kaiju-root "<absolute private hosted folder>" --output "<absolute new staging folder>"
```

Choose a **new directory name** each time. Its parent directory must already exist. The output must be outside both source directories; existing outputs, symlinks and junctions are rejected. Nothing is deleted or overwritten by the staging command.

Then, from that assembled output directory:

```powershell
npx vercel link --yes --project my-portfolio --scope musa19
npx vercel deploy --prod --yes --scope musa19
```

The saved Production environment variables remain on the same Vercel project. The staging script copies no `.env` files, Vercel account state, tokens or local dashboards' recorded events. It copies only the planner's explicit public-asset list, API adapters, private runtime files and Python requirements. The original model/search/recognizer hashes must match their provenance record.

Assembly sets Node 22, Fluid Compute, namespaced API function settings and frame security headers. Browser API calls become `/api/kaiju/*`; the planner's static interface lives under `/kaiju/`. A post-build guard checks that `dist` contains only the ten approved planner assets and no private engine or API source.

Automatic Git deployments are disabled because a public-repository-only build does not contain the private runtime. Future releases must use this assembly command. Keep the private workspace backed up privately; the public repository alone cannot reproduce the private engine.

After deployment, verify the portfolio's embedded screenshot upload, a fresh bounded search, cancellation, exported plan and replay. Confirm `/private/app/model.mjs`, `/private/search-worker.mjs`, `/private/recognize.py` and other private source URLs return 404. Confirm MusA.I and analytics separately on the production domain.
