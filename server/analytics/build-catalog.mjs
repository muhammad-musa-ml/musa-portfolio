import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  loadContent,
  loadProfile,
} from "../../scripts/prerender-portfolio.mjs";
import { buildCorpus } from "../../src/portfolio/command-search/corpus.mjs";

const root = new URL("../../", import.meta.url);
const content = await loadContent(
  fileURLToPath(new URL("src/portfolio/content.ts", root)),
);
const profile = await loadProfile(
  fileURLToPath(new URL("src/portfolio/profile-details.ts", root)),
);
const entries = buildCorpus(content, profile);
const paths = {
  "/": "Home",
  "/work": "Work",
  "/writing": "Writing",
  "/about": "About",
  "/playground": "Playground",
};
const hashes = {
  "/": ["intro", "top", "main", "work", "about", "contact"],
  "/about": [
    "story",
    "experience",
    "education",
    "publications",
    "toolkit",
    "certificates",
    "humanity",
  ],
};
for (const project of content.PROJECTS) {
  const path = `/work/${project.id}`;
  paths[path] = project.name;
  hashes[path] = [
    "project-overview",
    "project-outcome",
    ...project.sections.map((_, i) => `section-${i}`),
  ];
}
for (const article of content.ARTICLES) {
  const path = `/writing/${article.slug}`;
  paths[path] = article.title;
  hashes[path] = ["sources", ...article.sections.map((_, i) => `section-${i}`)];
}
for (const entry of entries) {
  if (!entry.href?.startsWith("/")) continue;
  const url = new URL(entry.href, "https://iammusa.vercel.app");
  if (!(url.pathname in paths) || !url.hash) continue;
  hashes[url.pathname] = [
    ...new Set([...(hashes[url.pathname] || []), url.hash.slice(1)]),
  ];
}
const outbound = {
  "https://github.com/muhammad-musa-ml": {
    id: "social:github",
    label: "GitHub profile",
  },
  "https://www.linkedin.com/in/mmusa2": {
    id: "social:linkedin",
    label: "LinkedIn",
  },
  "https://orcid.org/0009-0009-5542-8040": {
    id: "social:orcid",
    label: "ORCID",
  },
};
for (const project of content.PROJECTS) {
  project.links.forEach((link, i) => {
    try {
      const url = new URL(link.url);
      if (url.protocol !== "https:") return;
      const key = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
      outbound[key] ??= {
        id: `work:${project.id}:${i}`,
        label: `${project.name} / ${link.label}`,
      };
    } catch {
      /* Only explicit public HTTPS project links are tracked. */
    }
  });
}
const controls = {
  "wumi-view-patient": "WUMI / View as patient",
  "wumi-view-clinic": "WUMI / View as clinic",
  "wumi-view-lab": "WUMI / View as lab",
  "wumi-clinic-grant": "WUMI / Grant clinic access",
  "wumi-clinic-revoke": "WUMI / Revoke clinic access",
  "wumi-lab-grant": "WUMI / Grant lab access",
  "wumi-lab-revoke": "WUMI / Revoke lab access",
  "defense-baseline": "RAG experiment / No defense",
  "defense-prompt": "RAG experiment / Prompt defense",
  "defense-fused": "RAG experiment / Fused defense",
  "kiln-note-search": "Source demo / Search note",
  "kiln-note-interaction": "Source demo / Interaction note",
  "kiln-note-retrieval": "Source demo / Retrieval note",
  "kiln-source-show": "Source demo / Follow the source",
  "kiln-source-hide": "Source demo / Return to the note",
  "kiln-search-open": "Kiln / Open library search",
  "lookup-copy-command": "Lookup / Copy reproduction command",
  "serving-throughput": "Serving benchmark / Output throughput",
  "serving-latency": "Serving benchmark / First-token latency",
  "kaiju-open": "Kaiju Cats / Open planner",
  "kaiju-reconnect": "Kaiju Cats / Reconnect planner",
  "work-reset": "Work / Reset filters",
  "writing-topic-all": "Writing / All topics",
};
for (const [id, name] of [
  ["all", "Everything"],
  ["research", "Research"],
  ["ml", "Machine learning"],
  ["build", "Building systems"],
  ["teach", "Teaching & leading"],
])
  controls["project-filter-" + id] = "Work filter / " + name;
for (const id of ["kaiju-cats", "kiln", "lookup", "serving", "research", "wumi"])
  controls["playground-build-" + id] =
    "Playground / " +
    content.PROJECTS.find((project) => project.id === id).name;
for (const [index, size] of [10, 100, 1000, 3000, 10000].entries())
  controls["lookup-cache-" + index] =
    "Lookup benchmark / " + size.toLocaleString("en-US") + " cache entries";
for (const [index, workers] of [1, 2, 4, 8, 16].entries())
  controls["serving-workers-" + index] =
    "Serving benchmark / " + workers + " concurrent workers";
const topicControls = { "": "writing-topic-all" };
for (const topic of new Set(
  content.ARTICLES.flatMap((article) => article.topics),
)) {
  const id =
    "writing-topic-" +
    topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  if (Object.values(topicControls).includes(id))
    throw new Error("Analytics topic ID collision");
  topicControls[topic] = id;
  controls[id] = "Writing topic / " + topic;
}
const details = {
  "wumi-access-history": "WUMI / Synthetic access history",
  "lookup-reproduction": "Lookup / Run the actual service",
  "education-recognition": "About / Recognition",
};
for (const entry of profile.EXPERIENCE)
  details["experience-" + entry.id] =
    "Experience / " + entry.organization + " — " + entry.role;
profile.EDUCATION.forEach((entry, index) => {
  details["education-" + index + "-coursework"] =
    "Coursework / " + entry.school;
});
const catalog = {
  paths,
  hashes,
  builds: ["kaiju-cats", "kiln", "lookup", "serving", "research", "wumi"],
  outbound,
  controls,
  topicControls,
  details,
};
const destination = new URL("catalog.generated.mjs", import.meta.url);
// Plain ESM works in Node and Vercel's Edge bundler without JSON import attributes.
const serialized = "export default " + JSON.stringify(catalog, null, 2) + ";\n";
if (process.argv.includes("--check")) {
  if ((await readFile(destination, "utf8")) !== serialized)
    throw new Error(
      "Analytics allowlist is stale. Run node server/analytics/build-catalog.mjs",
    );
} else await writeFile(destination, serialized);
console.log(
  `Analytics allowlist: ${Object.keys(paths).length} routes, ${Object.keys(outbound).length} outbound destinations.`,
);
