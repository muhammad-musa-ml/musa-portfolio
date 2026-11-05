import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://iammusa.vercel.app'
const OWNER = 'Muhammad Musa'

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const jsonForHtml = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
const paragraph = value => `<p>${escapeHtml(value)}</p>`
const routeUrl = route => `${ORIGIN}${route}`

function safeHref(value) {
  const url = new URL(value, ORIGIN)
  if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error(`Unsupported public link protocol: ${url.protocol}`)
  return escapeHtml(value)
}
const link = (href, label) => `<a href="${safeHref(href)}">${escapeHtml(label)}</a>`

// Only literal data is evaluated. Imports, function calls, getters, spreads,
// interpolated templates and executable top-level statements fail the build.
function isLiteralData(node) {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true
  if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return true
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return isLiteralData(node.expression)
  if (ts.isPrefixUnaryExpression(node)) return [ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusToken].includes(node.operator) && ts.isNumericLiteral(node.operand)
  if (ts.isArrayLiteralExpression(node)) return node.elements.every(isLiteralData)
  if (ts.isObjectLiteralExpression(node)) return node.properties.every(property => ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name) && isLiteralData(property.initializer))
  return false
}

async function loadLiteralModule(file, names) {
  const source = await readFile(file, 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  if (ast.parseDiagnostics.length) throw new Error('Portfolio content has TypeScript syntax errors.')
  const exports = new Set()
  for (const statement of ast.statements) {
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) continue
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const) || !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) throw new Error('Portfolio content must contain only exported const data and type declarations.')
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !names.includes(declaration.name.text) || !declaration.initializer || !isLiteralData(declaration.initializer)) throw new Error('Portfolio content contains executable or unsupported data.')
      exports.add(declaration.name.text)
    }
  }
  if (exports.size !== names.length) throw new Error(`Portfolio content must export ${names.join(', ')}.`)
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}

export async function loadContent(file) {
  const content = await loadLiteralModule(file, ['BIO', 'PROJECTS', 'ARTICLES'])
  if (!Array.isArray(content.PROJECTS) || !Array.isArray(content.ARTICLES) || !Array.isArray(content.BIO.paragraphs)) throw new Error('Invalid public portfolio data shape.')
  for (const [collection, key] of [[content.PROJECTS, 'id'], [content.ARTICLES, 'slug']]) {
    const seen = new Set()
    for (const item of collection) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item[key]) || seen.has(item[key])) throw new Error(`Invalid or duplicate public ${key}: ${item[key]}`)
      seen.add(item[key])
    }
  }
  return content
}

export async function loadProfile(file) {
  const names = ['PROFILE_NUMBERS', 'EXPERIENCE', 'EDUCATION', 'TOOLKIT', 'CREDENTIALS', 'PUBLICATIONS', 'PROFILE_LINKS']
  const profile = await loadLiteralModule(file, names)
  if (names.slice(0, -1).some(name => !Array.isArray(profile[name])) || !profile.PROFILE_LINKS || typeof profile.PROFILE_LINKS !== 'object' || Array.isArray(profile.PROFILE_LINKS)) throw new Error('Invalid public profile data shape.')
  for (const collection of [profile.EXPERIENCE, profile.CREDENTIALS]) {
    const seen = new Set()
    for (const item of collection) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || seen.has(item.id)) throw new Error(`Invalid or duplicate public profile id: ${item.id}`)
      seen.add(item.id)
    }
  }
  return profile
}

const FALLBACK_STYLE = `<style id="portfolio-static-style">
#root>.pf-static{min-height:100vh;background:#0b0c10;color:#f2ebdd;font:18px/1.75 system-ui,sans-serif;padding:28px max(24px,calc((100vw - 1080px)/2));cursor:auto}
.pf-static *{box-sizing:border-box}.pf-static a{color:#63e2c6;text-underline-offset:4px}.pf-static header,.pf-static footer{display:flex;gap:24px;flex-wrap:wrap;align-items:center;padding:18px 0;border-bottom:1px solid #f2ebdd30}.pf-static nav{display:flex;gap:22px;flex-wrap:wrap}.pf-static main{padding:55px 0}.pf-static h1{font-size:clamp(38px,6vw,76px);line-height:1.08;letter-spacing:-.05em;margin:0 0 28px}.pf-static h2{font-size:30px;line-height:1.2;margin:42px 0 18px}.pf-static h3{font-size:24px;line-height:1.3;margin:20px 0}.pf-static p{max-width:74ch;margin:0 0 20px;white-space:pre-line}.pf-static ul{padding-left:24px}.pf-static li{margin:10px 0}.pf-static article{padding:24px 0;border-bottom:1px solid #f2ebdd30}.pf-static .pf-static-kicker{font-size:14px;color:#ffb454}.pf-static pre{padding:20px;overflow:auto;background:#181d21;border-radius:8px;font-size:14px}.pf-static footer{font-size:15px;border-top:1px solid #f2ebdd30;border-bottom:0}.pf-static a:focus-visible{outline:2px solid #ffb454;outline-offset:5px}
</style>`

function frame(body) {
  return `<div class="pf-static"><a href="#main">Skip to content</a><header>${link('/', OWNER)}<nav aria-label="Main navigation">${link('/work', 'Work')}${link('/writing', 'Writing')}${link('/playground', 'Playground')}${link('/about', 'About')}</nav></header><main id="main">${body}</main><footer id="contact">${link('mailto:mmusa2@wisc.edu', 'Get in touch')}${link('https://github.com/muhammad-musa-ml', 'GitHub')}${link('https://www.linkedin.com/in/mmusa2/', 'LinkedIn')}${link('/Muhammad-Musa-Resume.pdf', 'Read my résumé')}</footer></div>`
}

const articlePreview = article => `<article><p class="pf-static-kicker">${escapeHtml(article.topics.join(' / '))} · ${escapeHtml(article.minutes)} min read</p><h2>${link(`/writing/${article.slug}`, article.title)}</h2>${paragraph(article.dek)}</article>`
const projectPreview = project => `<article><p class="pf-static-kicker">${escapeHtml(project.category)}</p><h3>${link(`/work/${project.id}`, project.headline)}</h3>${paragraph(project.summary)}${paragraph(project.status)}</article>`

const BUILD_MODES = [
  ['kiln', 'Live application', 'Open the actual public research library. Its public collection is a curated snapshot; private intake and editing remain local.'],
  ['lookup', 'Recorded results', 'Inspect cache-hit measurements from the replicated lookup repository. These are recorded benchmark results, not a service running in this page.'],
  ['serving', 'Recorded results', 'Compare measured throughput and time to first token across precision variants and request concurrency on one laptop GPU.'],
  ['research', 'Recorded experiment', 'Inspect the public paired attack results and the clean-query utility analysis. The page does not attack a live model.'],
  ['wumi', 'Product walkthrough', 'Explore an explanation of the product’s consent model using synthetic records. This page does not connect to WUMI or handle medical records.'],
]

function aboutBody(BIO, profile) {
  const { PROFILE_NUMBERS = [], EXPERIENCE = [], EDUCATION = [], TOOLKIT = [], CREDENTIALS = [], PUBLICATIONS = [], PROFILE_LINKS = {} } = profile
  const sections = [['story', 'Story'], ['experience', 'Experience'], ['education', 'Education'], ['publications', 'Publications'], ['toolkit', 'Toolkit'], ['certificates', 'Certificates'], ['humanity', 'Why this work']]
  return `<p class="pf-static-kicker">Experience, education &amp; the person behind the work</p><h1>A few things that shaped me.</h1>${paragraph('I’m Muhammad Musa. I build software, study how language models fail, and teach computer science. The work has taken me from Lahore to Madison, with plenty of learning between the two.')}
    <nav aria-label="On this page">${sections.map(([id, label]) => link(`/about#${id}`, label)).join(' ')}</nav>
    <section id="story"><h2>A few turning points.</h2>${BIO.paragraphs.map(paragraph).join('')}${PROFILE_NUMBERS.length ? `<dl>${PROFILE_NUMBERS.map(item => `<dt>${link(item.href, item.label)}</dt><dd>${escapeHtml(item.value)}</dd>`).join('')}</dl>` : ''}</section>
    <section id="experience"><h2>Where I’ve put it to work.</h2>${EXPERIENCE.map(item => `<article id="experience-${escapeHtml(item.id)}"><p class="pf-static-kicker">${escapeHtml(item.date)} · ${escapeHtml(item.location)}</p><h3>${escapeHtml(item.role)}</h3>${paragraph(item.organization)}${paragraph(item.summary)}<ul>${item.details.map(detail => `<li>${escapeHtml(detail)}</li>`).join('')}</ul>${item.href ? paragraphLink({ url: item.href, label: item.link || 'Related work' }) : ''}</article>`).join('')}</section>
    <section id="education"><h2>The foundations.</h2>${EDUCATION.map((item, index) => `<article id="education-${index}"><h3>${escapeHtml(item.school)}</h3>${paragraph(`${item.degree} · ${item.date}`)}${paragraph(item.detail)}${paragraph(item.result)}<h4>Selected coursework</h4><ul>${item.courses.map(course => `<li>${escapeHtml(course)}</li>`).join('')}</ul></article>`).join('')}</section>
    <section id="publications"><h2>Research, in print.</h2>${PUBLICATIONS.map((item, index) => `<article id="publication-${index}"><h3>${link(item.href, item.title)}</h3>${paragraph(`${item.venue} · ${item.format} · ${item.role}`)}${paragraph(item.detail)}${item.project ? paragraphLink({ url: item.project, label: 'Read the project notes' }) : ''}</article>`).join('')}</section>
    <section id="toolkit"><h2>The toolkit.</h2>${TOOLKIT.map((item, index) => `<article id="toolkit-${index}"><h3>${escapeHtml(item.name)}</h3>${paragraph(item.why)}<ul>${item.tools.map(tool => `<li>${escapeHtml(tool)}</li>`).join('')}</ul>${paragraphLink({ url: item.href, label: item.project })}</article>`).join('')}</section>
    <section id="certificates"><h2>Learning, with the originals.</h2>${CREDENTIALS.map(item => `<article id="credential-${escapeHtml(item.id)}"><h3>${escapeHtml(item.name)}</h3>${paragraph(`${item.issuer} · ${item.issued} · ${item.group}`)}${paragraph(item.summary)}${paragraphLink({ url: item.file, label: 'Open the original certificate' })}${item.verify ? paragraphLink({ url: item.verify, label: 'Verify with the issuer' }) : ''}</article>`).join('')}</section>
    <section id="humanity"><h2>Who is this useful for?</h2>${paragraph('A patient trying to carry their history between clinics. A student facing an unfamiliar idea. A speaker whose language is poorly represented in software.')}${paragraph('These are reasons I keep returning to healthcare, teaching, language technology and security. I like working on a system all the way through: the data, the failure case, the interface and the explanation someone else needs to trust it.')}${link('/work', 'Explore the work')}</section>
    <section><h2>Keep in touch.</h2>${Object.entries(PROFILE_LINKS).map(([label, href]) => paragraphLink({ url: href, label: label === 'resume' ? 'Read my résumé' : label === 'orcid' ? 'ORCID' : label === 'github' ? 'GitHub' : 'LinkedIn' })).join('')}</section>`
}

export function buildPages({ BIO, PROJECTS, ARTICLES }, profile = {}, { includeStudies = false } = {}) {
  const builds = BUILD_MODES.flatMap(([id, mode, scope]) => {
    const project = PROJECTS.find(item => item.id === id)
    return project ? [{ project, mode, scope }] : []
  })
  const pages = [{
    route: '/', title: `${OWNER} — ${BIO.intro}`, description: BIO.paragraphs[0], type: 'website',
    body: `<p class="pf-static-kicker">${OWNER}</p><h1>${escapeHtml(BIO.intro)}</h1>${paragraph('I build systems for the people on the other side of the screen.')}<section id="work"><h2>Ideas, put to work.</h2>${PROJECTS.filter(project => project.featured).map(projectPreview).join('')}</section><section><h2>Still curious.</h2>${PROJECTS.filter(project => !project.featured).map(projectPreview).join('')}</section><section><h2>Thinking out loud.</h2>${ARTICLES.slice(0, 3).map(articlePreview).join('')}${link('/writing', 'All the notes')}</section><section id="about"><h2>Good questions keep me going.</h2>${BIO.paragraphs.map(paragraph).join('')}</section>`,
    schema: { '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: OWNER, url: ORIGIN } },
  }, {
    route: '/work', title: `Work — ${OWNER}`, description: 'Projects and research across language-model security, healthcare software, machine learning, distributed systems and teaching.', type: 'website',
    body: `<p class="pf-static-kicker">The portfolio</p><h1>Different problems. Work worth following.</h1>${paragraph('Browse the work by the problem it addresses. Each project note explains my contribution, the technical decisions, the evidence and the limits.')}<nav aria-label="Explore the portfolio">${link('/playground', 'Try the built projects')}${link('/writing', 'Read the technical notes')}${link('/about', 'Experience and background')}</nav>${PROJECTS.map(projectPreview).join('')}`,
    schema: { '@type': 'CollectionPage', name: 'Work', hasPart: PROJECTS.map(project => ({ '@type': 'CreativeWork', name: project.name, description: project.summary, url: routeUrl(`/work/${project.id}`) })) },
  }, {
    route: '/about', title: `About — ${OWNER}`, description: 'Experience, education, publications, technical skills, certificates and the person behind the work.', type: 'website',
    body: aboutBody(BIO, profile),
    schema: { '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: OWNER, url: ORIGIN, ...(profile.PROFILE_LINKS ? { sameAs: Object.values(profile.PROFILE_LINKS).filter(href => href.startsWith('https://')) } : {}) } },
  }, {
    route: '/writing', title: `Writing — ${OWNER}`, description: 'Things I’ve built, ideas I’ve tested, and the decisions I’d make differently. The technical details, with the reasons behind them.', type: 'website',
    body: `<p class="pf-static-kicker">Notes from the work</p><h1>A question. Then a closer look.</h1>${paragraph('Things I’ve built, ideas I’ve tested, and the decisions I’d make differently. The technical details, with the reasons behind them.')}${ARTICLES.map(articlePreview).join('')}`,
    schema: { '@type': 'CollectionPage', name: 'Writing', hasPart: ARTICLES.map(article => ({ '@type': 'BlogPosting', headline: article.title, url: routeUrl(`/writing/${article.slug}`) })) },
  }, {
    route: '/playground', title: `Playground — ${OWNER}`, description: 'Explore things I built: the live Kiln library, recorded systems benchmarks, research results, and a walkthrough of WUMI Health.', type: 'website',
    body: `<p class="pf-static-kicker">The playground</p><h1>Open it. Try it. Inspect it.</h1>${paragraph('A way into things I’ve built: a live research library, measurements from my systems, and walkthroughs of the decisions inside my products.')}<section><h2>Explore my built projects.</h2>${builds.map(({ project, mode, scope }) => `<article><p class="pf-static-kicker">${escapeHtml(mode)}</p><h3>${link(`/playground?build=${project.id}`, project.name)}</h3>${paragraph(project.summary)}${paragraph(scope)}${project.links.map(paragraphLink).join('')}${paragraphLink({ url: `/work/${project.id}`, label: 'Read the project notes' })}</article>`).join('')}</section><section><h2>The measurement stays with its source.</h2>${paragraph('The interactive views load with JavaScript. Recorded results remain measurements from their stated setups; changing a chart control does not run a new benchmark. Product walkthroughs illustrate documented decisions and are not the production applications.')}${paragraphLink({ url: 'https://github.com/muhammad-musa-ml/replicated-lookup-service/blob/main/bench/results/summary.md', label: 'Replicated lookup: original measurement tables' })}${paragraphLink({ url: 'https://github.com/muhammad-musa-ml/vllm-serving-bench/blob/main/results/summary.md', label: 'Small-GPU serving: original measurement tables' })}</section>`,
    schema: { '@type': 'CollectionPage', name: 'Playground', hasPart: builds.map(({ project, mode }) => ({ '@type': 'WebPage', name: project.name, description: mode, url: routeUrl(`/playground?build=${project.id}`) })) },
  }, {
    route: '/playground/experiments', title: `Interface experiments — ${OWNER}`, description: 'Preserved interface studies in pathfinding, learning and project explanations. These are educational experiments, separate from the built-project playground.', type: 'website',
    body: `${link('/playground', '← The built-project playground')}<p class="pf-static-kicker">Preserved interface studies</p><h1>Experiments you can change.</h1>${paragraph('Earlier interactive studies remain available here. These are educational browser experiments, separate from the projects in my portfolio.')}<ul><li>${link('/playground/pathfinding', 'Find a way through')} — Compare A* and Dijkstra on a grid you can edit.</li><li>${link('/playground/learning', 'Teach a boundary')} — Place points and inspect binary logistic regression.</li></ul><section><h2>Project explanations.</h2>${paragraph('These three demonstrations retain their original scope: synthetic health records, recorded research results, and an illustrative source trail.')}<ul>${PROJECTS.filter(project => project.demo).map(project => `<li>${link(`/playground/experiments?demo=${project.demo}`, project.name)} — ${escapeHtml(project.summary)} ${link(`/work/${project.id}`, 'Read the project notes')}</li>`).join('')}</ul></section>`,
    schema: { '@type': 'CollectionPage', name: 'Interface experiments', hasPart: [{ '@type': 'WebPage', name: 'Find a way through', url: routeUrl('/playground/pathfinding') }, { '@type': 'WebPage', name: 'Teach a boundary', url: routeUrl('/playground/learning') }] },
  }, {
    route: '/playground/pathfinding', title: `Find a way through — ${OWNER}`, description: 'Edit a grid and compare A* with Dijkstra. Follow explored cells, the search frontier and the shortest route, including cases with no path.', type: 'website',
    body: `${link('/playground/experiments', '← All experiments')}<p class="pf-static-kicker">Pathfinding</p><h1>Find a way through.</h1>${paragraph('This small interface experiment makes a search algorithm’s decisions visible. Place walls, move the start or goal, and compare A* with Dijkstra on the same problem.')}<section><h2>Change the problem.</h2>${paragraph('The grid has 18 columns and 12 rows. Movement is horizontal or vertical, and each move costs one. Start with an empty grid, scattered obstacles, a maze or a blocked divider. Edit cells with the pointer or the keyboard.')}<h2>Follow the search.</h2>${paragraph('Run, pause or take one step at a time. The display distinguishes the frontier, explored cells and the final route. A* uses Manhattan distance to estimate the remaining cost; Dijkstra orders its search by the cost accumulated so far. Both find a shortest route under these grid rules, but they can explore different numbers of cells.')}<h2>A blocked route is a result too.</h2>${paragraph('When no route connects the start and goal, the experiment reports that outcome. Explored-cell counts, frontier counts and route length describe the current run. They are not timing benchmarks or claims that one algorithm is faster on every problem.')}</section><section><h2>Try the working version.</h2>${paragraph('The simulation runs in your browser when JavaScript is enabled. The controls support pointer editing and keyboard navigation. Your grid is an experiment, not a real navigation system.')}${paragraphLink({ url: '/playground/learning', label: 'Next experiment: Teach a boundary' })}</section>`,
    schema: { '@type': 'WebPage', name: 'Find a way through', description: 'An editable grid simulation comparing A* and Dijkstra pathfinding.', about: [{ '@type': 'Thing', name: 'A* search algorithm' }, { '@type': 'Thing', name: 'Dijkstra’s algorithm' }], isPartOf: { '@type': 'CollectionPage', name: 'Interface experiments', url: routeUrl('/playground/experiments') } },
  }, {
    route: '/playground/learning', title: `Teach a boundary — ${OWNER}`, description: 'Place two classes of points and train binary logistic regression. Inspect probabilities, loss and the limits of a linear boundary on XOR.', type: 'website',
    body: `${link('/playground/experiments', '← All experiments')}<p class="pf-static-kicker">Learning from points</p><h1>Teach a boundary.</h1>${paragraph('This interface experiment uses a deliberately small model: two input coordinates, two classes and one straight decision boundary. Edit the examples and watch the model learn from the points you give it.')}<section><h2>Choose the evidence.</h2>${paragraph('Start with separable points, noisy labels or a symmetric XOR pattern. Select a class and add points using the plot or coordinate controls. The editable points are the training data.')}<h2>Train an actual model.</h2>${paragraph('Binary logistic regression maps w1 × x + w2 × y + b through a sigmoid to produce a class probability. Full-batch gradient descent updates the weights and bias. You can train, pause, take one step, reset, and adjust the learning rate or L2 weight penalty.')}<h2>Read the limits beside the result.</h2>${paragraph('The view shows probability regions, the linear decision boundary, binary cross-entropy, the optimization objective and accuracy on the current training points. Training accuracy is not performance on unseen examples. A single line cannot perfectly separate the XOR classes; more training does not remove that limitation.')}</section><section><h2>Try the working version.</h2>${paragraph('The model trains in your browser when JavaScript is enabled. It is a small educational simulation, with no remote model call and no claim of a production classifier.')}${paragraphLink({ url: '/playground/pathfinding', label: 'Next experiment: Find a way through' })}</section>`,
    schema: { '@type': 'WebPage', name: 'Teach a boundary', description: 'An editable two-dimensional binary logistic regression experiment with an explicit linear XOR limitation.', about: [{ '@type': 'Thing', name: 'Logistic regression' }, { '@type': 'Thing', name: 'Gradient descent' }], isPartOf: { '@type': 'CollectionPage', name: 'Interface experiments', url: routeUrl('/playground/experiments') } },
  }]
  for (const project of PROJECTS) pages.push({
    route: `/work/${project.id}`, title: `${project.name} — ${OWNER}`, description: project.summary, type: 'website',
    body: `${link('/work', '← All work')}<p class="pf-static-kicker">${escapeHtml(project.category)}</p><h1>${escapeHtml(project.headline)}</h1>${paragraph(project.summary)}<section id="project-overview"><h2>My role</h2>${paragraph(project.role)}<h2>Where it stands</h2>${paragraph(project.status)}<h2 id="project-outcome">What changed.</h2>${paragraph(project.outcome)}</section>${project.sections.map((section, index) => `<section id="section-${index}"><h2>${escapeHtml(section.title)}</h2>${paragraph(section.body)}</section>`).join('')}<section><h2>The stack</h2><ul>${project.technologies.map(technology => `<li>${escapeHtml(technology)}</li>`).join('')}</ul>${project.links.map(item => paragraphLink(item)).join('')}</section>${BUILD_MODES.some(([id]) => id === project.id) ? paragraphLink({ url: `/playground?build=${project.id}`, label: 'Open in the playground' }) : ''}`,
    schema: { '@type': 'WebPage', name: project.name, about: { '@type': 'CreativeWork', name: project.name, description: project.summary } },
  })
  for (const article of ARTICLES) pages.push({
    route: `/writing/${article.slug}`, title: `${article.title} — ${OWNER}`, description: article.dek, type: 'article',
    body: `${link('/writing', '← All writing')}<p class="pf-static-kicker">${escapeHtml(article.topics.join(' / '))} · ${escapeHtml(article.minutes)} min read</p><h1>${escapeHtml(article.title)}</h1>${paragraph(article.dek)}${paragraph(OWNER)}${article.sections.map((section, index) => `<section id="section-${index}"><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map(paragraph).join('')}${section.code ? `<pre><code>${escapeHtml(section.code)}</code></pre>` : ''}</section>`).join('')}<section id="sources"><h2>Sources & further reading</h2><ul>${article.references.map(reference => `<li>${link(reference.url, reference.label)}</li>`).join('')}</ul></section>${PROJECTS.some(project => project.id === article.projectId) ? paragraphLink({ url: `/work/${article.projectId}`, label: 'Read the project notes' }) : ''}`,
    schema: { '@type': 'BlogPosting', headline: article.title, description: article.dek, author: { '@type': 'Person', name: OWNER, url: ORIGIN }, mainEntityOfPage: routeUrl(`/writing/${article.slug}`), keywords: article.topics },
  })
  return includeStudies ? pages : pages.filter(page => !['/playground/experiments', '/playground/pathfinding', '/playground/learning'].includes(page.route))
}

function paragraphLink(item) { return `<p>${link(item.url, item.label)}</p>` }

export function renderPage(shell, page) {
  // A script generated from a fresh Vite build is the input, not an SSR render.
  if (!/<div\s+id=["']root["']\s*>\s*<\/div>/.test(shell)) throw new Error('Expected the empty Vite #root. Run Vite before prerendering again.')
  let html = shell.replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi, '')
  const url = routeUrl(page.route)
  const schema = { '@context': 'https://schema.org', ...page.schema, url }
  const meta = `<title>${escapeHtml(page.title)}</title><meta name="description" content="${escapeHtml(page.description)}"><link rel="canonical" href="${escapeHtml(url)}"><meta property="og:title" content="${escapeHtml(page.title)}"><meta property="og:description" content="${escapeHtml(page.description)}"><meta property="og:url" content="${escapeHtml(url)}"><meta property="og:type" content="${page.type}"><meta property="og:site_name" content="${OWNER}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeHtml(page.title)}"><meta name="twitter:description" content="${escapeHtml(page.description)}"><script type="application/ld+json">${jsonForHtml(schema)}</script>${FALLBACK_STYLE}`
  html = html.replace('</head>', `${meta}\n</head>`)
  return html.replace(/<div\s+id=["']root["']\s*>\s*<\/div>/, () => `<div id="root">${frame(page.body)}</div>`)
}

export async function prerender(distDirectory = path.join(ROOT, 'dist')) {
  const dist = path.resolve(distDirectory)
  const shell = await readFile(path.join(dist, 'index.html'), 'utf8')
  const content = await loadContent(path.join(ROOT, 'src/portfolio/content.ts'))
  const profile = await loadProfile(path.join(ROOT, 'src/portfolio/profile-details.ts'))
  const pages = buildPages(content, profile)
  // Render and validate every page before writing any output.
  const output = pages.map(page => ({ page, html: renderPage(shell, page) }))
  for (const { page, html } of output) {
    const directory = page.route === '/' ? dist : path.join(dist, page.route.slice(1))
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, 'index.html'), html, 'utf8')
  }
  await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>${escapeHtml(routeUrl(page.route))}</loc></url>`).join('')}</urlset>\n`, 'utf8')
  await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`, 'utf8')
  return pages.map(page => page.route)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  if (args.length && (args.length !== 2 || args[0] !== '--dist' || !args[1])) throw new Error('Usage: node scripts/prerender-portfolio.mjs [--dist DIRECTORY]')
  const routes = await prerender(args[1] || path.join(ROOT, 'dist'))
  console.log(`Prepared static public content and metadata for ${routes.length} routes, plus sitemap.xml and robots.txt. React takes over when JavaScript loads.`)
}
