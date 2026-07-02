import type { ReactNode } from 'react'

// Featherweight markdown renderer for chat bubbles: bold, italics, inline
// code, links, bullet lists, paragraphs. No dependency, no HTML injection.

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  // tokenize: **bold**, *italic*/_italic_, `code`, [label](url)
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[2]) out.push(<strong key={`${keyBase}-${k++}`}>{m[2]}</strong>)
    else if (m[4]) out.push(<em key={`${keyBase}-${k++}`}>{m[4]}</em>)
    else if (m[6]) out.push(<em key={`${keyBase}-${k++}`}>{m[6]}</em>)
    else if (m[8]) out.push(<code key={`${keyBase}-${k++}`}>{m[8]}</code>)
    else if (m[10] && m[11])
      out.push(
        <a key={`${keyBase}-${k++}`} href={m[11]} target="_blank" rel="noreferrer">
          {m[10]}
        </a>
      )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function renderMarkdown(md: string): ReactNode {
  const blocks = md.split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0)
        if (lines.length === 0) return null
        const isList = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))
        if (isList) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''), `${bi}-${li}`)}</li>
              ))}
            </ul>
          )
        }
        // strip markdown headers into bold lead-ins
        const clean = lines.map((l) => l.replace(/^#{1,4}\s+/, '')).join(' ')
        return <p key={bi}>{renderInline(clean, `${bi}`)}</p>
      })}
    </>
  )
}
