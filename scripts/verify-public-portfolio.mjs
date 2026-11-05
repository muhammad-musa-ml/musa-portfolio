import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadContent } from './prerender-portfolio.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://iammusa.vercel.app'
const DEMOS = new Set(['consent', 'defense', 'provenance'])
const PRIVATE_PATTERNS = [
  ['local Windows path', /\b[A-Z]:[\\/]/i],
  ['local Unix path', /(?:^|[\s"'`(])\/(?:Users|home|root|mnt|tmp|private|var\/folders)\//i],
  ['private research codename', /regurates/i],
  ['private contact number', /217-0769/],
  ['phone number', /(?:\+\d{1,3}[ .-]?)?(?:\(\d{3}\)[ .-]?\d{3}[ .-]?\d{4}|\b\d{3}[ .-]\d{3}[ .-]\d{4}\b)/],
  ['explicit phone field', /\b(?:phone|mobile|telephone)\s*[:=]\s*[+\d(]/i],
  ['secret key', /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['credential assignment', /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[A-Za-z0-9_\-+/]{12,}/i],
  ['private-source marker', /\b(?:interview[- ]only|internal[- ]only|do not publish|owner instructions)\b/i],
  ['retracted adoption claim', /(?:1,200\+ hospitals|10 clinics)/i],
]

function assert(condition, message) {
  if (!condition) throw new Error(`Public portfolio verification failed: ${message}`)
}

function objectShape(value, required, optional, location) {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${location} must be an object`)
  const allowed = new Set([...required, ...optional])
  for (const key of Object.keys(value)) assert(allowed.has(key), `${location} has an unapproved field: ${key}`)
  for (const key of required) assert(Object.hasOwn(value, key), `${location} is missing ${key}`)
}

function text(value, location) {
  assert(typeof value === 'string' && value.trim().length > 0, `${location} must be nonempty text`)
  for (const [label, pattern] of PRIVATE_PATTERNS) assert(!pattern.test(value), `${location} contains a ${label}`)
}

function list(value, location, check, minimum = 0) {
  assert(Array.isArray(value) && value.length >= minimum, `${location} must be an array with at least ${minimum} item(s)`)
  value.forEach((item, index) => check(item, `${location}[${index}]`))
}

function publicLink(item, location, routes) {
  objectShape(item, ['label', 'url'], [], location)
  text(item.label, `${location}.label`)
  text(item.url, `${location}.url`)
  assert(!/[\s\\]/.test(item.url), `${location}.url has whitespace or a backslash`)
  assert(item.url.startsWith('/') ? !item.url.startsWith('//') : /^https?:\/\//i.test(item.url), `${location}.url must use a public HTTP(S) URL or a site route`)
  let url
  try { url = new URL(item.url, ORIGIN) } catch { throw new Error(`Public portfolio verification failed: ${location}.url is malformed`) }
  assert(['https:', 'http:'].includes(url.protocol), `${location}.url has an unsupported protocol`)
  assert(!url.username && !url.password, `${location}.url contains credentials`)
  assert(!/^(?:localhost|127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.|\[|.*\.(?:local|internal)$)/i.test(url.hostname), `${location}.url must not address a private host`)
  for (const key of url.searchParams.keys()) assert(!/^(?:key|api[_-]?key|token|access[_-]?token|secret|password|authorization)$/i.test(key), `${location}.url has a credential query parameter`)
  if (url.origin === ORIGIN) assert(routes.has(url.pathname), `${location}.url references an unknown public route`)
}

export function validatePublicContent(content) {
  const { BIO, PROJECTS, ARTICLES } = content
  objectShape(BIO, ['intro', 'paragraphs'], [], 'BIO')
  text(BIO.intro, 'BIO.intro')
  list(BIO.paragraphs, 'BIO.paragraphs', text, 1)
  assert(Array.isArray(PROJECTS) && PROJECTS.length > 0, 'PROJECTS must be a nonempty array')
  assert(Array.isArray(ARTICLES), 'ARTICLES must be an array')
  const ids = new Set()
  const slugs = new Set()
  for (const [items, key, seen] of [[PROJECTS, 'id', ids], [ARTICLES, 'slug', slugs]]) {
    for (const item of items) {
      assert(item && typeof item[key] === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item[key]), `invalid ${key}`)
      assert(!seen.has(item[key]), `duplicate ${key}: ${item[key]}`)
      seen.add(item[key])
    }
  }
  const routes = new Set(['/', '/writing', '/playground', '/work', '/about', ...[...ids].map(id => `/work/${id}`), ...[...slugs].map(slug => `/writing/${slug}`)])
  PROJECTS.forEach((project, index) => {
    const location = `PROJECTS[${index}]`
    objectShape(project, ['id', 'name', 'category', 'headline', 'summary', 'role', 'outcome', 'status', 'featured', 'technologies', 'sections', 'links'], ['demo'], location)
    for (const key of ['id', 'name', 'category', 'headline', 'summary', 'role', 'outcome', 'status']) text(project[key], `${location}.${key}`)
    assert(typeof project.featured === 'boolean', `${location}.featured must be boolean`)
    list(project.technologies, `${location}.technologies`, text, 1)
    list(project.sections, `${location}.sections`, (section, here) => {
      objectShape(section, ['title', 'body'], [], here)
      text(section.title, `${here}.title`)
      text(section.body, `${here}.body`)
    }, 1)
    list(project.links, `${location}.links`, (item, here) => publicLink(item, here, routes))
    if (project.demo !== undefined) assert(DEMOS.has(project.demo), `${location}.demo is unknown`)
  })
  ARTICLES.forEach((article, index) => {
    const location = `ARTICLES[${index}]`
    objectShape(article, ['slug', 'title', 'dek', 'topics', 'projectId', 'minutes', 'sections', 'references'], [], location)
    for (const key of ['slug', 'title', 'dek', 'projectId']) text(article[key], `${location}.${key}`)
    // The site itself is a valid subject, without adding a self-promotional project card.
    assert(ids.has(article.projectId) || article.projectId === 'portfolio', `${location}.projectId is unknown`)
    assert(Number.isInteger(article.minutes) && article.minutes > 0, `${location}.minutes must be a positive integer`)
    list(article.topics, `${location}.topics`, text, 1)
    list(article.sections, `${location}.sections`, (section, here) => {
      objectShape(section, ['heading', 'paragraphs'], ['code'], here)
      text(section.heading, `${here}.heading`)
      list(section.paragraphs, `${here}.paragraphs`, text, 1)
      if (section.code !== undefined) text(section.code, `${here}.code`)
    }, 1)
    list(article.references, `${location}.references`, (item, here) => publicLink(item, here, routes))
  })
  return { projects: PROJECTS.length, articles: ARTICLES.length }
}

export function renderPublicKnowledge(content) {
  validatePublicContent(content)
  const { BIO, PROJECTS, ARTICLES } = content
  const lines = [
    '# Muhammad Musa — public portfolio knowledge', '',
    '> Generated from the curated public biography, project notes and technical article drafts. Do not edit this generated file by hand.',
    '> This is the complete public knowledge supplied to the portfolio assistant. It is not a full résumé or a dump of the private portfolio store.', '',
    '## Answering with this material', '',
    '- Keep the stated scope, ownership, status and measurement denominators. Planned work is not shipped work; submitted pull requests are not merged releases.',
    '- The articles are new portfolio drafts. Do not invent a publication date, readership, independent review or additional personal preference.',
    '- The interactive demonstrations explain selected ideas. They are not the original product, a live reviewer panel or a new research run.',
    '- If a detail is absent, say it is not covered in the public notes. Do not infer private employment, contacts, credentials or personal circumstances.', '',
    '## Biography', '', BIO.intro, '', ...BIO.paragraphs.flatMap(paragraph => [paragraph, '']),
    '## Projects', '',
  ]
  for (const project of PROJECTS) {
    lines.push(`### ${project.name}`, '', `Public page: /work/${project.id}`, `Category: ${project.category}`, '', project.headline, '', project.summary, '', `My role: ${project.role}`, '', `Outcome: ${project.outcome}`, '', `Status: ${project.status}`, '', `Technologies: ${project.technologies.join(', ')}`, '')
    for (const section of project.sections) lines.push(`#### ${section.title}`, '', section.body, '')
    if (project.demo) lines.push(`Illustrative demo: /playground?demo=${project.demo}`, '')
    if (project.links.length) lines.push('Public sources:', ...project.links.map(link => `- ${link.label}: ${link.url}`), '')
  }
  lines.push('## Technical article drafts', '')
  for (const article of ARTICLES) {
    lines.push(`### ${article.title}`, '', `Public page: /writing/${article.slug}`, `Topics: ${article.topics.join(', ')}`, `Related subject: ${article.projectId}`, '', article.dek, '')
    for (const section of article.sections) {
      lines.push(`#### ${section.heading}`, '', ...section.paragraphs.flatMap(paragraph => [paragraph, '']))
      if (section.code) lines.push('```text', section.code, '```', '')
    }
    if (article.references.length) lines.push('Public sources:', ...article.references.map(reference => `- ${reference.label}: ${reference.url}`), '')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert(process.argv.length === 2, 'usage: node scripts/verify-public-portfolio.mjs')
  const content = await loadContent(path.join(ROOT, 'src/portfolio/content.ts'))
  const counts = validatePublicContent(content)
  const generated = await readFile(path.join(ROOT, 'content/public-portfolio-knowledge.md'), 'utf8')
  assert(generated === renderPublicKnowledge(content), 'public knowledge is stale; run npm run sync:public-knowledge')
  console.log(`Verified ${counts.projects} curated projects, ${counts.articles} article drafts and matching public-only assistant knowledge.`)
}
