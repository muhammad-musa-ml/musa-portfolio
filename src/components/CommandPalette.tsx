import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { profile } from '../lib/profile'
import { scrollToId, scrollToTop } from '../lib/scroll'
import { getCursorMode, setCursorMode, type CursorMode } from '../lib/cursorMode'
import '../styles/palette.css'

type Cmd = {
  id: string
  label: string
  hint: string
  group: 'Navigate' | 'Ask' | 'Connect' | 'Cursor'
  keywords?: string
  kbd?: string
  run: () => void
}

export default function CommandPalette({
  onClose,
  onAskTwin,
}: {
  onClose: () => void
  onAskTwin: (prefill?: string) => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Cmd[]>(() => {
    const go = (id: string, label: string, hint: string, kbd?: string): Cmd => ({
      id: 'go-' + id,
      label,
      hint,
      kbd,
      group: 'Navigate',
      run: () => {
        onClose()
        // defer one tick: closing restarts Lenis, and lenis.start() resets
        // any in-flight scroll — starting ours after the restart survives
        window.setTimeout(() => {
          if (id === 'top') scrollToTop()
          else scrollToId(id)
        }, 0)
      },
    })
    const list: Cmd[] = [
      go('top', 'Top / Hero', 'home'),
      go('journey', 'The Journey', 'timeline', '1'),
      go('experience', 'Experience', 'work', '2'),
      go('toolkit', 'The Toolkit', 'skills', '3'),
      go('projects', 'Projects', 'build', '4'),
      go('certificates', 'Certificates', 'proof', '5'),
      go('humanity', 'AI for Humanity', 'why', '6'),
      go('contact', 'Get in touch', 'footer', '7'),
      {
        id: 'ask',
        label: 'Ask my AI twin…',
        hint: 'chat',
        kbd: '/',
        group: 'Ask',
        keywords: 'question chat ai twin talk',
        run: () => {
          onClose()
          onAskTwin()
        },
      },
    ]
    if (profile.resume_pdf) {
      list.push({
        id: 'resume',
        label: 'Download résumé (PDF)',
        hint: 'file',
        group: 'Connect',
        keywords: 'cv resume download pdf',
        run: () => {
          onClose()
          const a = document.createElement('a')
          a.href = profile.resume_pdf as string
          a.download = ''
          a.click()
        },
      })
    }
    // cursor picker — reticle is the house default
    const cursor = (m: CursorMode, label: string): Cmd => ({
      id: 'cursor-' + m,
      label: getCursorMode() === m ? `${label} · active` : label,
      hint: 'cursor',
      group: 'Cursor',
      keywords: 'cursor pointer mouse reticle dot system',
      run: () => {
        setCursorMode(m)
        onClose()
      },
    })
    // cursor options lead the list, per the owner's taste
    list.unshift(
      cursor('reticle', 'Cursor: lock-on reticle'),
      cursor('dot', 'Cursor: just a dot'),
      cursor('system', 'Cursor: system default')
    )
    const link = (id: string, label: string, url: string | null | undefined, kw: string): Cmd | null =>
      url
        ? {
            id,
            label,
            hint: 'open ↗',
            group: 'Connect',
            keywords: kw,
            run: () => {
              onClose()
              window.open(url, id === 'email' ? '_self' : '_blank', 'noopener,noreferrer')
            },
          }
        : null
    ;[
      link('email', 'Email Muhammad', profile.email ? `mailto:${profile.email}` : null, 'contact mail reach'),
      link('linkedin', 'LinkedIn', profile.linkedin, 'social linkedin connect'),
      link('github', 'GitHub', profile.github, 'code repos github'),
      link('orcid', 'ORCID (publications)', profile.orcid, 'research papers orcid publications'),
    ].forEach((c) => c && list.push(c))
    return list
  }, [onClose, onAskTwin])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return commands
    const score = (c: Cmd) => {
      const hay = (c.label + ' ' + (c.keywords || '') + ' ' + c.hint).toLowerCase()
      if (hay.includes(s)) return 2
      // subsequence match
      let i = 0
      for (const ch of hay) if (ch === s[i]) i++
      return i === s.length ? 1 : 0
    }
    return commands.map((c) => [c, score(c)] as const).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [q, commands])

  // "Ask twin" fallback when the query looks like a real question
  const askFallback = q.trim().length >= 4 && !filtered.some((c) => c.group === 'Ask' && c.label.toLowerCase().includes(q.trim().toLowerCase()))
  const rows: (Cmd | { ask: true })[] = askFallback
    ? [...filtered, { ask: true } as const]
    : filtered

  useEffect(() => {
    setQ('')
    setActive(0)
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => setActive(0), [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, rows.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const row = rows[active]
        if (!row) return
        if ('ask' in row) onAskTwin(q.trim())
        else row.run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, active, q, onAskTwin])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <motion.div
      className="pal__backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="pal__window"
        role="dialog"
        aria-label="Command palette"
        initial={{ opacity: 0, y: -14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pal__inputrow">
          <span className="pal__prompt" aria-hidden>⌘</span>
          <input
            ref={inputRef}
            className="pal__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump anywhere, or ask my AI twin a question…"
            aria-label="Command or question"
          />
          <kbd className="pal__esc">esc</kbd>
        </div>
        <div className="pal__list" ref={listRef} data-lenis-prevent>
          {rows.length === 0 && <div className="pal__empty">No matches — try “projects” or a question.</div>}
          {rows.map((row, i) =>
            'ask' in row ? (
              <button
                key="ask-fallback"
                data-idx={i}
                className={`pal__row pal__row--ask ${i === active ? 'is-active' : ''}`}
                onMouseMove={() => setActive(i)}
                onClick={() => onAskTwin(q.trim())}
                data-cursor="hover"
              >
                <span className="pal__rowicon">✦</span>
                <span className="pal__rowlabel">
                  Ask the AI twin: <em>“{q.trim()}”</em>
                </span>
                <span className="pal__rowgroup mono-label">enter ↵</span>
              </button>
            ) : (
              <button
                key={row.id}
                data-idx={i}
                className={`pal__row ${i === active ? 'is-active' : ''}`}
                onMouseMove={() => setActive(i)}
                onClick={row.run}
                data-cursor="hover"
              >
                <span className="pal__rowicon" aria-hidden>{iconFor(row)}</span>
                <span className="pal__rowlabel">{row.label}</span>
                {row.kbd && <kbd className="pal__kbd">{row.kbd}</kbd>}
                <span className="pal__rowgroup mono-label">{row.hint}</span>
              </button>
            )
          )}
        </div>
        <div className="pal__foot mono-label">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>1–5 jump · / twin</span>
          <span>esc close</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

function iconFor(c: Cmd): string {
  if (c.group === 'Navigate') return '→'
  if (c.group === 'Ask') return '✦'
  if (c.group === 'Cursor') return '✛'
  if (c.id === 'resume') return '⤓'
  return '↗'
}
