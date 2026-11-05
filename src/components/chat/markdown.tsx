import type { MouseEvent, ReactNode } from 'react'

type MarkdownOptions = { onNavigate?: (href: string) => void }
type SafeHref = { href: string; kind: 'internal' | 'external' | 'email' }

// React escapes all text. Only this allowlist can turn text into an active link.
export function safeHref(raw: string): SafeHref | undefined {
  const href = raw.trim()
  if (!href || /[\s\\<>"'\u0000-\u001f\u007f]/.test(href)) return
  let decoded: string
  try { decoded = decodeURIComponent(href) } catch { return }
  if (/[\u0000-\u001f\u007f\\]/.test(decoded)) return
  if (href.startsWith('/') && !decoded.startsWith('//')) return { href, kind: 'internal' }
  if (/^mailto:[^?@]+@[^?@]+\.[^?@]+$/i.test(href)) return { href, kind: 'email' }
  try {
    if (!/^https:\/\//i.test(href)) return
    const url = new URL(href)
    if (url.protocol === 'https:' && !url.username && !url.password) return { href, kind: 'external' }
  } catch { /* Unsupported schemes and malformed URLs stay plain text. */ }
}

export function ChatLink({
  href, children, onNavigate, className,
}: MarkdownOptions & { href: string; children: ReactNode; className?: string }) {
  const safe = safeHref(href)
  if (!safe) return <>{children}</>
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (safe.kind !== 'internal' || !onNavigate || event.defaultPrevented ||
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(safe.href)
  }
  return (
    <a href={safe.href} className={className} onClick={onClick}
      target={safe.kind === 'external' ? '_blank' : undefined}
      rel={safe.kind === 'external' ? 'noopener noreferrer' : undefined}>
      {children}
    </a>
  )
}

function renderInline(text: string, keyBase: string, options: MarkdownOptions, depth = 0, allowLinks = true): ReactNode[] {
  if (depth > 8) return [text]
  const out: ReactNode[] = []
  // Links are consumed as a unit, so unsafe destinations cannot be autolinked.
  // A balanced pair of URL parentheses covers common documentation URLs.
  const tokens = /(`[^`]*`|\[[^\]]+\]\((?:[^()\s]|\([^()]*\))*\)|\*\*[\s\S]+?\*\*|\*[^*\n]+\*|_[^_\n]+_|<[^>\n]*>|https:\/\/[^\s<>"']+)/g
  let last = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = tokens.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    const key = keyBase + '-' + index++
    const inline = (value: string, links = allowLinks) => renderInline(value, key, options, depth + 1, links)
    if (token.startsWith('`')) out.push(<code key={key}>{token.slice(1, -1)}</code>)
    else if (token.startsWith('**')) out.push(<strong key={key}>{inline(token.slice(2, -2))}</strong>)
    else if (token.startsWith('*') || token.startsWith('_')) out.push(<em key={key}>{inline(token.slice(1, -1))}</em>)
    else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([\s\S]*)\)$/.exec(token)!
      out.push(allowLinks && safeHref(link[2])
        ? <ChatLink key={key} href={link[2]} onNavigate={options.onNavigate}>{inline(link[1], false)}</ChatLink>
        : token)
    } else if (token.startsWith('https://') && allowLinks) {
      let url = token.replace(/[.,;:!?]+$/, '')
      // Sentence punctuation is not part of a bare URL. Balanced URL
      // parentheses remain intact, e.g. /wiki/Function_(mathematics).
      while (url.endsWith(')') && (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0)) url = url.slice(0, -1)
      url = url.replace(/[\]}]+$/, '')
      out.push(safeHref(url)
        ? <ChatLink key={key} href={url} onNavigate={options.onNavigate}>{url}</ChatLink>
        : url)
      if (url.length < token.length) out.push(token.slice(url.length))
    } else out.push(token)
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function renderMarkdown(md: string, options: MarkdownOptions = {}): ReactNode {
  // Group consecutive list items even when a model omits the blank line
  // between its introduction and list.
  const blocks: { kind: 'paragraph' | 'list'; lines: string[] }[] = []
  let current: typeof blocks[number] | undefined
  for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim()) { current = undefined; continue }
    const isList = /^\s*([-*•]|\d+\.)\s+/.test(line)
    const kind = isList ? 'list' : 'paragraph'
    if (!current || current.kind !== kind) {
      current = { kind, lines: [] }
      blocks.push(current)
    }
    current.lines.push(line)
  }
  return <>{blocks.map((block, bi) => block.kind === 'list'
    ? <ul key={bi}>{block.lines.map((line, li) =>
      <li key={li}>{renderInline(line.replace(/^\s*([-*•]|\d+\.)\s+/, ''), bi + '-' + li, options)}</li>)}</ul>
    : <p key={bi}>{renderInline(block.lines.map(line => line.replace(/^#{1,6}\s+/, '')).join(' '), String(bi), options)}</p>
  )}</>
}
