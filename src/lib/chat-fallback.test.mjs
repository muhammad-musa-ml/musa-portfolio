import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { loadRanking } from '../portfolio/command-search/evaluate.mjs'

const ranking = await loadRanking()
const { outputText } = ts.transpileModule(readFileSync(new URL('./chat-fallback.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const exports = {}
runInNewContext(outputText, { exports })
const reply = history => exports.replyFromPublicSearch(history, ranking.rankSearch)

test('local fallback quotes up to three actual public snippets and links to their destinations', () => {
  const result = reply([{ role: 'user', content: 'What is Kiln?' }])
  const matches = ranking.rankSearch('What is Kiln?')
  assert.ok(result.sources.some(source => source.url.startsWith('/work/kiln')))
  assert.ok(result.sources.length <= 3)
  for (const source of result.sources) {
    const match = matches.find(entry => entry.href === source.url)
    assert.ok(match)
    assert.ok(result.content.includes((match.snippet ?? match.detail).replace(/\s+/g, ' ').trim()))
    assert.ok(result.content.includes('](' + source.url + ')'))
  }
})

test('short referential follow-ups retain the latest user topic, without treating assistant prose as a query', () => {
  const result = reply([
    { role: 'user', content: 'What is Kiln?' },
    { role: 'assistant', content: 'Unrelated quantum-computing material must not become evidence' },
    { role: 'user', content: 'Tell me more about it' },
  ])
  assert.ok(result.sources.some(source => source.url.startsWith('/work/kiln')))
  assert.ok(!result.content.includes('quantum-computing'))
})

test('no relevant results produce useful directory links instead of fabricated claims', () => {
  const result = reply([{ role: 'user', content: 'gibberishzzzxxyy' }])
  assert.match(result.content, /\(\/work\)/)
  assert.match(result.content, /\(\/about\)/)
  assert.match(result.content, /mailto:mmusa2@wisc.edu/)
  assert.equal(result.sources.length, 2)
})
