// Vercel edge function: the AI twin's server hop.
//
// - With GROQ_API_KEY set (free key from https://console.groq.com): proxies to
//   Groq llama-3.3-70b-versatile with SSE streaming. Free tier: 1,000 req/day.
// - Without any key: relays to Pollinations.AI keyless (server-to-server calls
//   skip its browser Turnstile check). Zero configuration, zero cost.
//
// Either way the API key situation never touches the browser.

export const config = { runtime: 'edge' }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const POLLINATIONS_URL = 'https://text.pollinations.ai/openai'
const KB_MARKER = 'MUSA_TWIN_KB_V1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  let body: { messages?: { role: string; content: string }[]; stream?: boolean }
  try {
    body = await req.json()
  } catch {
    return new Response('Bad request', { status: 400, headers: CORS })
  }

  const messages = body.messages
  // only serve requests carrying our own system prompt — this endpoint is not
  // a general-purpose LLM relay
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 30 ||
    messages[0].role !== 'system' ||
    !messages[0].content.includes(KB_MARKER)
  ) {
    return new Response('Forbidden', { status: 403, headers: CORS })
  }

  const groqKey = process.env.GROQ_API_KEY

  if (groqKey) {
    const upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        stream: body.stream !== false,
        max_tokens: 800,
        temperature: 0.6,
      }),
    })
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text()
      return new Response(text, {
        status: upstream.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type':
          body.stream !== false ? 'text/event-stream' : 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }

  // keyless path: Pollinations anonymous tier (non-streaming JSON)
  const upstream = await fetch(POLLINATIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages,
      referrer: 'musa-portfolio',
    }),
  })
  const text = await upstream.text()
  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: `upstream_${upstream.status}` }), {
      status: upstream.status === 429 ? 429 : 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  // normalize: Pollinations may return raw text or OpenAI-shaped JSON
  let payload = text
  try {
    JSON.parse(text)
  } catch {
    payload = JSON.stringify({
      choices: [{ message: { role: 'assistant', content: text } }],
    })
  }
  return new Response(payload, {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
