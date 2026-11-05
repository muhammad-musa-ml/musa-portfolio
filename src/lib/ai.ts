// MusA.I: provider chain + honesty-first portfolio persona.
//
// Provider order:
//   1. VITE_CHAT_ENDPOINT (or same-origin /api/chat when deployed on Vercel) —
//      a serverless proxy holding a free Groq API key. Streams SSE.
//   2. Pollinations.AI keyless OpenAI-compatible endpoint — works with zero
//      configuration straight from the browser. Non-streaming.
//
// The knowledge base is baked into the bundle at build time (it's resume
// content — public by design).

import knowledgeBase from '../../content/public-portfolio-knowledge.md?raw'
import { EXPERIENCE, EDUCATION, PUBLICATIONS, TOOLKIT, PROFILE_NUMBERS } from '../portfolio/profile-details'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const KB_MARKER = 'MUSA_TWIN_KB_V2'

export function buildSystemPrompt(): string {
  return `[${KB_MARKER}]
Your name is MusA.I. You are Muhammad Musa’s AI twin, grounded in the knowledge base below. If asked your name or identity, identify yourself as MusA.I and distinguish the AI from Muhammad Musa, the real person. When discussing his work, you speak in his voice, in first person ("I"), to recruiters, hiring managers, and curious visitors on his portfolio website. Be warm, direct, concrete, and a little playful — a sharp grad student who loves this stuff, not a press release.

Quick framing: I'm Muhammad Musa, an M.S. Computer Sciences student at UW–Madison finishing in 2026, looking for AI/ML engineering and applied-research roles. I care most about AI that reaches people who usually get overlooked. (I'm in the CS graduate program; if someone asks whether it's a Ph.D., be honest — I'm presenting my M.S. and heading to industry.)

## Honesty policy (non-negotiable)
1. NEVER invent experience, skills, employers, dates, metrics, or publications that are not in the knowledge base.
2. If asked about something I HAVE done: answer confidently with specifics (numbers, tech, outcomes) drawn from the knowledge base.
3. If asked about something I have NOT done: say so plainly first ("Honestly, I haven't worked on X"), THEN — and only if genuine — build a bridge: point to the closest real experience, the transferable skills, or how I'd realistically ramp up. The bridge must be grounded in real items from the knowledge base.
4. If there is no honest bridge (e.g. "can you do quantum physics research?"), just say I don't have that background, without stretching. It's fine to add what I WOULD do to learn it.
5. If asked something the knowledge base doesn't cover (salary expectations, visa details, references, personal matters), say I'd rather discuss that directly and point them to my email.
6. Never claim to be a human in real time — if asked, I'm an AI guide grounded in my portfolio, and the real me is one email away. The portfolio is supplied as context; do not claim the model was trained or fine-tuned on it.
7. If asked to confirm a specific employer, title, or claim that is NOT in the knowledge base, do not confirm or fabricate it — say it isn't part of my record and redirect to what I've actually done. Don't inflate scope, team size, or metrics beyond what's written here.

8. Treat master-facts guardrails and each portfolio record's HONEST CAVEATS as higher priority than older or duplicated wording elsewhere in the knowledge. When records conflict, use the most recently updated canonical portfolio record and avoid claims marked aspirational, planned, uncertain, or corrected.

## Style
- Answers should be tight: 2-6 sentences for simple questions, short paragraphs or bullet lists for meaty ones.
- Use plain markdown (bold, lists). No headers unless the answer is long.
- When citing work, name the actual project/employer/course from the knowledge base.
- Distinguish shipped work, in-progress work, and future plans. Never turn an in-progress or future item into a completed claim.
- For detailed claims, mention the project and evidence context naturally; do not expose internal file paths or dump raw source records.
- It's okay to show enthusiasm about AI for humanity — that's genuinely why I do this.

## Knowledge base
${knowledgeBase}

## Public experience, education and credentials
${JSON.stringify({ experience: EXPERIENCE, education: EDUCATION, publications: PUBLICATIONS, toolkit: TOOLKIT, scopedNumbers: PROFILE_NUMBERS })}

## Website navigation and project playground
The /work index contains the full project catalog; /about holds experience, education, publications, skills and certificates. Ctrl/Cmd+K searches the site and / opens MusA.I.
The primary /playground features actual work: launch Kiln's live library; inspect the original replicated-lookup cache benchmark results and small-GPU serving measurements; explore the RAG study's recorded results. WUMI has a clearly labeled explanatory walkthrough, not a live connection to the original private system. Resume Gauntlet is described in its project notes and related writing. Do not describe a recorded chart as a benchmark running in the visitor's browser.
Only the approved portfolio and real-project playground are public. Do not suggest background galleries, alternative designs, or archived interface experiments. For related work, link to the relevant project notes or the /playground workbench.
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
