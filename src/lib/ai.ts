// The browser sends conversation text only. Retrieval, prompts and provider
// credentials belong to the same-origin API. Public site-search excerpts are
// loaded separately only if the API cannot deliver a response.
export type ChatMessage = { role: 'user' | 'assistant'; content: string }
export type ChatSource = { label: string; url: string }
export type ChatEvent =
  | { type: 'delta'; text: string }
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'meta'; mode: 'model' | 'portfolio'; provider?: string; model?: string; reason?: 'unavailable' }
  | { type: 'done' }

export class ChatRequestError extends Error {
  constructor(public code: string, message: string, public retryable = true) {
    super(message)
    this.name = 'ChatRequestError'
  }
}

type AskOptions = {
  signal?: AbortSignal
  fetchTimeoutMs?: number
  idleTimeoutMs?: number
  totalTimeoutMs?: number
}

/** Bound context to the API's limits, keeping the latest question intact. */
export function conversationForRequest(history: ChatMessage[]): ChatMessage[] {
  const recent = history
    .filter(message => (message.role === 'user' || message.role === 'assistant') && message.content.trim())
    .slice(-12)
    .map(message => ({ role: message.role, content: message.content.slice(0, message.role === 'user' ? 4000 : 6000) }))
  let remaining = 18000
  const bounded: ChatMessage[] = []
  for (let index = recent.length - 1; index >= 0; index--) {
    const message = recent[index]
    if (message.content.length > remaining) break
    bounded.unshift(message)
    remaining -= message.content.length
  }
  // The server expects a user question at both conversation boundaries.
  // Slicing an alternating conversation can leave an orphaned first reply.
  while (bounded[0]?.role === 'assistant') bounded.shift()
  return bounded
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('Response stopped', 'AbortError')
}

/** Also interrupts body.read(), including streams that ignore fetch's signal. */
function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    void operation.catch(() => {})
    return Promise.reject(abortError(signal))
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError(signal))
    signal.addEventListener('abort', onAbort, { once: true })
    operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

function parseEvent(block: string): ChatEvent | { type: 'error'; error: ChatRequestError } | undefined {
  const payload = block.split(/\r\n|\r|\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).replace(/^ /, ''))
    .join('\n')
  if (!payload) return
  let event: Record<string, unknown>
  try {
    event = JSON.parse(payload)
  } catch {
    throw new ChatRequestError('protocol', 'The response was interrupted.')
  }
  if (!event || typeof event !== 'object') return
  if (event.type === 'error') {
    return {
      type: 'error',
      error: new ChatRequestError(
        typeof event.code === 'string' ? event.code : 'interrupted',
        'The response was interrupted.',
        event.retryable !== false,
      ),
    }
  }
  if (event.type === 'done') return { type: 'done' }
  if (event.type === 'delta' && typeof event.text === 'string') return { type: 'delta', text: event.text }
  if (event.type === 'meta' && (event.mode === 'model' || event.mode === 'portfolio')) {
    return {
      type: 'meta', mode: event.mode,
      ...(typeof event.provider === 'string' ? { provider: event.provider } : {}),
      ...(typeof event.model === 'string' ? { model: event.model } : {}),
    }
  }
  if (event.type === 'sources' && Array.isArray(event.sources)) {
    const sources = event.sources.filter((source): source is ChatSource =>
      !!source && typeof source === 'object' && typeof source.label === 'string' && typeof source.url === 'string',
    ).slice(0, 12)
    return { type: 'sources', sources }
  }
}

/** Genuine SSE chunks, with bounded connection/idle times and cancellation. */
export async function* streamTwin(history: ChatMessage[], options: AskOptions = {}): AsyncGenerator<ChatEvent> {
  const controller = new AbortController()
  const signal = controller.signal
  const onAbort = () => controller.abort(options.signal?.reason)
  options.signal?.addEventListener('abort', onAbort, { once: true })
  if (options.signal?.aborted) onAbort()
  const timeout = () => controller.abort(new ChatRequestError('timeout', 'The response timed out.'))
  const totalTimer = setTimeout(timeout, options.totalTimeoutMs ?? 90000)
  let timer: ReturnType<typeof setTimeout> | undefined
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    if (signal.aborted) throw abortError(signal)
    timer = setTimeout(timeout, options.fetchTimeoutMs ?? 15000)
    const response = await abortable(fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ messages: conversationForRequest(history) }),
      signal,
    }), signal)
    clearTimeout(timer)
    if (!response.ok) {
      void response.body?.cancel().catch(() => {})
      throw new ChatRequestError(
        response.status === 429 ? 'rate_limited' : 'http_' + response.status,
        response.status === 429 ? 'Please try again in a moment.' : 'Couldn’t connect. Try again.',
        response.status !== 400 && response.status !== 413,
      )
    }
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
      void response.body?.cancel().catch(() => {})
      throw new ChatRequestError('protocol', 'The response could not be read.')
    }
    reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let received = 0
    let interrupted: ChatRequestError | undefined
    while (true) {
      if (signal.aborted) throw abortError(signal)
      timer = setTimeout(timeout, options.idleTimeoutMs ?? 20000)
      const { done, value } = await abortable(reader.read(), signal)
      clearTimeout(timer)
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      received += value?.byteLength ?? 0
      if (received > 512000) throw new ChatRequestError('output_limit', 'The response reached its limit.')
      // Flush a final SSE frame even if the server closes without a blank line.
      if (done && buffer.trim()) buffer += '\n\n'
      let boundary: RegExpExecArray | null
      while ((boundary = /\r\n\r\n|\n\n|\r\r/.exec(buffer))) {
        if (signal.aborted) throw abortError(signal)
        const block = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        const event = parseEvent(block)
        if (event?.type === 'error') { interrupted = event.error; continue }
        // An interrupted provider can still attach the sources for its partial
        // answer. Deliver those before reporting the interruption to the UI.
        if (event?.type === 'done' && interrupted) throw interrupted
        if (event) yield event
        if (event?.type === 'done') return
      }
      if (done) throw interrupted ?? new ChatRequestError('interrupted', 'The response ended early.')
    }
  } finally {
    clearTimeout(timer)
    clearTimeout(totalTimer)
    options.signal?.removeEventListener('abort', onAbort)
    controller.abort()
    if (reader) {
      await reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  }
}

/** Keep useful public navigation available during a complete service outage. */
export async function* askTwin(history: ChatMessage[], options: AskOptions = {}): AsyncGenerator<ChatEvent> {
  let hasAnswer = false
  try {
    for await (const event of streamTwin(history, options)) {
      if (event.type === 'delta' && event.text.trim()) hasAnswer = true
      if (event.type === 'done' && !hasAnswer) continue
      yield event
    }
    if (!hasAnswer) throw new ChatRequestError('empty', 'No response arrived.')
    return
  } catch (error) {
    if (options.signal?.aborted || hasAnswer ||
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof ChatRequestError && !error.retryable)) throw error
    // No model request is made here. The optional chunk contains only the
    // same public, verbatim excerpts used by the site's command search.
    let reply: { content: string; sources: ChatSource[] }
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const lookup = import('./chat-fallback').then(({ localPortfolioReply }) => localPortfolioReply(history))
      const bounded = Promise.race([
        lookup,
        new Promise<never>((_, reject) => {
          fallbackTimer = setTimeout(() => reject(new Error('Search asset unavailable')), 3000)
        }),
      ])
      reply = options.signal ? await abortable(bounded, options.signal) : await bounded
    } catch {
      // Even an unavailable asset chunk leaves the visitor somewhere useful.
      reply = {
        content: 'Browse the [project index](/work), [experience and skills](/about), or [email Musa](mailto:mmusa2@wisc.edu).',
        sources: [{ label: 'Projects', url: '/work' }, { label: 'Experience & skills', url: '/about' }],
      }
    } finally {
      clearTimeout(fallbackTimer)
    }
    if (options.signal?.aborted) throw abortError(options.signal)
    yield { type: 'meta', mode: 'portfolio', reason: 'unavailable' }
    yield { type: 'delta', text: reply.content }
    yield { type: 'sources', sources: reply.sources }
    yield { type: 'done' }
  }
}
