# MusA.I server

`api/chat.ts` is a thin Vercel Edge entry. `handler.mjs` owns validation, retrieval, provider selection and the normalized event stream. The same handler factory can be used by Vite's development proxy:

```js
import { createMusaiHandler } from "./server/musai/handler.mjs";
const handle = createMusaiHandler({ env: () => process.env });
const response = await handle(webRequest);
```

The adapter must pass request cancellation to the Web Request, stream `response.body` through immediately, and cancel its reader when the downstream connection closes. Do not collect the response as JSON or text before sending it.

## Request and stream contract

`POST /api/chat`, JSON `{messages:[{role:'user'|'assistant',content:string}]}`. Between 1 and 12 messages, first and last user, at most 4,000 characters per user message, 6,000 per assistant message, 18,000 total characters and 32,000 request bytes. System/developer/tool messages are rejected. Untrusted assistant history cannot replace the server's facts or instructions. Invalid inputs return HTTP 400/413 with `{error:{code,message}}`; unsupported methods return 405. Browser Origin must match the request origin or the explicitly configured allowed list.

Successful responses are real `text/event-stream`, `Cache-Control: no-store, no-transform`. Each event is a JSON value following `data: `:

```js
{type:'meta',mode:'model',provider:'groq',model:'openai/gpt-oss-120b'}
{type:'delta',text:'The next actual model token(s)…'}
{type:'sources',sources:[{label:'WUMI Health',url:'/work/wumi'}]}
{type:'done'}
```

Initial and 10-second SSE comments keep the connection alive during model selection. `meta` is emitted only when the first real answer text arrives. Before that point, an exhausted quota, missing model permission, timeout, empty/malformed stream or upstream error can move to the next provider. After any visible answer text, no second model is tried and no alternative answer is appended. Instead the partial text stays intact, followed by `{type:'error',code:'interrupted'|'output_limit',message,retryable:true}`, sources and `done`.

Defaults: 8-second first-token timeout, 10-second idle timeout, 28-second per-answer timeout and 35-second overall provider-attempt budget. Cancellation aborts the upstream fetch and stream reader and clears timers. Parsers accept split UTF-8, CRLF and multiline SSE, ignore comments/role-only/usage frames, read only `delta.content`, and reject malformed, oversized or incomplete streams. They never display a provider's reasoning field or raw upstream error body.

If all configured providers fail before visible output, or no key is configured, the server sends `{type:'meta',mode:'portfolio'}` and a deterministic answer assembled from public notes with clickable links. That answer is sent immediately as one delta. It is not called a live model answer and has no simulated typewriter delay.

## Provider configuration

| Server environment variable | Default / purpose                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY`              | Server-only Groq key. Never expose as a `VITE_` variable.                                                   |
| `GROQ_MODEL`                | `openai/gpt-oss-120b`                                                                                       |
| `GROQ_FALLBACK_MODELS`      | `openai/gpt-oss-20b`; empty value disables secondary Groq attempt. At most two Groq models are attempted.   |
| `MUSAI_PROVIDER_ORDER`      | `groq`. Set `groq,gemini` to explicitly enable an independent Gemini fallback, or `gemini` to use it alone. |
| `GEMINI_API_KEY`            | Used only if Gemini appears in the explicit provider order.                                                 |
| `GEMINI_MODEL`              | `gemini-3.5-flash-lite`                                                                                     |
| `MUSAI_ALLOWED_ORIGINS`     | Optional comma-separated additional browser origins. The request's own origin is always allowed.            |

Groq GPT-OSS requests use `reasoning_effort:'low'`, `include_reasoning:false`, `max_completion_tokens:1600`. `reasoning_format` is deliberately absent because Groq documents it as unsupported on GPT-OSS. Gemini uses Google's OpenAI-compatible streaming endpoint, low reasoning effort and a 1,600-token completion budget. No browser-provided model, URL, system prompt or key is forwarded.

Current provider references checked November 5, 2026:

- [Groq models](https://console.groq.com/docs/models), [free-plan limits](https://console.groq.com/docs/rate-limits), [GPT-OSS reasoning parameters](https://console.groq.com/docs/reasoning), [streaming chat API](https://console.groq.com/docs/api-reference).
- [Gemini Flash-Lite pricing](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite), [Google's OpenAI-compatible endpoint and streaming](https://aistudio.google.com/docs/openai).

Free-tier model availability and quotas can change, and shared account rate limits apply across requests. Context and output are bounded to keep ordinary portfolio conversations compact, but a byte budget is not an exact tokenizer count and cannot guarantee an account's remaining TPM quota. The two Groq models may share account constraints. An independent Gemini fallback requires explicit setup and verification that the intended account/project is on the desired free tier. The presence of an existing Gemini key alone is not treated as permission to use an unknown billing configuration. There is no anonymous Pollinations relay and no guarantee of unlimited free model access. The endpoint is public; Origin checking is browser hygiene, not authentication or distributed abuse prevention. Platform rate limits can be added separately when configuring deployment.

## Knowledge and answer quality

`knowledge.generated.mjs` is generated solely from the curated `src/portfolio/content.ts` and `profile-details.ts`, validated with the existing literal-data AST loaders. These are the same public sources used to generate `content/public-portfolio-knowledge.md`; no private profile, sample snapshot, transcript, filesystem provenance or secret is read. It includes 16 projects, five articles and 119 source passages, with project ownership/status/limits, article sections, experience, education, skills, credentials, publications and internal/external links.

Every prompt has the complete compact project catalog and selected evidence, so non-featured work remains discoverable. Retrieval recognizes project names, common technical abbreviations, domain-adjacent work and short follow-ups. It is deterministic lexical/domain retrieval, not a semantic embedding claim. The model may explain a transferable skill or propose an approach while keeping it separate from past experience. Instructions ask for direct grounded answers rather than reflexive disclaimers, retain meaningful source limits, and prohibit inventing missing employers, metrics or credentials. Returned sources are related retrieved records; the UI should label them as sources or related notes rather than claim every link was cited by the model.

Scope checks distinguish engineering adjacency from unrelated expertise. Quantum-physics research, clinical/surgical qualifications and legal practice receive explicit scope notes instead of a forced bridge to software. A query with no relevant portfolio evidence receives a documented-scope response. Healthcare data software, infrastructure reliability, UAV-based robotics adjacency and blockchain/web-based fintech adjacency remain supported. These deterministic checks are a focused safeguard, not a general-purpose expertise classifier; the model's instructions also require it to reject unsupported bridges and avoid becoming a trivia assistant. Credential requests include a separate complete compact catalog of all nine names, issuers and page anchors, even when detailed passages are clipped to the retrieval budget.

Evidence and displayed sources follow the requested project or domain. General request words such as “give me links” do not boost unrelated records; weak matches do not fill an arbitrary result quota. Named projects take precedence over a broader domain, related writing/experience can join their evidence, and specific project aspects prefer source labels supported by the passage. This source filtering leaves the complete project catalog in the model context. Singular/plural collection wording—including “every project,” “everything you have worked on,” “every certificate” and “all blogs”—returns the full matching catalog with clickable links.

```sh
node scripts/build-musai-knowledge.mjs
node scripts/build-musai-knowledge.mjs --check
node --test server/musai/musai.test.mjs
```

Regenerate whenever either curated source changes. `--check` does not call any model. Tests use mocked network streams and keys: they verify all-work links, public-source freshness/coverage, retrieval of adjacent work, server prompt ownership/history budgets, genuine first-token delivery, quota/error failover, malformed/truncated SSE, cancellation, partial-answer preservation and timeout cleanup. Provider account availability and live answer quality must be tested separately once a suitable key is authorized; the automated tests do not claim that a real provider call succeeded.
