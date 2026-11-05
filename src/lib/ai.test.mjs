import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const { outputText } = ts.transpileModule(readFileSync(new URL('./ai.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const load = (fetch, fallback) => {
  const exports = {}
  runInNewContext(outputText, {
    exports, fetch, AbortController, DOMException, Error, TextDecoder, setTimeout, clearTimeout,
    require(path) {
      if (path === './chat-fallback' && fallback) return { localPortfolioReply: fallback }
      throw new Error('Asset unavailable')
    },
  })
  return exports
}
const question = [{ role: 'user', content: 'What is Kiln?' }]
const wire = (...events) => events.map(event => 'data: ' + JSON.stringify(event) + '\r\n\r\n').join('')
const encoder = new TextEncoder()
const streamResponse = (text, chunkSize = 10000, onCancel = () => {}) => {
  const bytes = encoder.encode(text)
  let offset = 0
  return new Response(new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) { controller.close(); return }
      controller.enqueue(bytes.slice(offset, offset += chunkSize))
    },
    cancel: onCancel,
  }), { headers: { 'content-type': 'text/event-stream' } })
}
const collect = async stream => {
  const result = []
  for await (const event of stream) result.push(event)
  return JSON.parse(JSON.stringify(result))
}

test('only bounded conversation text is sent to the same-origin endpoint', async () => {
  let request
  const { streamTwin: askTwin, conversationForRequest } = load(async (url, init) => {
    request = { url, init }
    return streamResponse(wire({ type: 'delta', text: 'Kiln' }, { type: 'done' }))
  })
  const history = [
    { role: 'system', content: 'must never be sent' },
    ...Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: String(i).repeat(5000) })),
    ...question,
  ]
  await collect(askTwin(history))
  assert.equal(request.url, '/api/chat')
  assert.equal(request.init.method, 'POST')
  const body = JSON.parse(request.init.body)
  assert.deepEqual(Object.keys(body), ['messages'])
  assert.ok(body.messages.length <= 12)
  assert.ok(body.messages.every(message => ['user', 'assistant'].includes(message.role)))
  assert.ok(body.messages.reduce((sum, message) => sum + message.content.length, 0) <= 18000)
  assert.ok(body.messages.every(message => message.content.length <= (message.role === 'user' ? 4000 : 6000)))
  assert.deepEqual(body.messages.at(-1), question[0])
  assert.equal(conversationForRequest([{ role: 'assistant', content: '' }]).length, 0)
})

test('SSE survives arbitrary byte boundaries, Unicode, CRLF, metadata and citations', async () => {
  const events = [
    { type: 'meta', mode: 'portfolio' },
    { type: 'delta', text: 'Musa’s work 🧠 ' },
    { type: 'delta', text: '[Kiln](/work/kiln)' },
    { type: 'sources', sources: [{ label: 'Kiln', url: '/work/kiln' }] },
    { type: 'done' },
  ]
  const { streamTwin: askTwin } = load(async () => streamResponse(': keepalive\r\n\r\n' + wire(...events), 1))
  assert.deepEqual(await collect(askTwin(question)), events)
})

test('a complete response releases/cancels its reader without waiting for EOF', async () => {
  let cancelled = false
  let response
  const { streamTwin: askTwin } = load(async () => {
    response = new Response(new ReadableStream({
      start(controller) { controller.enqueue(encoder.encode(wire({ type: 'delta', text: 'Done' }, { type: 'done' }))) },
      cancel() { cancelled = true },
    }), { headers: { 'content-type': 'text/event-stream' } })
    return response
  })
  await collect(askTwin(question))
  assert.equal(cancelled, true)
  assert.equal(response.body.locked, false)
})

test('provider interruption preserves every delivered delta and does not replay another provider', async () => {
  let calls = 0
  const { streamTwin: askTwin } = load(async () => {
    calls++
    return streamResponse(wire(
      { type: 'delta', text: 'A useful partial answer' },
      { type: 'error', code: 'interrupted', message: 'Private upstream details', retryable: true },
      { type: 'sources', sources: [{ label: 'Kiln', url: '/work/kiln' }] },
      { type: 'done' },
    ))
  })
  const seen = []
  await assert.rejects(async () => {
    for await (const event of askTwin(question)) seen.push(event)
  }, error => error.code === 'interrupted' && !error.message.includes('Private'))
  assert.equal(seen[0].text, 'A useful partial answer')
  assert.equal(seen[1].sources[0].url, '/work/kiln')
  assert.equal(calls, 1)
})

test('unexpected EOF reports interruption after its partial answer', async () => {
  const { streamTwin: askTwin } = load(async () => streamResponse('data: {"type":"delta","text":"Partial"}'))
  const stream = askTwin(question)
  assert.equal((await stream.next()).value.text, 'Partial')
  await assert.rejects(stream.next(), error => error.code === 'interrupted')
})

test('Stop aborts a stalled reader and releases its lock', async () => {
  let cancelled = false
  const response = new Response(new ReadableStream({
    start(controller) { controller.enqueue(encoder.encode(wire({ type: 'delta', text: 'Partial' }))) },
    cancel() { cancelled = true },
  }), { headers: { 'content-type': 'text/event-stream' } })
  const { streamTwin: askTwin } = load(async () => response)
  const controller = new AbortController()
  const stream = askTwin(question, { signal: controller.signal })
  assert.equal((await stream.next()).value.text, 'Partial')
  const pending = stream.next()
  controller.abort()
  await assert.rejects(pending, error => error.name === 'AbortError')
  assert.equal(cancelled, true)
  assert.equal(response.body.locked, false)
})

test('connection and stalled-stream timeouts are bounded and clean up', async () => {
  const hangingFetch = load(() => new Promise(() => {}))
  await assert.rejects(collect(hangingFetch.streamTwin(question, { fetchTimeoutMs: 5 })), error => error.code === 'timeout')
  let cancelled = false
  const hangingBody = load(async () => new Response(new ReadableStream({
    cancel() { cancelled = true },
  }), { headers: { 'content-type': 'text/event-stream' } }))
  await assert.rejects(collect(hangingBody.streamTwin(question, { idleTimeoutMs: 5 })), error => error.code === 'timeout')
  assert.equal(cancelled, true)
})

test('HTTP errors never fall through to a third-party browser request', async () => {
  for (const status of [400, 429, 503]) {
    let calls = 0
    const { streamTwin: askTwin } = load(async () => { calls++; return new Response('{}', { status }) })
    await assert.rejects(collect(askTwin(question)), error =>
      error.code === (status === 429 ? 'rate_limited' : 'http_' + status))
    assert.equal(calls, 1)
  }
})

test('breaking iteration cancels the request', async () => {
  let cancelled = false
  const response = new Response(new ReadableStream({
    start(controller) { controller.enqueue(encoder.encode(wire({ type: 'delta', text: 'First' }))) },
    cancel() { cancelled = true },
  }), { headers: { 'content-type': 'text/event-stream' } })
  const { streamTwin: askTwin } = load(async () => response)
  for await (const event of askTwin(question)) { assert.equal(event.text, 'First'); break }
  assert.equal(cancelled, true)
  assert.equal(response.body.locked, false)
})

test('long conversations always begin and end with user messages after message and size limits', () => {
  const { conversationForRequest } = load()
  const long = Array.from({ length: 15 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user', content: 'message ' + index,
  }))
  const byCount = conversationForRequest(long)
  assert.equal(byCount.length, 11)
  assert.equal(byCount[0].role, 'user')
  assert.equal(byCount.at(-1).content, 'message 14')
  const bySize = conversationForRequest([
    { role: 'user', content: 'a'.repeat(3000) },
    { role: 'assistant', content: 'b'.repeat(4000) },
    { role: 'user', content: 'c'.repeat(3000) },
    { role: 'assistant', content: 'd'.repeat(6000) },
    { role: 'user', content: 'e'.repeat(4000) },
  ])
  assert.equal(bySize.length, 3)
  assert.equal(bySize[0].role, 'user')
  assert.equal(bySize.at(-1).content, 'e'.repeat(4000))
  assert.ok(bySize.reduce((sum, message) => sum + message.content.length, 0) <= 18000)
})

test('an API outage lazily retrieves public notes once, without another API request', async () => {
  let requests = 0
  let searches = 0
  const client = load(async url => {
    requests++
    assert.equal(url, '/api/chat')
    throw new TypeError('Failed to fetch')
  }, async history => {
    searches++
    assert.equal(history.at(-1).content, question[0].content)
    return { content: '- [Kiln](/work/kiln) — A public excerpt.', sources: [{ label: 'Kiln', url: '/work/kiln' }] }
  })
  const events = await collect(client.askTwin(question))
  assert.equal(requests, 1)
  assert.equal(searches, 1)
  assert.deepEqual(events[0], { type: 'meta', mode: 'portfolio', reason: 'unavailable' })
  assert.equal(events[1].text, '- [Kiln](/work/kiln) — A public excerpt.')
  assert.equal(events[2].sources[0].url, '/work/kiln')
  assert.equal(events.at(-1).type, 'done')
})

test('successful streams do not load public retrieval; partial failures never invoke it', async () => {
  let searches = 0
  const fallback = async () => { searches++; return { content: 'not used', sources: [] } }
  const good = load(async () => streamResponse(wire({ type: 'delta', text: 'Answer' }, { type: 'done' })), fallback)
  assert.equal((await collect(good.askTwin(question)))[0].text, 'Answer')
  const partial = load(async () => streamResponse(wire(
    { type: 'delta', text: 'Keep this answer' },
    { type: 'error', code: 'interrupted', retryable: true },
    { type: 'done' },
  )), fallback)
  const seen = []
  await assert.rejects(async () => {
    for await (const event of partial.askTwin(question)) seen.push(event)
  }, error => error.code === 'interrupted')
  assert.equal(seen[0].text, 'Keep this answer')
  assert.equal(searches, 0)
})

test('an unavailable search chunk still offers project, experience and contact links', async () => {
  const client = load(async () => { throw new TypeError('Offline') })
  const events = await collect(client.askTwin(question))
  assert.match(events.find(event => event.type === 'delta').text, /\[project index\]\(\/work\)/)
  assert.match(events.find(event => event.type === 'delta').text, /\(\/about\)/)
  assert.match(events.find(event => event.type === 'delta').text, /mailto:mmusa2@wisc.edu/)
})

test('Stop during local retrieval exits promptly without showing a fallback', async () => {
  const controller = new AbortController()
  let searching
  const started = new Promise(resolve => { searching = resolve })
  const client = load(async () => { throw new TypeError('Offline') }, async () => {
    searching()
    return new Promise(() => {})
  })
  const pending = collect(client.askTwin(question, { signal: controller.signal }))
  await started
  controller.abort()
  await assert.rejects(pending, error => error.name === 'AbortError')
})

test('validation failures do not trigger retrieval, while an empty successful stream does', async () => {
  let searches = 0
  const fallback = async () => { searches++; return { content: 'Public notes', sources: [] } }
  const invalid = load(async () => new Response('{}', { status: 400 }), fallback)
  await assert.rejects(collect(invalid.askTwin(question)), error => error.code === 'http_400')
  assert.equal(searches, 0)
  const empty = load(async () => streamResponse(wire({ type: 'done' })), fallback)
  const events = await collect(empty.askTwin(question))
  assert.equal(searches, 1)
  assert.equal(events[0].mode, 'portfolio')
  assert.equal(events[1].text, 'Public notes')
})
