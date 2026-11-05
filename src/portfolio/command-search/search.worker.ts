import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import metadata from "./generated/model.json";
import vectorUrl from "./generated/vectors.bin?url";
import type { WorkerRequest, WorkerResponse } from "./types";

env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
let extractor: FeatureExtractionPipeline | null = null;
let vectors: Float32Array | null = null;
let initializing: Promise<void> | null = null;
let pending: Extract<WorkerRequest, { type: "search" }> | null = null;
let latest = 0;
let running = false;
const respond = (message: WorkerResponse) => self.postMessage(message);
const cache = new Map<string, { id: string; score: number }[]>();

async function initialize() {
  if (extractor && vectors) return;
  if (initializing) return initializing;
  initializing = (async () => {
    respond({
      type: "progress",
      message: "Downloading the local search model…",
    });
    const [model, bytes] = await Promise.all([
      pipeline("feature-extraction", metadata.model, {
        revision: metadata.revision,
        dtype: "q8",
        device: "wasm",
        progress_callback: (progress) => {
          if (progress.status === "progress" && progress.file.endsWith(".onnx"))
            respond({
              type: "progress",
              message: "Downloading the local search model…",
              percent: Math.round(progress.progress),
            });
          else if (
            progress.status === "done" &&
            progress.file.endsWith(".onnx")
          )
            respond({
              type: "progress",
              message: "Preparing meaning search on this device…",
            });
        },
      }),
      fetch(vectorUrl).then((response) => {
        if (!response.ok) throw new Error("Search vectors could not load.");
        return response.arrayBuffer();
      }),
    ]);
    if (
      bytes.byteLength !==
      metadata.count * metadata.dimensions * Float32Array.BYTES_PER_ELEMENT
    ) {
      await model.dispose();
      throw new Error("Search index is incomplete.");
    }
    extractor = model;
    vectors = new Float32Array(bytes);
    respond({ type: "ready" });
  })();
  try {
    await initializing;
  } finally {
    initializing = null;
  }
}

async function drain() {
  if (running) return;
  running = true;
  try {
    await initialize();
    while (pending && extractor && vectors) {
      const request = pending;
      pending = null;
      let matches = cache.get(request.query);
      if (!matches) {
        const output = await extractor(request.query.trim().slice(0, 300), {
          pooling: "mean",
          normalize: true,
        });
        const query = output.data;
        const scores = new Map<string, number>();
        for (let row = 0; row < metadata.count; row++) {
          let score = 0;
          for (let col = 0; col < metadata.dimensions; col++)
            score +=
              Number(query[col]) * vectors[row * metadata.dimensions + col];
          const id = metadata.ids[row];
          scores.set(id, Math.max(scores.get(id) ?? -1, score));
        }
        output.dispose();
        matches = [...scores]
          .map(([id, score]) => ({ id, score }))
          .sort((a, b) => b.score - a.score);
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(request.query, matches);
      }
      if (request.id === latest)
        respond({
          type: "results",
          id: request.id,
          query: request.query,
          matches,
        });
    }
  } catch {
    pending = null;
    respond({
      type: "error",
      id: latest,
      message:
        "The local model could not load or run. Text search is still available.",
    });
  } finally {
    running = false;
  }
}

self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
  latest = data.id;
  if (data.type === "cancel") {
    pending = null;
    return;
  }
  pending = data;
  void drain();
};
