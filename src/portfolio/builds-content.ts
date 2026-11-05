// Curated from the public repositories on November 4, 2026. These are recorded
// measurements, not generated estimates or benchmarks executed in the browser.
export const LOOKUP_SOURCE =
  "https://github.com/muhammad-musa-ml/replicated-lookup-service/blob/main/bench/results/summary.md";
export const SERVING_SOURCE =
  "https://github.com/muhammad-musa-ml/vllm-serving-bench/blob/main/results/summary.md";

export const CACHE_RESULTS = [
  { size: 10, server: 0.1861, lru: 0.1896, fifo: 0.1618 },
  { size: 100, server: 0.4575, lru: 0.4576, fifo: 0.4089 },
  { size: 1000, server: 0.672, lru: 0.6716, fifo: 0.6341 },
  { size: 3000, server: 0.7447, lru: 0.7449, fifo: 0.7211 },
  { size: 10000, server: 0.7713, lru: 0.7713, fifo: 0.7713 },
];

export const SERVING_RESULTS = [
  { workers: 1, fp16: [55.1, 64], awq: [124.5, 69], gptq: [123.7, 68] },
  { workers: 2, fp16: [106.7, 94], awq: [230.9, 116], gptq: [235.3, 101] },
  { workers: 4, fp16: [202.2, 207], awq: [413.8, 202], gptq: [415.5, 205] },
  { workers: 8, fp16: [367.9, 308], awq: [700, 347], gptq: [706.8, 348] },
  { workers: 16, fp16: [626.1, 528], awq: [1048.5, 627], gptq: [1060.5, 605] },
];

export type BuildId =
  | "kiln"
  | "lookup"
  | "serving"
  | "research"
  | "wumi";
export const BUILDS: {
  id: BuildId;
  name: string;
  kind: string;
  heading: string;
  description: string;
  mode: string;
}[] = [
  {
    id: "kiln",
    name: "Kiln",
    kind: "Knowledge systems",
    heading: "Follow an idea into the library.",
    description:
      "The research library I use to turn saved sources into guides, files and things worth building.",
    mode: "Live application",
  },
  {
    id: "lookup",
    name: "Replicated lookup",
    kind: "Distributed systems",
    heading: "Read what the cache actually did.",
    description:
      "I built the same lookup contract in Python, Java and Go, then tested caching, failover and compatibility. Explore the measurements from the repository.",
    mode: "Recorded results",
  },
  {
    id: "serving",
    name: "Small-GPU serving",
    kind: "ML systems",
    heading: "More tokens. A different wait.",
    description:
      "I measured three precision variants on one laptop GPU. Change the concurrency and compare throughput with the time it takes to get the first token.",
    mode: "Recorded results",
  },
  {
    id: "research",
    name: "RAG attack & defense",
    kind: "Language-model security",
    heading: "Look past the zero.",
    description:
      "Inspect the recorded attack results from my research, then follow the utility analysis to see what the defense removed from clean requests.",
    mode: "Recorded experiment",
  },
  {
    id: "wumi",
    name: "WUMI Health",
    kind: "Healthcare software",
    heading: "The patient controls the boundary.",
    description:
      "An interactive explanation of the consent model I built into WUMI. The product connects records and clinical workflows; this small interface uses synthetic information.",
    mode: "Product walkthrough",
  },

];
