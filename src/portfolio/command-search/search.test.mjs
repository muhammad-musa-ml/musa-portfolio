import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import ts from "typescript";
import { loadRanking, CASES } from "./evaluate.mjs";
import { publicCorpus } from "../../../scripts/build-command-search.mjs";

const { SEARCH_ENTRIES, rankSearch } = await loadRanking();

test("common questions, skill abbreviations and typos reach useful destinations without a model", () => {
  for (const scenario of CASES.filter((s) => s.mode === "lexical")) {
    assert.ok(
      rankSearch(scenario.query)
        .slice(0, scenario.rank)
        .some((entry) =>
          scenario.expected.some((href) => entry.href.startsWith(href)),
        ),
      scenario.query,
    );
  }
  assert.equal(rankSearch("gibberishzzzxxyy").length, 0);
  assert.equal(rankSearch("C")[0].label, "C");
  assert.equal(rankSearch("R")[0].label, "R");
  assert.equal(rankSearch("  WHO ARE YOU?  ")[0].href, "/about");
});

test("exact project/article titles stay navigable and deep results do not drown out other work", () => {
  for (const entry of SEARCH_ENTRIES.filter((e) =>
    ["project", "article"].includes(e.kind),
  )) {
    assert.equal(rankSearch(entry.label)[0].id, entry.id, entry.label);
  }
  const results = rankSearch("Python machine learning security");
  assert.ok(results.length <= 15 && results.length > 3);
  assert.equal(new Set(results.map((e) => e.href)).size, results.length);
  for (const parent of new Set(results.map((e) => e.parent).filter(Boolean)))
    assert.ok(results.filter((e) => e.parent === parent).length <= 2);
  assert.ok(results.some((e) => e.group === "Skills"));
  assert.ok(results.some((e) => e.group === "Projects"));
});

test("public corpus is current, complete, navigable, and contains no design lab or private snapshot", async () => {
  assert.deepEqual(SEARCH_ENTRIES, await publicCorpus());
  const ids = SEARCH_ENTRIES.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const required of [
    "home",
    "all-work",
    "writing",
    "playground",
    "about",
    "project-wumi",
    "project-voice-agent",
    "project-uav",
    "experience-cs320",
    "education-0",
    "toolkit-0",
    "credential-claude-101",
    "publication-0",
  ])
    assert.ok(ids.includes(required), required);
  assert.ok(SEARCH_ENTRIES.some((e) => e.href.includes("#project-outcome")));
  assert.ok(SEARCH_ENTRIES.some((e) => e.href.includes("#section-")));
  assert.ok(SEARCH_ENTRIES.some((e) => e.href.includes("#sources")));
  for (const entry of SEARCH_ENTRIES) {
    assert.ok(entry.detail && entry.snippet && entry.keywords, entry.id);
    assert.doesNotMatch(
      entry.href,
      /samples|backgrounds|motion-studio|journeys|experiments|pathfinding|learning/,
    );
  }
  const [bytes, metadata] = await Promise.all([
    readFile(new URL("./generated/vectors.bin", import.meta.url)),
    readFile(new URL("./generated/model.json", import.meta.url), "utf8").then(
      JSON.parse,
    ),
  ]);
  assert.equal(bytes.byteLength, metadata.count * 384 * 4);
  assert.equal(
    metadata.vectorHash,
    createHash("sha256").update(bytes).digest("hex"),
  );
  assert.equal(
    metadata.corpusHash,
    createHash("sha256").update(JSON.stringify(SEARCH_ENTRIES)).digest("hex"),
  );
  const vectors = new Float32Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  for (let row = 0; row < metadata.count; row++) {
    const norm = Math.sqrt(
      vectors
        .slice(row * 384, (row + 1) * 384)
        .reduce((sum, value) => sum + value * value, 0),
    );
    assert.ok(
      Math.abs(norm - 1) < 0.0001,
      "Expected normalized learned embeddings",
    );
    assert.ok(ids.includes(metadata.ids[row]));
  }
});

test("semantic matches can retrieve a relevant source even without shared wording, while exact intents win", () => {
  const meaningful = rankSearch("outlines of houses viewed from orbit", [
    { id: "project-satellite", score: 0.79 },
  ]);
  assert.ok(
    meaningful.slice(0, 2).some((e) => e.href.startsWith("/work/satellite")),
  );
  assert.equal(
    rankSearch("how are you", [{ id: "project-research", score: 0.9 }])[0].href,
    "/about",
  );
  assert.ok(
    rankSearch("unknownzzxy", [{ id: "project-wumi", score: 0.1 }]).length ===
      0,
  );
  assert.ok(
    rankSearch("unknownzzxy", [{ id: "not-a-public-entry", score: 1 }])
      .length === 0,
  );
  const failover = rankSearch("Failover has a budget")[0];
  assert.match(failover.snippet, /replica|cache|deadline/i);
  assert.notEqual(failover.snippet, "Failover has a budget.");
  const provenance = rankSearch("Keep the trail")[0];
  assert.match(provenance.snippet, /source|revisions|history/i);
});

test("the recorded learned-model evaluation matches the public corpus and checks paraphrases", async () => {
  const report = JSON.parse(
    await readFile(
      new URL("./generated/evaluation.json", import.meta.url),
      "utf8",
    ),
  );
  const model = JSON.parse(
    await readFile(new URL("./generated/model.json", import.meta.url), "utf8"),
  );
  assert.equal(
    report.corpusHash,
    model.corpusHash,
    "Re-run evaluate.mjs after rebuilding the corpus",
  );
  assert.equal(report.revision, model.revision);
  assert.equal(
    report.rankHash,
    createHash("sha256")
      .update((await readFile(new URL("./rank.ts", import.meta.url), "utf8")).replace(/\r\n/g, "\n"))
      .digest("hex"),
    "Re-run evaluate.mjs after changing ranking",
  );
  assert.equal(
    report.casesHash,
    createHash("sha256").update(JSON.stringify(CASES)).digest("hex"),
    "Re-run evaluate.mjs after adding relevance cases",
  );
  assert.equal(report.passed, report.total);
  assert.equal(report.total, CASES.length);
  const paraphrases = report.results.filter(
    (result) => result.semanticRank !== null,
  );
  assert.ok(paraphrases.length >= 10);
  assert.ok(
    paraphrases.filter((result) => result.semanticRank <= 3).length >= 10,
    "The learned vectors themselves must retrieve useful evidence",
  );
});

test("client remains lazy, debounces typing, retains its worker, and ignores stale/cancelled results", async () => {
  const instances = [];
  class FakeWorker {
    constructor() {
      this.sent = [];
      instances.push(this);
    }
    postMessage(value) {
      this.sent.push(value);
    }
    terminate() {
      this.terminated = true;
    }
    receive(data) {
      this.onmessage({ data });
    }
  }
  const priorWorker = globalThis.Worker;
  globalThis.Worker = FakeWorker;
  try {
    const source = (
      await readFile(new URL("./client.ts", import.meta.url), "utf8")
    ).replaceAll("import.meta.url", JSON.stringify(import.meta.url));
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    });
    const { searchMeaning, retryMeaningSearch } = await import(
      `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
    );
    const initial = [];
    let close = searchMeaning("", (value) => initial.push(value));
    close();
    close = searchMeaning("py", (value) => initial.push(value));
    await delay(270);
    assert.equal(
      instances.length,
      0,
      "Opening or typing two letters must not fetch a model",
    );
    close();
    const old = [],
      latest = [];
    const closeOld = searchMeaning("health", (value) => old.push(value));
    const closeLatest = searchMeaning("  hospital records  ", (value) =>
      latest.push(value),
    );
    closeOld(); // An older effect cleanup must not cancel the new query.
    await delay(270);
    assert.equal(instances.length, 1);
    const worker = instances[0];
    const first = worker.sent.find((e) => e.type === "search");
    assert.equal(first.query, "  hospital records  ");
    worker.receive({
      type: "results",
      id: first.id - 1,
      query: "health",
      matches: [{ id: "project-wumi", score: 0.8 }],
    });
    assert.equal(latest.at(-1).status, "loading");
    worker.receive({ type: "ready" });
    worker.receive({
      type: "results",
      id: first.id,
      query: first.query,
      matches: [{ id: "project-wumi", score: 0.8 }],
    });
    assert.equal(latest.at(-1).status, "ready");
    assert.equal(latest.at(-1).query, first.query);
    closeLatest();
    const count = latest.length;
    worker.receive({
      type: "results",
      id: first.id,
      query: first.query,
      matches: [],
    });
    assert.equal(latest.length, count);
    assert.equal(
      worker.terminated,
      undefined,
      "Closing should keep a loaded worker warm",
    );
    const reopened = [];
    const cleanup = searchMeaning("new skills", (value) =>
      reopened.push(value),
    );
    await delay(270);
    assert.equal(instances.length, 1);
    assert.equal(reopened[0].status, "searching");
    const second = worker.sent.filter((e) => e.type === "search").at(-1);
    worker.receive({
      type: "error",
      id: first.id,
      message: "Old inference failed",
    });
    assert.equal(reopened.at(-1).status, "searching");
    worker.receive({
      type: "error",
      id: second.id,
      message: "Could not load model",
    });
    assert.equal(reopened.at(-1).status, "error");
    assert.ok(
      rankSearch("Python").length,
      "Lexical search stays independent of model failure",
    );
    cleanup();
    retryMeaningSearch();
    assert.equal(worker.terminated, true);
  } finally {
    globalThis.Worker = priorWorker;
  }
});
