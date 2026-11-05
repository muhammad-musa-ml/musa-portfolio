import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const source = readFileSync(new URL('./markdown.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
})
const exports = {}
runInNewContext(outputText, { exports, require: createRequire(import.meta.url), URL })
const render = text => renderToStaticMarkup(exports.renderMarkdown(text))

test('project links remain clickable when the model emphasizes them', () => {
  const html = render('Try **[Kiln](https://kiln-by-m.vercel.app/)** or _[WUMI](https://wumihealth.com/)_.')
  assert.match(html, /<strong><a [^>]*href="https:\/\/kiln-by-m\.vercel\.app\/"[^>]*>Kiln<\/a><\/strong>/)
  assert.match(html, /<em><a [^>]*href="https:\/\/wumihealth\.com\/"[^>]*>WUMI<\/a><\/em>/)
  assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 2)
})

test('internal anchors, email links and nested link labels remain useful', () => {
  const html = render('[**WUMI project**](/work/wumi#security) and [email](mailto:mmusa2@wisc.edu)')
  assert.match(html, /href="\/work\/wumi#security"><strong>WUMI project<\/strong><\/a>/)
  assert.match(html, /href="mailto:mmusa2@wisc.edu"/)
  assert.ok(!html.includes('target='))
})

test('internal normal clicks navigate in-app; modifier clicks retain browser behavior', () => {
  let destination
  let prevented = false
  const link = exports.ChatLink({
    href: '/work/kiln#overview', children: 'Kiln', onNavigate: href => { destination = href },
  })
  const event = { button: 0, preventDefault() { prevented = true } }
  link.props.onClick({ ...event, ctrlKey: true })
  assert.equal(destination, undefined)
  assert.equal(prevented, false)
  link.props.onClick(event)
  assert.equal(destination, '/work/kiln#overview')
  assert.equal(prevented, true)
  assert.equal(link.props.target, undefined)
})

test('bare HTTPS URLs autolink without swallowing sentence punctuation', () => {
  const html = render('See https://kiln-by-m.vercel.app/. Also (https://example.com/a_(b)).')
  assert.match(html, /href="https:\/\/kiln-by-m\.vercel\.app\/"/)
  assert.match(html, /href="https:\/\/example.com\/a_\(b\)"/)
  assert.ok(html.endsWith('</a>).</p>'))
})

test('unsafe, protocol-relative, encoded-control and credential URLs stay inert', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,test', '//evil.example', '/%2fevil.example',
    '/%5cevil.example', '/work/%0atest', 'https://user:pass@example.com', 'https://example.com/%0a']) {
    assert.equal(exports.safeHref(href), undefined, href)
    assert.ok(!render('[link](' + href + ')').includes('<a '), href)
  }
  assert.ok(!render('<img src="https://example.com/x" onerror="alert(1)">').includes('<a '))
})

test('streaming-incomplete markdown stays readable and lists need no blank lead-in', () => {
  assert.equal(render('See **[Kiln](/work/kiln'), '<p>See **[Kiln](/work/kiln</p>')
  assert.equal(render('Projects:\n- Kiln\n- WUMI'), '<p>Projects:</p><ul><li>Kiln</li><li>WUMI</li></ul>')
})

test('nested formatting keeps untrusted HTML escaped and unsafe URLs inert', () => {
  const html = render('**<img src=x onerror=alert(1)> [run](javascript:alert(1))**')
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('<a '))
  assert.ok(html.includes('&lt;img'))
  assert.equal(render('`[Kiln](https://kiln-by-m.vercel.app/)`'), '<p><code>[Kiln](https://kiln-by-m.vercel.app/)</code></p>')
})
