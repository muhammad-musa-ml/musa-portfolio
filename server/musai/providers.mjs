export class ProviderError extends Error {
  constructor(code, status = 0) {
    super(code);
    this.name = "ProviderError";
    this.code = code;
    this.status = status;
  }
}
export const DEFAULT_TIMEOUTS = {
  firstTokenMs: 8000,
  idleMs: 10000,
  totalMs: 28000,
  requestMs: 35000,
};

export function configuredProviders(env = {}) {
  const order = (env.MUSAI_PROVIDER_ORDER ?? "groq")
    .split(",")
    .map((value) => value.trim());
  const result = [];
  for (const name of [...new Set(order)]) {
    if (name === "groq" && env.GROQ_API_KEY?.trim()) {
      const models = [
        env.GROQ_MODEL || "openai/gpt-oss-120b",
        ...(env.GROQ_FALLBACK_MODELS ?? "openai/gpt-oss-20b").split(","),
      ];
      for (const model of [
        ...new Set(models.map((m) => m.trim()).filter(Boolean)),
      ].slice(0, 2))
        result.push({
          name,
          model,
          key: env.GROQ_API_KEY.trim(),
          url: "https://api.groq.com/openai/v1/chat/completions",
        });
    }
    if (name === "gemini" && env.GEMINI_API_KEY?.trim())
      result.push({
        name,
        model: env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        key: env.GEMINI_API_KEY.trim(),
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      });
  }
  return result.slice(0, 3);
}

function aborted(signal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("Aborted", "AbortError");
}
function raceAbort(promise, signal) {
  if (signal.aborted) return Promise.reject(aborted(signal));
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(aborted(signal));
    };
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

async function* sseFrames(reader, signal) {
  const decoder = new TextDecoder();
  let buffer = "",
    data = [],
    size = 0;
  function line(value) {
    const trimmed = value.endsWith("\r") ? value.slice(0, -1) : value;
    if (!trimmed) {
      const payload = data.length ? data.join("\n") : null;
      data = [];
      size = 0;
      return payload;
    }
    if (trimmed.startsWith("data:")) {
      const value = trimmed.slice(5).replace(/^ /, "");
      data.push(value);
      size += value.length;
      if (size > 65536) throw new ProviderError("invalid_stream");
    }
    return null;
  }
  while (true) {
    const next = await raceAbort(reader.read(), signal);
    buffer += next.done
      ? decoder.decode()
      : decoder.decode(next.value, { stream: true });
    if (buffer.length > 131072) throw new ProviderError("invalid_stream");
    let end;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const payload = line(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (payload !== null) yield payload;
    }
    if (next.done) {
      if (buffer) {
        const payload = line(buffer);
        if (payload !== null) yield payload;
      }
      const payload = line("");
      if (payload !== null) yield payload;
      return;
    }
  }
}

export function providerBody(provider, messages) {
  const body = {
    model: provider.model,
    messages,
    stream: true,
    temperature: 0.35,
  };
  if (provider.name === "groq") {
    body.max_completion_tokens = 1600;
    if (provider.model.startsWith("openai/gpt-oss-")) {
      body.reasoning_effort = "low";
      body.include_reasoning = false;
    }
  } else {
    body.max_tokens = 1600;
    body.reasoning_effort = "low";
  }
  return body;
}

/** Genuine upstream deltas. No buffering a whole answer or simulated typing. */
export async function* streamProvider(
  provider,
  messages,
  { fetchImpl = fetch, signal, timeouts = DEFAULT_TIMEOUTS } = {},
) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal.reason);
  if (signal?.aborted) throw aborted(signal);
  signal?.addEventListener("abort", onAbort, { once: true });
  const timeout = (code) => controller.abort(new ProviderError(code));
  let firstTimer = setTimeout(
    () => timeout("first_token_timeout"),
    timeouts.firstTokenMs,
  );
  let idleTimer;
  const totalTimer = setTimeout(
    () => timeout("answer_timeout"),
    timeouts.totalMs,
  );
  let reader,
    emitted = false,
    complete = false,
    characters = 0;
  try {
    const response = await raceAbort(
      fetchImpl(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.key}`,
        },
        body: JSON.stringify(providerBody(provider, messages)),
        signal: controller.signal,
      }),
      controller.signal,
    );
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new ProviderError(
        response.status === 429 ? "quota_exhausted" : "upstream_error",
        response.status,
      );
    }
    if (
      !response.body ||
      !response.headers.get("content-type")?.includes("text/event-stream")
    ) {
      void response.body?.cancel().catch(() => {});
      throw new ProviderError("invalid_stream");
    }
    reader = response.body.getReader();
    for await (const payload of sseFrames(reader, controller.signal)) {
      if (payload === "[DONE]") {
        complete = true;
        break;
      }
      let value;
      try {
        value = JSON.parse(payload);
      } catch {
        throw new ProviderError("invalid_stream");
      }
      if (!value || typeof value !== "object" || value.error)
        throw new ProviderError("upstream_error");
      const choice = value.choices?.[0];
      if (!choice) {
        if (value.usage || Array.isArray(value.choices)) continue;
        throw new ProviderError("invalid_stream");
      }
      const text = choice.delta?.content;
      if (typeof text === "string" && text) {
        if (!emitted && !text.trim()) continue;
        emitted = true;
        clearTimeout(firstTimer);
        firstTimer = undefined;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => timeout("idle_timeout"), timeouts.idleMs);
        characters += text.length;
        if (characters > 16000) throw new ProviderError("output_limit");
        yield text;
      }
      if (choice.finish_reason) {
        if (choice.finish_reason === "length")
          throw new ProviderError("output_limit");
        if (choice.finish_reason !== "stop")
          throw new ProviderError("upstream_error");
        complete = true;
        break;
      }
    }
    if (!emitted) throw new ProviderError("empty_response");
    if (!complete) throw new ProviderError("incomplete_stream");
  } finally {
    clearTimeout(firstTimer);
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
    signal?.removeEventListener("abort", onAbort);
    controller.abort();
    if (reader) {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}
