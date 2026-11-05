// Post-build tripwire: the strings below must never appear in any shipped
// asset — not just in what React renders, but in the raw bundle text a
// visitor can read with view-source. ("10 clinics" is deliberately NOT
// listed: the twin knowledge keeps the retracted-figures list so the model
// can correct anyone quoting the old site.)
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.resolve(here, '..', 'dist', 'assets')

const FORBIDDEN = [
  /regurates/i, // internal research codename + private repo path
  /217-0769/, // phone number — email is the public contact
  /1,200\+ hospitals/i, // retracted claim
]

let scanned = 0
const failures = []
for (const entry of await readdir(assetsDir)) {
  if (!/\.(js|css|json|html)$/.test(entry)) continue
  const text = await readFile(path.join(assetsDir, entry), 'utf8')
  scanned += 1
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) failures.push(`${entry} matches ${pattern}`)
  }
}

if (failures.length) {
  throw new Error(`Forbidden strings in shipped assets:\n  ${failures.join('\n  ')}`)
}
console.log(`Dist tripwire clean across ${scanned} assets.`)
