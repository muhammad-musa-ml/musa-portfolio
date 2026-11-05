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
runInNewContext(outputText, { exports, require: createRequire(import.meta.url) })
const render = text => renderToStaticMarkup(exports.renderMarkdown(text))

test('project links remain clickable when the model emphasizes them', () => {
  const html = render('Try **[Kiln](https://kiln-by-m.vercel.app/)** or _[WUMI](https://wumihealth.com/)_.')
  assert.match(html, /<strong><a [^>]*href="https:\/\/kiln-by-m\.vercel\.app\/"[^>]*>Kiln<\/a><\/strong>/)
  assert.match(html, /<em><a [^>]*href="https:\/\/wumihealth\.com\/"[^>]*>WUMI<\/a><\/em>/)
  assert.equal((html.match(/rel="noreferrer"/g) ?? []).length, 2)
})

test('nested formatting keeps untrusted HTML escaped and unsafe URLs inert', () => {
  const html = render('**<img src=x onerror=alert(1)> [run](javascript:alert(1))**')
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('<a '))
  assert.ok(html.includes('&lt;img'))
  assert.equal(render('`[Kiln](https://kiln-by-m.vercel.app/)`'), '<p><code>[Kiln](https://kiln-by-m.vercel.app/)</code></p>')
})
