import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadContent } from './prerender-portfolio.mjs'
import { renderPublicKnowledge, validatePublicContent } from './verify-public-portfolio.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function syncPublicKnowledge({ dryRun = false } = {}) {
  // This exporter deliberately has no dependency on raw portfolio, profile,
  // interview notes, historical sample snapshots or filesystem provenance.
  const content = await loadContent(path.join(ROOT, 'src/portfolio/content.ts'))
  const counts = validatePublicContent(content)
  const output = renderPublicKnowledge(content)
  const destination = path.join(ROOT, 'content/public-portfolio-knowledge.md')
  let previous
  try { previous = await readFile(destination, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!dryRun && previous !== output) await writeFile(destination, output, 'utf8')
  console.log(`${dryRun ? 'Validated' : previous === output ? 'Kept' : 'Generated'} public-only knowledge for ${counts.projects} projects and ${counts.articles} article drafts (${Buffer.byteLength(output)} bytes).`)
  return { ...counts, changed: previous !== output, destination }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  if (args.length > 1 || (args.length === 1 && args[0] !== '--dry-run')) throw new Error('Usage: node scripts/sync-public-knowledge.mjs [--dry-run]')
  await syncPublicKnowledge({ dryRun: args.includes('--dry-run') })
}
