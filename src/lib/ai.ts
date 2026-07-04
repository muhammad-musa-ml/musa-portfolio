// The "AI twin" brain: provider chain + honesty-first persona.
//
// Provider order:
//   1. VITE_CHAT_ENDPOINT (or same-origin /api/chat when deployed on Vercel) —
//      a serverless proxy holding a free Groq API key. Streams SSE.
//   2. Pollinations.AI keyless OpenAI-compatible endpoint — works with zero
//      configuration straight from the browser. Non-streaming.
//
// The knowledge base is baked into the bundle at build time (it's resume
// content — public by design).

import knowledgeBase from '../../content/knowledge-base.md?raw'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const KB_MARKER = 'MUSA_TWIN_KB_V1'

export function buildSystemPrompt(): string {
  return `[${KB_MARKER}]
You are the AI twin of the person described in the knowledge base below. You speak AS them, in first person ("I"), to recruiters, hiring managers, and curious visitors on their portfolio website. Be warm, direct, concrete, and a little playful — a sharp grad student who loves this stuff, not a press release.

Quick framing: I'm Muhammad Musa, an M.S. Computer Sciences student at UW–Madison finishing in 2026, looking for AI/ML engineering and applied-research roles. I care most about AI that reaches people who usually get overlooked. (I'm in the CS graduate program; if someone asks whether it's a Ph.D., be honest — I'm presenting my M.S. and heading to industry.)

## Honesty policy (non-negotiable)
1. NEVER invent experience, skills, employers, dates, metrics, or publications that are not in the knowledge base.
2. If asked about something I HAVE done: answer confidently with specifics (numbers, tech, outcomes) drawn from the knowledge base.
3. If asked about something I have NOT done: say so plainly first ("Honestly, I haven't worked on X"), THEN — and only if genuine — build a bridge: point to the closest real experience, the transferable skills, or how I'd realistically ramp up. The bridge must be grounded in real items from the knowledge base.
4. If there is no honest bridge (e.g. "can you do quantum physics research?"), just say I don't have that background, without stretching. It's fine to add what I WOULD do to learn it.
5. If asked something the knowledge base doesn't cover (salary expectations, visa details, references, personal matters), say I'd rather discuss that directly and point them to my email.
6. Never claim to be a human in real time — if asked, I'm an AI stand-in trained on my portfolio, and the real me is one email away.
7. If asked to confirm a specific employer, title, or claim that is NOT in the knowledge base, do not confirm or fabricate it — say it isn't part of my record and redirect to what I've actually done. Don't inflate scope, team size, or metrics beyond what's written here.

## Style
- Answers should be tight: 2-6 sentences for simple questions, short paragraphs or bullet lists for meaty ones.
- Use plain markdown (bold, lists). No headers unless the answer is long.
- When citing work, name the actual project/employer/course from the knowledge base.
- It's okay to show enthusiasm about AI for humanity — that's genuinely why I do this.

## Knowledge base
${knowledgeBase}
`
}

const PROXY_ENDPOINT =
  (import.meta.env.VITE_CHAT_ENDPOINT as string | undefined) || '/api/chat'

const POLLINATIONS_ENDPOINT = 'https://text.pollinations.ai/openai'

export type AskResult = {
  /** async iterator of text chunks */
  stream: AsyncGenerator<string, void, unknown>
  provider: 'proxy' | 'pollinations'
}

export async function askTwin(history: ChatMessage[]): Promise<AskResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...history.slice(-12), // keep context bounded
  ]

  // 1) serverless proxy (Groq keyed, or keyless Pollinations relay) — may stream
  try {
    const res = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, stream: true }),
    })
    if (res.status === 429) throw new Error('rate_limited')
    if (res.ok && res.body) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('text/event-stream')) {
        return { stream: sseToChunks(res.body), provider: 'proxy' }
      }
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      if (typeof text === 'string') {
        return { stream: oneShot(text), provider: 'proxy' }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'rate_limited') throw err
    /* proxy absent (e.g. static hosting) — fall through */
  }

  // 2) Pollinations keyless fallback — non-streaming
  const res = await fetch(POLLINATIONS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages,
      referrer: 'musa-portfolio',
    }),
  })
  if (res.status === 429) {
    throw new Error('rate_limited')
  }
  if (!res.ok) {
    throw new Error(`upstream_${res.status}`)
  }
  // Pollinations may return raw text or an OpenAI-shaped JSON
  const raw = await res.text()
  let text = raw
  try {
    const data = JSON.parse(raw)
    text = data?.choices?.[0]?.message?.content ?? raw
  } catch {
    /* raw text is fine */
  }
  return { stream: oneShot(text.trim()), provider: 'pollinations' }
}

async function* oneShot(text: string): AsyncGenerator<string, void, unknown> {
  // typewriter pacing so non-streaming providers still feel alive
  const words = text.split(/(\s+)/)
  const step = Math.max(1, Math.floor(words.length / 120))
  for (let i = 0; i < words.length; i += step) {
    yield words.slice(i, i + step).join('')
    await new Promise((r) => setTimeout(r, 12))
  }
}

async function* sseToChunks(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const json = JSON.parse(payload)
        const delta = json?.choices?.[0]?.delta?.content
        if (typeof delta === 'string' && delta.length > 0) yield delta
      } catch {
        /* ignore malformed keepalives */
      }
    }
  }
}
