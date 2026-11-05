import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

export type SearchDocument = {
  slug: string;
  title: string;
  summary: string;
  passages: string[];
};
export type SearchRequest = { type: "search"; id: number; query: string };
export type SearchWorkerRequest =
  | { type: "init"; documents: SearchDocument[] }
  | SearchRequest;
export type SearchWorkerResponse =
  | { type: "progress"; message: string; percent?: number }
  | { type: "ready" }
  | {
      type: "results";
      id: number;
      query: string;
      matches: { slug: string; score: number }[];
    }
  | { type: "error"; message: string };

// Downloads are public model assets. Article text and queries never leave this worker.
env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

let extractor: FeatureExtractionPipeline | null = null;
let vectors: { slug: string; values: number[] }[] = [];
let initializing = false;
let initialized = false;
let searching = false;
let pending: SearchRequest | null = null;

function respond(response: SearchWorkerResponse) {
  self.postMessage(response);
}

async function initialize(documents: SearchDocument[]) {
  if (initializing) return;
  initializing = true;
  initialized = false;
  try {
    if (!extractor) {
      respond({ type: "progress", message: "Downloading the search model…" });
      extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        {
          dtype: "q8",
          device: "wasm",
          progress_callback: (progress) => {
            if (
              progress.status === "progress_total" ||
              (progress.status === "progress" &&
                progress.file.endsWith(".onnx"))
            ) {
              respond({
                type: "progress",
                message: "Downloading the search model…",
                percent: Math.round(progress.progress),
              });
            } else if (
              progress.status === "done" &&
              progress.file.endsWith(".onnx")
            ) {
              respond({
                type: "progress",
                message: "Preparing the model in your browser…",
              });
            }
          },
        },
      );
    }
    const passages = documents.flatMap((document) => [
      { slug: document.slug, text: `${document.title}. ${document.summary}` },
      ...document.passages.map((passage) => ({
        slug: document.slug,
        text: `${document.title}. ${passage}`,
      })),
    ]);
    vectors = [];
    // Small batches cap memory use and keep the worker responsive between inferences.
    for (let offset = 0; offset < passages.length; offset += 4) {
      respond({
        type: "progress",
        message: "Indexing the articles on this device…",
        percent: Math.round((offset / Math.max(passages.length, 1)) * 100),
      });
      const batch = passages.slice(offset, offset + 4);
      const output = await extractor(
        batch.map((passage) => passage.text),
        { pooling: "mean", normalize: true },
      );
      const embeddings = output.tolist() as number[][];
      batch.forEach((passage, index) =>
        vectors.push({ slug: passage.slug, values: embeddings[index] }),
      );
      output.dispose();
    }
    initialized = true;
    respond({ type: "ready" });
  } catch (error) {
    respond({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load the search model.",
    });
  } finally {
    initializing = false;
  }
  if (initialized) void searchNext();
}

async function searchNext() {
  if (searching || !initialized || !extractor) return;
  searching = true;
  try {
    while (pending) {
      const request = pending;
      pending = null;
      const output = await extractor(request.query, {
        pooling: "mean",
        normalize: true,
      });
      const queryVector = (output.tolist() as number[][])[0];
      output.dispose();
      const scores = new Map<string, number>();
      for (const entry of vectors) {
        // Normalized embeddings make the dot product cosine similarity.
        let score = 0;
        for (let i = 0; i < queryVector.length; i++)
          score += queryVector[i] * entry.values[i];
        scores.set(entry.slug, Math.max(scores.get(entry.slug) ?? -1, score));
      }
      if (!pending)
        respond({
          type: "results",
          id: request.id,
          query: request.query,
          matches: [...scores]
            .map(([slug, score]) => ({ slug, score }))
            .sort((a, b) => b.score - a.score),
        });
    }
  } catch (error) {
    respond({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to search with this model.",
    });
  } finally {
    searching = false;
  }
}

self.onmessage = (event: MessageEvent<SearchWorkerRequest>) => {
  if (event.data.type === "init") void initialize(event.data.documents);
  else {
    pending = event.data;
    void searchNext();
  }
};
