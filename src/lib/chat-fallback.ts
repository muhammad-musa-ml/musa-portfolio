import type { ChatMessage, ChatSource } from './ai'
import type { RankedEntry } from '../portfolio/command-search/types'

type LocalReply = { content: string; sources: ChatSource[] }
type Rank = (query: string) => RankedEntry[]

const directoryReply = (): LocalReply => ({
  content: 'Browse the [project index](/work), [experience and skills](/about), or [email Musa](mailto:mmusa2@wisc.edu).',
  sources: [{ label: 'Projects', url: '/work' }, { label: 'Experience & skills', url: '/about' }],
})

/** Extract public passages, without synthesizing facts or claiming generation. */
export function replyFromPublicSearch(history: ChatMessage[], rank: Rank): LocalReply {
  const questions = history.filter(message => message.role === 'user').map(message => message.content.trim())
  const question = questions[questions.length - 1] ?? ''
  if (!question) return directoryReply()
  const previous = questions[questions.length - 2]
  const followUp = /\b(it|its|that|this|them|those|these)\b|^(?:tell me more|more details|go on)\b/i.test(question)
  const query = followUp && previous ? question + ' ' + previous : question
  const ranked = rank(query)
  const threshold = Math.max(4, (ranked[0]?.score ?? 0) * 0.25)
  const destinations = new Set<string>()
  const matches = ranked.filter(entry => {
    if (entry.score < threshold || destinations.has(entry.href) || !entry.href.startsWith('/')) return false
    destinations.add(entry.href)
    return true
  }).slice(0, 3)
  if (!matches.length) return directoryReply()
  return {
    content: matches.map(entry => {
      const label = entry.label.replace(/[\[\]]/g, '')
      const snippet = (entry.snippet ?? entry.detail).replace(/\s+/g, ' ').trim()
      return '- **[' + label + '](' + entry.href + ')** — “' + snippet + '”'
    }).join('\n'),
    sources: matches.map(entry => ({ label: entry.label, url: entry.href })),
  }
}

export async function localPortfolioReply(history: ChatMessage[]): Promise<LocalReply> {
  const { rankSearch } = await import('../portfolio/command-search/rank')
  return replyFromPublicSearch(history, rankSearch)
}
