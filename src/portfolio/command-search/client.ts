import type { MeaningUpdate, WorkerRequest, WorkerResponse } from "./types";

let worker: Worker | null = null;
let current: {
  id: number;
  query: string;
  callback: (update: MeaningUpdate) => void;
} | null = null;
let sequence = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let ready = false;
let failure = "";
let progress = {
  message: "Loading local meaning search…",
  percent: undefined as number | undefined,
};

function emit(
  status: MeaningUpdate["status"],
  extra: Partial<MeaningUpdate> = {},
) {
  if (current)
    current.callback({ status, query: current.query, matches: [], ...extra });
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./search.worker.ts", import.meta.url), {
    type: "module",
    name: "portfolio-command-search",
  });
  worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    if (data.type === "progress") {
      progress = { message: data.message, percent: data.percent };
      emit("loading", progress);
    } else if (data.type === "ready") {
      ready = true;
      emit("searching", { message: "Searching on this device…" });
    } else if (data.type === "results") {
      if (current?.id === data.id && current.query === data.query)
        emit("ready", { matches: data.matches });
    } else if (data.type === "error") {
      if (data.id !== undefined && data.id !== current?.id) return;
      failure = data.message;
      emit("error", { message: failure });
    }
  };
  worker.onerror = () => {
    failure = "Meaning search could not start. Text search is still available.";
    emit("error", { message: failure });
    worker?.terminate();
    worker = null;
    ready = false;
  };
  return worker;
}

/** The callback can fire synchronously. Results never answer questions: they are
 * ranked links to public source text. No query is sent to a remote endpoint. */
export function searchMeaning(
  query: string,
  callback: (update: MeaningUpdate) => void,
): () => void {
  if (timer) clearTimeout(timer);
  timer = null;
  const id = ++sequence;
  current = { id, query, callback };
  // Cancel queued inference immediately; debounce only the new request.
  worker?.postMessage({ type: "cancel", id } satisfies WorkerRequest);
  if (current.query.trim().length < 3 || !/[\p{L}\p{N}]/u.test(current.query)) {
    emit("idle");
  } else if (failure) {
    emit("error", { message: failure });
  } else {
    emit(
      ready ? "searching" : "loading",
      ready ? { message: "Searching on this device…" } : progress,
    );
    timer = setTimeout(() => {
      timer = null;
      if (current?.id !== id) return;
      try {
        ensureWorker().postMessage({
          type: "search",
          id,
          query: current.query,
        } satisfies WorkerRequest);
      } catch {
        failure =
          "Meaning search is unavailable in this browser. Text search still works.";
        emit("error", { message: failure });
      }
    }, 240);
  }
  return () => {
    if (current?.id !== id) return;
    current = null;
    if (timer) clearTimeout(timer);
    timer = null;
    worker?.postMessage({
      type: "cancel",
      id: ++sequence,
    } satisfies WorkerRequest);
  };
}

/** Explicit retry after a network/model failure; opening the palette alone never downloads anything. */
export function retryMeaningSearch() {
  failure = "";
  worker?.terminate();
  worker = null;
  ready = false;
  progress = { message: "Loading local meaning search…", percent: undefined };
}
