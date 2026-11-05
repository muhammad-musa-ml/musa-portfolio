import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import ts from "typescript";
import { createExtractor } from "../../../scripts/build-command-search.mjs";

export const CASES = [
  { query: "KaijuGo", expected: ["/work/kaiju-cats", "/playground?build=kaiju-cats"], mode: "lexical", rank: 2 },
  { query: "turn a game screenshot into a plan", expected: ["/work/kaiju-cats", "/writing/three-cats-fifteen-turns", "/playground?build=kaiju-cats"], rank: 3 },
  { query: "how are you", expected: ["/about"], mode: "lexical", rank: 1 },
  { query: "who are you", expected: ["/about"], mode: "lexical", rank: 1 },
  {
    query: "I want to hire you",
    expected: ["/about#experience", "/about"],
    mode: "lexical",
    rank: 2,
  },
  {
    query: "what are your skills",
    expected: ["/about#toolkit"],
    mode: "lexical",
    rank: 1,
  },
  {
    query: "Postgres",
    expected: ["/about#toolkit-3", "/work/wumi"],
    mode: "lexical",
    rank: 4,
  },
  {
    query: "K8s",
    expected: ["/about#toolkit-3", "/work/lookup"],
    mode: "lexical",
    rank: 3,
  },
  { query: "Pythno", expected: ["/about#toolkit-0"], mode: "lexical", rank: 2 },
  {
    query: "PyTorch",
    expected: ["/about#toolkit-1"],
    mode: "lexical",
    rank: 2,
  },
  { query: "C++", expected: ["/about#toolkit-0"], mode: "lexical", rank: 1 },
  {
    query: "where did you study",
    expected: ["/about#education"],
    mode: "lexical",
    rank: 1,
  },
  { query: "healthcare permissions", expected: ["/work/wumi"], rank: 3 },
  {
    query: "hide sensitive records from someone who should not see them",
    expected: ["/work/wumi"],
    rank: 3,
  },
  {
    query:
      "how much useful evidence gets thrown away when blocking malicious prompts",
    expected: ["/work/research", "/writing/when-a-safety-score-hides-the-cost"],
    rank: 3,
  },
  {
    query: "how did you stop agents from endlessly rewriting a document",
    expected: [
      "/work/gauntlet",
      "/writing/dynamic-workflows-need-a-stopping-rule",
    ],
    rank: 3,
  },
  {
    query: "find information I collected from scattered internet bookmarks",
    expected: ["/work/kiln", "/writing/a-bookmark-is-not-a-research-system"],
    rank: 3,
  },
  {
    query: "making a model reply faster on limited graphics memory",
    expected: ["/work/serving"],
    rank: 3,
  },
  {
    query: "keeping replicated answers consistent while machines fail",
    expected: ["/work/lookup"],
    rank: 3,
  },
  {
    query: "turning spoken requests into offline computer actions",
    expected: ["/work/voice-agent"],
    rank: 3,
  },
  {
    query: "finding outlines of houses in images taken from space",
    expected: ["/work/satellite"],
    rank: 3,
  },
  {
    query: "recognizing text in a language without much labeled training data",
    expected: ["/work/shahmukhi"],
    rank: 3,
  },
  {
    query: "code contributions to other people's tools",
    expected: [
      "/work/open-source",
      "/writing/only-send-the-schema-a-tool-needs",
    ],
    rank: 3,
  },
  {
    query: "mentoring students learning to program",
    expected: [
      "/about#experience-cs220",
      "/about#experience-cs320",
      "/about#experience-cs331",
    ],
    rank: 3,
  },
  {
    query: "systems that keep working when a server goes down",
    expected: ["/work/lookup"],
    rank: 3,
  },
  {
    query: "can you work with databases",
    expected: ["/about#toolkit-3", "/work/wumi", "/work/lookup"],
    rank: 3,
  },
  {
    query: "what makes you a good hire",
    expected: ["/about#experience", "/about"],
    rank: 2,
  },
  {
    query: "tools with less token overhead",
    expected: [
      "/work/open-source",
      "/writing/only-send-the-schema-a-tool-needs",
    ],
    rank: 3,
  },
  {
    query: "helping underrepresented languages",
    expected: ["/work/shahmukhi"],
    rank: 3,
  },
];

export async function loadRanking() {
  const entries = await readFile(
    new URL("./generated/entries.json", import.meta.url),
    "utf8",
  );
  const source = (
    await readFile(new URL("./rank.ts", import.meta.url), "utf8")
  ).replace(
    /import entries from ["']\.\/generated\/entries\.json["'];/,
    `const entries = ${entries.trim()};`,
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}

export function scoreVectors(query, vectors, metadata) {
  const scores = new Map();
  for (let row = 0; row < metadata.count; row++) {
    let score = 0;
    for (let col = 0; col < metadata.dimensions; col++)
      score += query[col] * vectors[row * metadata.dimensions + col];
    const id = metadata.ids[row];
    scores.set(id, Math.max(scores.get(id) ?? -1, score));
  }
  return [...scores]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

export async function evaluate() {
  const { rankSearch, SEARCH_ENTRIES } = await loadRanking();
  const metadata = JSON.parse(
    await readFile(new URL("./generated/model.json", import.meta.url), "utf8"),
  );
  const data = await readFile(
    new URL("./generated/vectors.bin", import.meta.url),
  );
  const vectors = new Float32Array(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  );
  const modelStart = performance.now();
  const extractor = await createExtractor();
  const modelReadyMs = performance.now() - modelStart;
  const results = [];
  for (const scenario of CASES) {
    const started = performance.now();
    let matches = [];
    if (scenario.mode !== "lexical") {
      const output = await extractor(scenario.query, {
        pooling: "mean",
        normalize: true,
      });
      matches = scoreVectors(output.data, vectors, metadata);
      output.dispose();
    }
    const ranking = rankSearch(scenario.query, matches);
    const found =
      ranking.findIndex((entry) =>
        scenario.expected.some((prefix) => entry.href.startsWith(prefix)),
      ) + 1;
    const semanticRanking = matches.map((match) =>
      SEARCH_ENTRIES.find((entry) => entry.id === match.id),
    );
    const semanticRank = matches.length
      ? semanticRanking.findIndex((entry) =>
          scenario.expected.some((prefix) => entry.href.startsWith(prefix)),
        ) + 1
      : null;
    const result = {
      query: scenario.query,
      passed: found > 0 && found <= scenario.rank,
      rank: found,
      semanticRank,
      ms: Math.round(performance.now() - started),
      results: ranking
        .slice(0, 5)
        .map((e) => ({
          label: e.label,
          href: e.href,
          score: Number(e.score.toFixed(2)),
        })),
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  await extractor.dispose();
  const rankSource = (await readFile(new URL("./rank.ts", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
  const report = {
    model: metadata.model,
    revision: metadata.revision,
    corpusHash: metadata.corpusHash,
    rankHash: createHash("sha256").update(rankSource).digest("hex"),
    casesHash: createHash("sha256").update(JSON.stringify(CASES)).digest("hex"),
    backend: "onnxruntime-node CPU q8 (browser WASM timings are separate)",
    modelReadyMs: Math.round(modelReadyMs),
    passed: results.filter((r) => r.passed).length,
    total: results.length,
    results,
  };
  await writeFile(
    new URL("./generated/evaluation.json", import.meta.url),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `Passed ${report.passed}/${report.total}; cached model ready ${report.modelReadyMs}ms`,
  );
  if (report.passed !== report.total) process.exitCode = 1;
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await evaluate();
