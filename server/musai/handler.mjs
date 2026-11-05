import { retrieve, portfolioAnswer } from "./retrieve.mjs";
import { buildModelMessages } from "./prompt.mjs";
import { approvedLinks, createGroundedStream } from "./grounded-stream.mjs";
import {
  configuredProviders,
  streamProvider,
  DEFAULT_TIMEOUTS,
} from "./providers.mjs";

export const LIMITS = {
  messages: 12,
  userCharacters: 4000,
  assistantCharacters: 6000,
  totalCharacters: 18000,
  requestBytes: 32000,
};
const encoder = new TextEncoder();
class RequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function readMessages(request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw new RequestError("invalid_request", "Send a JSON messages array.");
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > LIMITS.requestBytes)
    throw new RequestError(
      "request_too_large",
      "This conversation is too long. Start a new question.",
      413,
    );
  if (!request.body)
    throw new RequestError("invalid_request", "A question is required.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LIMITS.requestBytes)
        throw new RequestError(
          "request_too_large",
          "This conversation is too long. Start a new question.",
          413,
        );
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new RequestError(
      "invalid_request",
      "The request was not valid JSON.",
    );
  }
  if (
    !body ||
    !Array.isArray(body.messages) ||
    !body.messages.length ||
    body.messages.length > LIMITS.messages
  )
    throw new RequestError(
      "invalid_request",
      "Send between 1 and 12 conversation messages.",
    );
  let characters = 0;
  const messages = body.messages.map((message) => {
    if (
      !message ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string" ||
      !message.content.trim()
    )
      throw new RequestError(
        "invalid_message",
        "Only nonempty user and assistant messages are accepted.",
      );
    const limit =
      message.role === "user"
        ? LIMITS.userCharacters
        : LIMITS.assistantCharacters;
    if (message.content.length > limit)
      throw new RequestError(
        "message_too_long",
        `Keep each ${message.role} message under ${limit} characters.`,
        413,
      );
    characters += message.content.length;
    return { role: message.role, content: message.content.trim() };
  });
  if (characters > LIMITS.totalCharacters)
    throw new RequestError(
      "request_too_large",
      "This conversation is too long. Start a new question.",
      413,
    );
  if (messages[0].role !== "user" || messages.at(-1).role !== "user")
    throw new RequestError(
      "invalid_request",
      "The conversation must start and end with a user message.",
    );
  return messages;
}

export async function* answerEvents(
  messages,
  { env = {}, fetchImpl = fetch, signal, timeouts = {} } = {},
) {
  const limits = { ...DEFAULT_TIMEOUTS, ...timeouts };
  const retrieval = retrieve(messages);
  // A complete catalog is a database lookup, not a creative-generation task.
  // Source-built text guarantees every item and its exact public destination.
  if (retrieval.intent === "catalog" ||
      (retrieval.allCollection && ["credentials", "writing"].includes(retrieval.intent))) {
    yield { type: "meta", mode: "portfolio" };
    yield { type: "delta", text: portfolioAnswer(retrieval) };
    yield { type: "sources", sources: retrieval.sources };
    yield { type: "done" };
    return;
  }
  const modelMessages = buildModelMessages(messages, retrieval);
  const deadline = Date.now() + limits.requestMs;
  let visible = false;
  for (const provider of configuredProviders(env)) {
    if (signal?.aborted) return;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const grounded = createGroundedStream(approvedLinks(retrieval));
    try {
      for await (const upstreamText of streamProvider(provider, modelMessages, {
        fetchImpl,
        signal,
        timeouts: {
          ...limits,
          firstTokenMs: Math.min(limits.firstTokenMs, remaining),
          totalMs: Math.min(limits.totalMs, remaining),
        },
      })) {
        if (signal?.aborted) return;
        const text = grounded.push(upstreamText);
        if (!text) continue;
        if (!visible) {
          yield {
            type: "meta",
            mode: "model",
            provider: provider.name,
            model: provider.model,
          };
          visible = true;
        }
        yield { type: "delta", text };
      }
      const tail = grounded.finish();
      if (tail) {
        if (!visible) {
          yield { type: "meta", mode: "model", provider: provider.name, model: provider.model };
          visible = true;
        }
        yield { type: "delta", text: tail };
      }
      if (!visible) continue;
      const kaijuTry = retrieval.selected.some((doc) => doc.parent === "project-kaiju-cats") &&
        /\b(try|use|open|play|upload|screenshot|where|link)\b/i.test(retrieval.question);
      const requiredLinks = kaijuTry
        ? [{ label: "Try the planner", url: "/playground?build=kaiju-cats" },
           { label: "Read the build story", url: "/writing/three-cats-fifteen-turns" }]
        : grounded.links.size === 0 && !["identity", "contact"].includes(retrieval.intent) && !retrieval.scope
          ? retrieval.sources.slice(0, 1) : [];
      const missingLinks = requiredLinks.filter((source) => !grounded.links.has(source.url));
      if (missingLinks.length)
        yield { type: "delta", text: `\n\n${missingLinks.map((source) => `[${source.label.replace(/[\[\]]/g, "")}](${source.url})`).join(" · ")}` };
      yield { type: "sources", sources: retrieval.sources };
      yield { type: "done" };
      return;
    } catch (error) {
      if (signal?.aborted) return;
      if (visible) {
        yield {
          type: "error",
          code: error?.code === "output_limit" ? "output_limit" : "interrupted",
          message:
            error?.code === "output_limit"
              ? "The answer reached its length limit. Ask a focused follow-up to continue."
              : "The connection stopped before the answer finished. You can retry this question.",
          retryable: true,
        };
        yield { type: "sources", sources: retrieval.sources };
        yield { type: "done" };
        return;
      }
    }
  }
  if (signal?.aborted) return;
  yield { type: "meta", mode: "portfolio" };
  yield { type: "delta", text: portfolioAnswer(retrieval) };
  yield { type: "sources", sources: retrieval.sources };
  yield { type: "done" };
}

export function createMusaiHandler({
  env = () => process.env,
  fetchImpl = fetch,
  timeouts = {},
} = {}) {
  return async function handler(request) {
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: { Allow: "POST, OPTIONS" },
      });
    if (request.method !== "POST")
      return Response.json(
        { error: { code: "method_not_allowed", message: "Use POST." } },
        { status: 405, headers: { Allow: "POST, OPTIONS" } },
      );
    const settings = typeof env === "function" ? env() : env;
    const origin = request.headers.get("origin");
    const allowed = [
      new URL(request.url).origin,
      ...(settings.MUSAI_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ];
    if (origin && !allowed.includes(origin))
      return Response.json(
        {
          error: {
            code: "invalid_origin",
            message: "Use MusA.I from the portfolio website.",
          },
        },
        { status: 403 },
      );
    let messages;
    try {
      messages = await readMessages(request);
    } catch (error) {
      return Response.json(
        {
          error: {
            code: error.code ?? "invalid_request",
            message:
              error instanceof RequestError
                ? error.message
                : "The request could not be read.",
          },
        },
        { status: error.status ?? 400 },
      );
    }
    const abort = new AbortController();
    const requestAborted = () => abort.abort();
    request.signal.addEventListener("abort", requestAborted, { once: true });
    if (request.signal.aborted) abort.abort();
    let cancelled = false;
    let heartbeat;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(": musai\n\n"));
        heartbeat = setInterval(() => {
          if (!cancelled && !abort.signal.aborted)
            controller.enqueue(encoder.encode(": keepalive\n\n"));
        }, 10000);
        void (async () => {
          try {
            for await (const event of answerEvents(messages, {
              env: settings,
              fetchImpl,
              signal: abort.signal,
              timeouts,
            })) {
              if (cancelled || abort.signal.aborted) break;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            }
          } catch {
            if (!cancelled && !abort.signal.aborted)
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", code: "unavailable", message: "MusA.I could not finish this request. Please try again.", retryable: true })}\n\ndata: {"type":"done"}\n\n`,
                ),
              );
          } finally {
            clearInterval(heartbeat);
            request.signal.removeEventListener("abort", requestAborted);
            if (!cancelled) controller.close();
          }
        })();
      },
      cancel() {
        cancelled = true;
        clearInterval(heartbeat);
        abort.abort();
        request.signal.removeEventListener("abort", requestAborted);
      },
    });
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    });
  };
}

export default createMusaiHandler();
