import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const PUBLIC_ASSETS = Object.freeze([
  'index.html', 'style.css', 'host.css', 'app.mjs', 'presentation.mjs',
  'example.png', 'example-plan.json', 'layouts/layout-02-plan.json',
  'layouts/layout-02-alignment.json', 'layouts/layout-02.png',
]);
export const PRIVATE_FILES = Object.freeze([
  'private/service.mjs', 'private/search-worker.mjs', 'private/recognize_bridge.py',
  'private/recognize.py', 'private/app/model.mjs', 'private/app/search.mjs',
  'private/app/example.png',
]);
const API_FILES = ['bootstrap.mjs', 'replay.mjs', 'search.mjs', 'recognize.py'];
const REQUIRED = ['package.json', 'package-lock.json', 'vercel.json', 'src/main.tsx'];
const sameOrInside = (candidate, root) => {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
const excluded = name => name.split('/').some(part =>
  /^(?:\.git|\.vercel|node_modules|dist|__pycache__|\.analytics)$/.test(part) ||
  /^\.env(?:\.|$)/.test(part) || /\.local$/.test(part)) ||
  /^(?:src\/samples|public\/concepts|samples)(?:\/|$)/.test(name);

async function noSymlinks(absolute, { missingLeaf = false } = {}) {
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  const parts = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const [index, part] of parts.entries()) {
    cursor = path.join(cursor, part);
    try {
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink()) throw Error(`Symlink or junction is not allowed: ${cursor}`);
      if (index < parts.length - 1 && !stat.isDirectory()) throw Error(`Not a directory: ${cursor}`);
    } catch (error) {
      if (error.code === 'ENOENT' && missingLeaf && index === parts.length - 1) return;
      throw error;
    }
  }
}
async function ensureFile(root, name) {
  const absolute = path.resolve(root, name);
  if (!sameOrInside(absolute, root) || absolute === root) throw Error(`File escapes source root: ${name}`);
  await noSymlinks(absolute);
  if (!(await lstat(absolute)).isFile()) throw Error(`Expected a regular file: ${name}`);
  return absolute;
}
async function copy(root, name, output, destination = name) {
  const source = await ensureFile(root, name);
  const target = path.resolve(output, destination);
  if (!sameOrInside(target, output) || target === output) throw Error(`File escapes output: ${destination}`);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}
async function json(root, name) {
  return JSON.parse(await readFile(await ensureFile(root, name), 'utf8'));
}
function namespacedBrowserSource(text) {
  return text.replace(/(['"])\/api\/(bootstrap|replay|search|recognize)(?=['"])/g, '$1/api/kaiju/$2');
}

export function mergedConfig(portfolio, companion) {
  if (portfolio.outputDirectory !== 'dist') throw Error('Expected portfolio static output directory dist.');
  const config = structuredClone(portfolio);
  config.fluid = true;
  config.git = { ...config.git, deploymentEnabled: false };
  config.functions = { ...config.functions };
  for (const file of API_FILES) {
    const settings = companion.functions?.['api/' + file];
    if (!settings) throw Error(`Missing companion function configuration: ${file}`);
    config.functions['api/kaiju/' + file] = settings;
  }
  const commonHeaders = companion.headers?.find(rule => rule.source === '/(.*)')?.headers;
  if (!commonHeaders?.some(header => header.key === 'Content-Security-Policy' && header.value.includes("frame-ancestors 'self'")))
    throw Error('Companion must define its frame and asset security headers.');
  config.headers = [
    ...(config.headers || []).filter(rule => !['/kaiju/:path*', '/api/kaiju/:path*'].includes(rule.source)),
    { source: '/kaiju/:path*', headers: commonHeaders },
    { source: '/api/kaiju/:path*', headers: commonHeaders },
  ];
  let foundFallback = false;
  config.rewrites = [
    { source: '/kaiju', destination: '/kaiju/index.html' },
    { source: '/kaiju/', destination: '/kaiju/index.html' },
    ...(config.rewrites || []).filter(rule => !['/kaiju', '/kaiju/'].includes(rule.source)).map(rule => {
      if (rule.destination !== '/index.html') return rule;
      foundFallback = true;
      return { ...rule, source: '/((?!api(?:/|$)|kaiju(?:/|$)|private(?:/|$)|(?:\\.env[^/]*|\\.git|\\.vercel|server|scripts|src|node_modules)(?:/|$)|(?:package(?:-lock)?\\.json|server\\.mjs|model\\.mjs|search\\.mjs|worker\\.mjs|requirements\\.txt|vercel\\.json|engine-provenance\\.json)$).*)' };
    }),
  ];
  if (!foundFallback) throw Error('Expected one portfolio SPA fallback to constrain.');
  return config;
}

// This guard runs after the ordinary Vite build, using only the assembled release.
const outputGuard = `import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const expected = new Set(${JSON.stringify(PUBLIC_ASSETS)});
async function scan(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isSymbolicLink()) throw Error('Static symlink: ' + name);
    if (entry.isDirectory()) result.push(...await scan(path.join(directory, entry.name), name + '/'));
    else result.push(name);
  }
  return result;
}
const files = await scan('dist');
if (files.some(file => /(^|\\/)(private|api|\\.env[^/]*|\\.git)(\\/|$)/.test(file))) throw Error('Private content entered static output');
const planner = files.filter(file => file.startsWith('kaiju/')).map(file => file.slice(6));
if (planner.length !== expected.size || planner.some(file => !expected.has(file))) throw Error('Unexpected planner static assets');
for (const file of ['app.mjs', 'presentation.mjs']) {
  const source = await readFile('dist/kaiju/' + file, 'utf8');
  if (/new\\s+Worker\\b|\\bsimulate\\s*\\(|\\bclass\\s+Search\\b|from\\s+['\"][^'\"]*(model|search|worker)\\.mjs/.test(source)) throw Error('Private engine found in browser code');
  if (/['\"]\\/api\\/(?!kaiju\\/)/.test(source)) throw Error('Unnamespaced planner API');
}
console.log('Private release boundary verified: 10 public planner assets; engine stays server-side.');
`;

export async function stagePrivateRelease({ sourceRoot, kaijuRoot, output }) {
  if (![sourceRoot, kaijuRoot, output].every(value => typeof value === 'string' && path.isAbsolute(value)))
    throw Error('Source, --kaiju-root and --output must be absolute paths.');
  sourceRoot = path.resolve(sourceRoot); kaijuRoot = path.resolve(kaijuRoot); output = path.resolve(output);
  for (const root of [sourceRoot, kaijuRoot]) {
    if (sameOrInside(output, root) || sameOrInside(root, output))
      throw Error('Output must be outside, and must not contain, either source directory.');
    await noSymlinks(root);
  }
  await noSymlinks(output, { missingLeaf: true });
  try { await lstat(output); throw Error('Output already exists; choose a fresh directory.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const gitRoot = (await exec('git', ['rev-parse', '--show-toplevel'], { cwd: sourceRoot })).stdout.trim();
  if (path.relative(path.resolve(gitRoot), sourceRoot) !== '') throw Error('Source must be the curated Git repository root.');
  const untracked = (await exec('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: sourceRoot, maxBuffer: 8_000_000 })).stdout.split('\0').filter(name => name && !excluded(name));
  if (untracked.length) throw Error('Review and git-add new source files before staging: ' + untracked.join(', '));
  const tracked = (await exec('git', ['ls-files', '-z'], { cwd: sourceRoot, maxBuffer: 8_000_000 })).stdout.split('\0').filter(name => name && !excluded(name));
  for (const name of REQUIRED) if (!tracked.includes(name)) throw Error('Required tracked source is missing: ' + name);
  if (tracked.some(name => /^(?:private|api\/kaiju|public\/kaiju)(?:\/|$)/.test(name)))
    throw Error('Private planner paths must not be tracked in the public repository.');
  for (const name of tracked) await ensureFile(sourceRoot, name);
  for (const name of [...PRIVATE_FILES, ...PUBLIC_ASSETS.map(name => 'public/' + name), ...API_FILES.map(name => 'api/' + name), 'requirements.txt'])
    await ensureFile(kaijuRoot, name);
  const provenance = await json(kaijuRoot, 'engine-provenance.json');
  for (const name of ['private/app/model.mjs', 'private/app/search.mjs', 'private/recognize.py'])
    if (!/^[a-f0-9]{64}$/.test(provenance.sha256?.[name] || '')) throw Error('Missing original engine hash: ' + name);
  for (const [name, expected] of Object.entries(provenance.sha256 || {})) {
    if (!PRIVATE_FILES.includes(name)) throw Error('Unexpected provenance source: ' + name);
    const actual = createHash('sha256').update(await readFile(await ensureFile(kaijuRoot, name))).digest('hex');
    if (actual !== expected) throw Error('Original engine hash mismatch: ' + name);
  }
  for (const name of ['app.mjs', 'presentation.mjs']) {
    const text = await readFile(await ensureFile(kaijuRoot, 'public/' + name), 'utf8');
    if (/new\s+Worker\b|\bsimulate\s*\(|\bclass\s+Search\b|from\s+['"][^'"]*(model|search|worker)\.mjs/.test(text))
      throw Error('Private solver reference in public companion asset: ' + name);
  }
  const config = mergedConfig(await json(sourceRoot, 'vercel.json'), await json(kaijuRoot, 'vercel.json'));
  await mkdir(output); // Never overwrite or recursively delete an existing release.
  for (const name of tracked) await copy(sourceRoot, name, output);
  for (const name of PRIVATE_FILES) await copy(kaijuRoot, name, output);
  await copy(kaijuRoot, 'requirements.txt', output);
  for (const name of PUBLIC_ASSETS) await copy(kaijuRoot, 'public/' + name, output, 'public/kaiju/' + name);
  for (const name of ['app.mjs', 'presentation.mjs']) {
    const target = path.join(output, 'public/kaiju', name);
    await writeFile(target, namespacedBrowserSource(await readFile(target, 'utf8')));
  }
  const index = path.join(output, 'public/kaiju/index.html');
  await writeFile(index, (await readFile(index, 'utf8')).replace('<head>', '<head><base href="/kaiju/">'));
  for (const name of API_FILES) {
    await copy(kaijuRoot, 'api/' + name, output, 'api/kaiju/' + name);
    if (name.endsWith('.mjs')) {
      const target = path.join(output, 'api/kaiju', name);
      const source = await readFile(target, 'utf8');
      if (!source.includes('../private/service.mjs')) throw Error('Unexpected adapter import: ' + name);
      await writeFile(target, source.replaceAll('../private/service.mjs', '../../private/service.mjs'));
    }
  }
  await writeFile(path.join(output, 'vercel.json'), JSON.stringify(config, null, 2) + '\n');
  const pkg = await json(output, 'package.json');
  pkg.engines = { ...pkg.engines, node: '22.x' };
  pkg.scripts.postbuild = [pkg.scripts.postbuild, 'node scripts/verify-private-output.mjs'].filter(Boolean).join(' && ');
  await writeFile(path.join(output, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  await mkdir(path.join(output, 'scripts'), { recursive: true });
  await writeFile(path.join(output, 'scripts/verify-private-output.mjs'), outputGuard);
  // Explicit ignore file includes the private function payload, but never local credentials.
  await writeFile(path.join(output, '.vercelignore'), '.git\n.vercel\nnode_modules\ndist\n.env*\n*.local\n.analytics\n__pycache__\n*.pyc\n');
  return { output, portfolioFiles: tracked.length, publicPlannerAssets: PUBLIC_ASSETS.length, privateFiles: PRIVATE_FILES.length, plannerPath: '/kaiju/', apiPrefix: '/api/kaiju/' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!['--kaiju-root', '--output'].includes(args[index]) || !args[index + 1])
      throw Error('Usage: node scripts/stage-private-release.mjs --kaiju-root ABSOLUTE_HOSTED_FOLDER --output NEW_ABSOLUTE_DIRECTORY');
    options[args[index].slice(2)] = args[index + 1];
  }
  const result = await stagePrivateRelease({ sourceRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), kaijuRoot: options['kaiju-root'], output: options.output });
  console.log(JSON.stringify(result, null, 2));
}
