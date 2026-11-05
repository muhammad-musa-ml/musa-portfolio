import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPages, loadContent, loadProfile, prerender, renderPage } from './prerender-portfolio.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const shell = '<!doctype html><html lang="en"><head><title>Old</title><meta name="description" content="Old"><meta property="og:title" content="Old"><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>'

async function temporaryDirectory(t) {
  const tempRoot = path.resolve(os.tmpdir())
  const directory = await mkdtemp(path.join(tempRoot, 'musa-prerender-test-'))
  t.after(async () => {
    const relative = path.relative(tempRoot, directory)
    assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative) && relative.startsWith('musa-prerender-test-'))
    await rm(directory, { recursive: true, force: true })
  })
  return directory
}

test('literal content loader rejects executable initializers and imports', async t => {
  const directory = await temporaryDirectory(t)
  const file = path.join(directory, 'content.ts')
  const valid = "export const BIO = {intro:'Test', paragraphs:[]}; export const PROJECTS = []; export const ARTICLES = [];"
  await writeFile(file, valid)
  assert.deepEqual((await loadContent(file)).PROJECTS, [])
  for (const invalid of [valid.replace("'Test'", 'process.exit(0)'), "import fs from 'node:fs';" + valid, valid.replace('paragraphs:[]', 'get paragraphs(){return []}')]) {
    await writeFile(file, invalid)
    await assert.rejects(loadContent(file), /executable|only exported/)
  }
})

test('the profile loader permits only its explicit literal public exports', async t => {
  const directory = await temporaryDirectory(t)
  const file = path.join(directory, 'profile-details.ts')
  const valid = "export const PROFILE_NUMBERS=[];export const EXPERIENCE=[];export const EDUCATION=[];export const TOOLKIT=[];export const CREDENTIALS=[];export const PUBLICATIONS=[];export const PROFILE_LINKS={github:'https://github.com/example'};"
  await writeFile(file, valid)
  assert.equal((await loadProfile(file)).PROFILE_LINKS.github, 'https://github.com/example')
  for (const invalid of [valid.replace("'https://github.com/example'", 'process.exit(0)'), "import profile from '../../content/profile.json';" + valid, valid + 'export const PRIVATE_SOURCE=[];', valid.replace('EXPERIENCE=[]', "EXPERIENCE=[{id:'../private'}]")]) {
    await writeFile(file, invalid)
    await assert.rejects(loadProfile(file), /executable|only exported|Invalid or duplicate/)
  }
  // Content's original allowlist remains narrower; profile loading does not weaken it.
  await writeFile(file, valid)
  await assert.rejects(loadContent(file), /executable or unsupported/)
})

test('public copy and structured data cannot escape into executable markup', () => {
  const payload = '</script><img src=x onerror="alert(1)"> & "hello"'
  const pages = buildPages({ BIO: { intro: payload, paragraphs: [payload] }, PROJECTS: [], ARTICLES: [{ slug: 'safe-slug', title: payload, dek: payload, topics: [payload], projectId: 'none', minutes: 3, sections: [{ heading: payload, paragraphs: [payload], code: payload }], references: [{ label: payload, url: 'https://example.com/?a=1&b=2' }] }] })
  const html = renderPage(shell, pages.find(page => page.route === '/writing/safe-slug'))
  assert.ok(!html.includes('<img src=x'))
  assert.ok(html.includes('&lt;/script&gt;&lt;img'))
  assert.equal((html.match(/<title>/g) || []).length, 1)
  assert.equal((html.match(/property="og:title"/g) || []).length, 1)
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  assert.equal(schema.headline, payload)
  assert.equal(schema.author.name, 'Muhammad Musa')
  assert.ok(!('datePublished' in schema))
  assert.throws(() => buildPages({ BIO: { intro: 'Test', paragraphs: [] }, PROJECTS: [], ARTICLES: [{ slug: 'test', title: 'Test', dek: 'Test', topics: [], projectId: 'none', minutes: 1, sections: [], references: [{ label: 'bad', url: 'javascript:alert(1)' }] }] }), /Unsupported public link/)
})

test('real content produces all public routes, metadata and crawlable bodies in an isolated output directory', async t => {
  const directory = await temporaryDirectory(t)
  await writeFile(path.join(directory, 'index.html'), shell)
  const content = await loadContent(path.join(ROOT, 'src/portfolio/content.ts'))
  const routes = await prerender(directory)
  assert.equal(routes.length, 5 + content.PROJECTS.length + content.ARTICLES.length)
  assert.equal(new Set(routes).size, routes.length)
  for (const route of ['/work', '/about', '/playground']) assert.ok(routes.includes(route))
  for (const route of ['/playground/pathfinding', '/playground/learning', '/playground/experiments']) assert.ok(!routes.includes(route))
  assert.ok(!routes.some(route => route.startsWith('/samples') || route === '/backgrounds'))
  for (const route of routes) {
    const html = await readFile(path.join(directory, route === '/' ? '' : route.slice(1), 'index.html'), 'utf8')
    assert.ok(html.includes('<main id="main">'))
    assert.ok(html.includes(`<link rel="canonical" href="https://iammusa.vercel.app${route}">`))
    assert.ok(html.includes('src="/assets/app.js"'))
    assert.equal((html.match(/<h1>/g) || []).length, 1)
    assert.ok(!html.includes('<title>Old</title>'))
  }
  const article = content.ARTICLES[0]
  const articleHtml = await readFile(path.join(directory, 'writing', article.slug, 'index.html'), 'utf8')
  assert.ok(articleHtml.includes('Sources & further reading'))
  assert.ok(articleHtml.includes('property="og:type" content="article"'))
  const sitemap = await readFile(path.join(directory, 'sitemap.xml'), 'utf8')
  assert.equal((sitemap.match(/<loc>/g) || []).length, routes.length)
  assert.ok(!sitemap.includes('lastmod'))
  assert.match(await readFile(path.join(directory, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/iammusa\.vercel\.app\/sitemap.xml/)
  await assert.rejects(prerender(directory), /Run Vite before prerendering again/)
})

test('the production playground exposes actual builds and archived labs require an explicit local-only build', async () => {
  const content = await loadContent(path.join(ROOT, 'src/portfolio/content.ts'))
  const pages = buildPages(content)
  const playground = pages.find(page => page.route === '/playground')
  assert.ok(!pages.some(page => /^\/playground\//.test(page.route)))
  const archivedPages = buildPages(content, {}, { includeStudies: true })
  const experiments = archivedPages.find(page => page.route === '/playground/experiments')
  for (const build of ['kiln', 'lookup', 'serving', 'research', 'wumi']) assert.ok(playground.body.includes(`href="/playground?build=${build}"`))
  assert.match(playground.body, /Live application/)
  assert.match(playground.body, /Recorded results/)
  assert.match(playground.body, /does not connect to WUMI/)
  assert.match(playground.body, /https:\/\/kiln-by-m\.vercel\.app\//)
  assert.ok(!playground.body.includes('/playground/pathfinding'))
  assert.ok(!playground.body.includes('/playground/learning'))
  for (const demo of ['consent', 'defense', 'provenance']) assert.ok(experiments.body.includes(`href="/playground/experiments?demo=${demo}"`))
  for (const route of ['/playground/pathfinding', '/playground/learning']) {
    assert.ok(experiments.body.includes(`href="${route}"`))
    const page = archivedPages.find(item => item.route === route)
    const html = renderPage(shell, page)
    assert.ok(html.includes(`property="og:url" content="https://iammusa.vercel.app${route}"`))
    assert.ok(html.includes(`name="description" content="${page.description}"`))
    assert.ok(html.includes('href="/playground"'))
    const structured = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
    assert.equal(structured.isPartOf.url, 'https://iammusa.vercel.app/playground/experiments')
    assert.ok(!('datePublished' in structured))
  }
  const pathfinding = archivedPages.find(page => page.route === '/playground/pathfinding')
  assert.match(pathfinding.body, /Manhattan distance/)
  assert.match(pathfinding.body, /When no route connects/)
  assert.match(pathfinding.body, /not timing benchmarks/)
  const learning = archivedPages.find(page => page.route === '/playground/learning')
  assert.match(learning.body, /Full-batch gradient descent/)
  assert.match(learning.body, /Training accuracy is not performance on unseen examples/)
  assert.match(learning.body, /single line cannot perfectly separate the XOR classes/)
})

test('work and about expose the complete public catalog, evidence, original credentials and profile links', async () => {
  const content = await loadContent(path.join(ROOT, 'src/portfolio/content.ts'))
  const profile = await loadProfile(path.join(ROOT, 'src/portfolio/profile-details.ts'))
  const pages = buildPages(content, profile)
  const work = pages.find(page => page.route === '/work')
  const about = pages.find(page => page.route === '/about')
  assert.equal(work.schema.hasPart.length, content.PROJECTS.length)
  for (const project of content.PROJECTS) assert.ok(work.body.includes(`href="/work/${project.id}"`))
  for (const id of ['story', 'experience', 'education', 'publications', 'toolkit', 'certificates', 'humanity']) assert.ok(about.body.includes(`id="${id}"`))
  for (const credential of profile.CREDENTIALS) {
    assert.ok(about.body.includes(`href="${credential.file}"`))
    assert.ok(credential.file.startsWith('/certificates/') && !credential.file.includes('..'))
    assert.ok((await readFile(path.join(ROOT, 'public', credential.file.slice(1)))).length > 0)
  }
  for (const publication of profile.PUBLICATIONS) assert.ok(about.body.includes(`href="${publication.href}"`))
  assert.ok(about.body.includes('M.S. Computer Sciences'))
  assert.ok(about.body.includes('in progress'))
  const html = renderPage(shell, about)
  assert.ok(html.includes('href="https://www.linkedin.com/in/mmusa2/"'))
  assert.ok(html.includes('href="/Muhammad-Musa-Resume.pdf"'))
  assert.equal(about.schema.mainEntity['@type'], 'Person')
  assert.ok(!JSON.stringify(about.schema).includes('datePublished'))
  // A bare content consumer can still render all routes without profile data.
  assert.ok(buildPages(content).find(page => page.route === '/about').body.includes('id="story"'))
})

test('Vercel redirects retired studies and retains direct public page delivery', async () => {
  const { rewrites, redirects } = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'))
  for (const prefix of ['backgrounds', 'motion-studio', 'samples', 'journeys'])
    assert.ok(redirects.some(rule => rule.source === `/${prefix}/:path*` && rule.destination === '/' && rule.permanent))
  for (const slug of ['experiments', 'pathfinding', 'learning'])
    assert.ok(redirects.some(rule => rule.source === `/playground/${slug}/:path*` && rule.destination === '/playground'))
  assert.ok(!rewrites.some(rule => rule.source === '/playground/:slug'))
  const fallbackIndex = rewrites.findIndex(rule => rule.destination === '/index.html')
  assert.ok(rewrites.some(rule => rule.source === '/writing/:slug'))
  assert.ok(rewrites.some(rule => rule.source === '/work/:slug'))
  for (const route of ['/work', '/about', '/playground']) {
    const index = rewrites.findIndex(rule => rule.source === route)
    assert.ok(index >= 0 && index < fallbackIndex)
    assert.equal(rewrites[index].destination, `${route}/index.html`)
  }
})

test('every public search result resolves to a real page and stable anchor', async () => {
  const { buildCorpus } = await import('../src/portfolio/command-search/corpus.mjs')
  const content = await loadContent(path.join(ROOT, 'src/portfolio/content.ts'))
  const profile = await loadProfile(path.join(ROOT, 'src/portfolio/profile-details.ts'))
  const pages = new Map(buildPages(content, profile).map(page => [page.route, page]))
  for (const entry of buildCorpus(content, profile)) {
    const url = new URL(entry.href, 'https://iammusa.vercel.app')
    const page = pages.get(url.pathname)
    assert.ok(page, `Missing page for ${entry.id}: ${entry.href}`)
    if (url.hash) assert.ok(renderPage(shell, page).includes(`id="${url.hash.slice(1)}"`), `Missing anchor for ${entry.id}: ${entry.href}`)
  }
})
