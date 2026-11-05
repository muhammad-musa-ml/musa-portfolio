import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { loadContent, loadProfile } from "./prerender-portfolio.mjs";
import {
  buildCorpus,
  embeddingPassages,
} from "../src/portfolio/command-search/corpus.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIRECTORY = resolve(ROOT, "src/portfolio/command-search/generated");
export const MODEL = "Xenova/all-MiniLM-L6-v2";
export const REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
const hash = (text) => createHash("sha256").update(text).digest("hex");

export async function publicCorpus() {
  const content = await loadContent(resolve(ROOT, "src/portfolio/content.ts"));
  const profile = await loadProfile(
    resolve(ROOT, "src/portfolio/profile-details.ts"),
  );
  return buildCorpus(content, profile);
}

export async function createExtractor() {
  const { env, pipeline } = await import("@huggingface/transformers");
  env.cacheDir = resolve(ROOT, "node_modules/.cache/command-search");
  env.allowLocalModels = false;
  return pipeline("feature-extraction", MODEL, {
    revision: REVISION,
    dtype: "q8",
    device: "cpu",
    progress_callback: (info) => {
      if (info.status === "done") console.log(`Cached ${info.file}`);
    },
  });
}

export async function generate({ check = false } = {}) {
  const entries = await publicCorpus();
  const serialized = JSON.stringify(entries);
  const corpusHash = hash(serialized);
  if (check) {
    const stored = await readFile(resolve(DIRECTORY, "entries.json"), "utf8");
    const metadata = JSON.parse(
      await readFile(resolve(DIRECTORY, "model.json"), "utf8"),
    );
    const vectors = await readFile(resolve(DIRECTORY, "vectors.bin"));
    if (
      stored.trim() !== serialized ||
      metadata.corpusHash !== corpusHash ||
      metadata.vectorHash !== hash(vectors) ||
      metadata.model !== MODEL ||
      metadata.revision !== REVISION ||
      vectors.byteLength !== metadata.count * 384 * 4
    )
      throw new Error(
        "Command search corpus is stale. Run node scripts/build-command-search.mjs",
      );
    console.log(
      `Public search corpus current: ${entries.length} entries, ${metadata.count} vectors.`,
    );
    return;
  }
  const started = performance.now();
  const extractor = await createExtractor();
  const modelReadyMs = Math.round(performance.now() - started);
  const passages = embeddingPassages(entries);
  const values = new Float32Array(passages.length * 384);
  for (let start = 0; start < passages.length; start += 8) {
    const batch = passages.slice(start, start + 8);
    const output = await extractor(
      batch.map((p) => p.text),
      { pooling: "mean", normalize: true },
    );
    if (output.dims[1] !== 384)
      throw new Error(`Unexpected vector dimension ${output.dims}`);
    values.set(output.data, start * 384);
    output.dispose();
    if (start % 40 === 0)
      console.log(
        `Embedded ${Math.min(start + 8, passages.length)}/${passages.length} public passages`,
      );
  }
  await extractor.dispose();
  const bytes = Buffer.from(values.buffer);
  const metadata = {
    model: MODEL,
    revision: REVISION,
    dtype: "q8",
    pooling: "mean",
    normalize: true,
    dimensions: 384,
    count: passages.length,
    ids: passages.map((p) => p.id),
    corpusHash,
    vectorHash: hash(bytes),
    license: "Apache-2.0",
    source: `https://huggingface.co/${MODEL}/tree/${REVISION}`,
    upstream: "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2",
    library: "@huggingface/transformers 4.3.2",
  };
  await mkdir(DIRECTORY, { recursive: true });
  await writeFile(resolve(DIRECTORY, "entries.json"), `${serialized}\n`);
  await writeFile(resolve(DIRECTORY, "vectors.bin"), bytes);
  await writeFile(
    resolve(DIRECTORY, "model.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  console.log(
    JSON.stringify({
      entries: entries.length,
      passages: passages.length,
      vectorBytes: bytes.length,
      corpusBytes: Buffer.byteLength(serialized),
      modelReadyMs,
      totalMs: Math.round(performance.now() - started),
    }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await generate({ check: process.argv.includes("--check") });
}
