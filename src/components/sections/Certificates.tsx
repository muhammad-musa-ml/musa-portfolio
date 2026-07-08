import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { profile } from '../../lib/profile'
import type { Certificate, CertificateGroup } from '../../lib/profile'
import { scrollPageBy } from '../../lib/scroll'
import { MOTION_OFF } from '../../lib/motionEnv'
import { Reveal, SectionHeader } from '../ui'

/* ————— search: graded scoring over names, issuers, tags, summaries ————— */

const ALIASES: Record<string, string> = {
  ml: 'machine learning',
  ai: 'anthropic',
  claude: 'anthropic',
  gpt: 'llm',
  py: 'python',
  stats: 'statistics',
  prob: 'probability',
  mobile: 'android',
  app: 'android',
  contest: 'coding contest',
  hackathon: 'coding contest',
  competition: 'coding contest',
  seeds: 'seeds of peace',
  peace: 'seeds of peace',
  volunteering: 'community',
  duke: 'coursera',
  google: 'kaggle',
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
  return dp[a.length][b.length]
}

function expandQuery(q: string): string[] {
  const raw = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const out = new Set<string>()
  for (const t of raw) {
    out.add(t)
    if (ALIASES[t]) out.add(ALIASES[t])
  }
  const whole = q.toLowerCase().trim()
  if (ALIASES[whole]) out.add(ALIASES[whole])
  return [...out]
}

function scoreCert(c: Certificate, terms: string[]): number {
  const name = c.name.toLowerCase()
  const issuer = c.issuer.toLowerCase()
  const tags = c.tags.map((t) => t.toLowerCase())
  const summary = c.summary.toLowerCase()
  let best = 0
  for (const t of terms) {
    if (t.length < 2) {
      // single-character queries ("r") match exact tags only
      if (tags.includes(t)) best = Math.max(best, 60)
      continue
    }
    if (name.includes(t)) best = Math.max(best, 70)
    else if (issuer.includes(t)) best = Math.max(best, 60)
    else if (tags.includes(t)) best = Math.max(best, 60)
    else if (tags.some((tag) => tag.includes(t) || (t.length > 3 && tag.length > 2 && t.includes(tag))))
      best = Math.max(best, 45)
    else if (summary.includes(t)) best = Math.max(best, 25)
    else {
      const words = name.split(/[^a-z0-9]+/).concat(tags.flatMap((x) => x.split(' ')), issuer.split(/[^a-z0-9]+/))
      const tol = t.length > 5 ? 2 : 1
      if (words.some((w) => w.length > 3 && editDistance(w, t) <= tol)) best = Math.max(best, 20)
    }
  }
  return best
}

/* ————— section: horizontal rail of groups × vertical faati piles ————— */

export default function Certificates() {
  const groups = useMemo(() => profile.certificate_groups ?? [], [])
  const allCount = useMemo(() => groups.reduce((n, g) => n + g.certs.length, 0), [groups])
  const [q, setQ] = useState('')
  // flow (default): one flat gallery drifting across the screen, toolkit-style;
  // stacks: the manual rail of group piles. Motion-off visitors get stacks only.
  const [mode, setMode] = useState<'flow' | 'stacks'>(MOTION_OFF ? 'stacks' : 'flow')
  const railRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)

  const terms = useMemo(() => expandQuery(q), [q])
  const visible = useMemo(() => {
    if (!q.trim()) return groups.map((g) => ({ group: g, certs: g.certs }))
    return groups
      .map((g) => ({ group: g, certs: g.certs.filter((c) => scoreCert(c, terms) > 0) }))
      .filter((v) => v.certs.length > 0)
  }, [groups, q, terms])
  const visibleCount = visible.reduce((n, v) => n + v.certs.length, 0)
  const flowCerts = useMemo(() => visible.flatMap((v) => v.certs), [visible])

  /* drag-to-scroll with axis intent: sideways drags drive the rail,
     vertical drags are released to the piles. No wheel hijacking at all —
     vertical wheel belongs to the pile under the cursor, horizontal input
     (trackpad deltaX, shift+wheel) reaches the rail natively. */
  useEffect(() => {
    const el = railRef.current
    if (!el) return
    let dragging = false
    let moved = false
    let startX = 0
    let startY = 0
    let startLeft = 0
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      if ((e.target as HTMLElement).closest?.('a, button, input')) return
      dragging = true
      moved = false
      startX = e.clientX
      startY = e.clientY
      startLeft = el.scrollLeft
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!moved) {
        if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) {
          dragging = false // vertical intent — not the rail's business
          return
        }
        if (Math.abs(dx) > 6) {
          moved = true
          el.classList.add('is-dragging')
        }
      }
      if (moved) el.scrollLeft = startLeft - dx
    }
    const up = () => {
      dragging = false
      el.classList.remove('is-dragging')
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  const onRailScroll = () => {
    const el = railRef.current
    const fill = fillRef.current
    if (!el || !fill) return
    const max = el.scrollWidth - el.clientWidth
    fill.style.width = max > 0 ? `${(el.scrollLeft / max) * 100}%` : '0%'
  }

  const nudge = (dir: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(500, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <section className="section" id="certificates">
      <SectionHeader
        index="05"
        kicker="certificates"
        title={
          <>
            Receipts for the <em style={{ color: 'var(--amber)' }}>learning.</em>
          </>
        }
      />

      <Reveal>
        <div className="certs__controls">
          <div className="certs__searchrow">
            <span className="certs__searchicon" aria-hidden>
              ⌕
            </span>
            <input
              className="certs__search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search certificates — try “anthropic”, “python”, “ieee”…"
              aria-label="Search certificates"
            />
            {q && (
              <button className="certs__clear" onClick={() => setQ('')} aria-label="Clear search" data-cursor="hover">
                ✕
              </button>
            )}
          </div>
          <span className="certs__count mono-label">
            {visibleCount} / {allCount}
          </span>
          {!MOTION_OFF && (
            <button
              className="certs__mode"
              onClick={() => setMode((m) => (m === 'flow' ? 'stacks' : 'flow'))}
              data-cursor="hover"
            >
              {mode === 'flow' ? '⏸ stop scroll · browse the stacks' : '▶ back to the flow'}
            </button>
          )}
          {mode === 'stacks' && (
            <div className="certs__arrows">
              <button className="certs__arrow" onClick={() => nudge(-1)} aria-label="Scroll certificates left" data-cursor="hover">
                ←
              </button>
              <button className="certs__arrow" onClick={() => nudge(1)} aria-label="Scroll certificates right" data-cursor="hover">
                →
              </button>
            </div>
          )}
        </div>
      </Reveal>

      {mode === 'flow' ? (
        <Reveal>
          {flowCerts.length === 0 ? (
            <p className="certs__empty">
              nothing matches “{q}” — try “anthropic”, “python”, or “statistics”
            </p>
          ) : q.trim() ? (
            /* searching: matches hold still instead of drifting away from the cursor */
            <div className="certflow__results">
              {flowCerts.map((c) => (
                <FlowCard key={c.id} cert={c} />
              ))}
            </div>
          ) : (
            <div className="certflow">
              <div
                className="certflow__track"
                style={{ animationDuration: `${flowCerts.length * 7}s` }}
              >
                {[...flowCerts, ...flowCerts].map((c, i) => (
                  <FlowCard key={`${c.id}-${i}`} cert={c} clone={i >= flowCerts.length} />
                ))}
              </div>
            </div>
          )}
        </Reveal>
      ) : (
        <Reveal>
          <div className="certs__railwrap">
            <div className="certs__rail" ref={railRef} onScroll={onRailScroll} data-lenis-prevent>
              <AnimatePresence mode="popLayout">
                {visible.map(({ group, certs }) => (
                  <motion.div
                    key={group.id}
                    className="certs__item"
                    layout="position"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 14 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <GroupColumn group={group} certs={certs} onTag={setQ} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {visible.length === 0 && (
                <p className="certs__empty">
                  nothing matches “{q}” — try “anthropic”, “python”, or “statistics”
                </p>
              )}
            </div>
            <div className="certs__progress" aria-hidden>
              <div className="certs__progress-fill" ref={fillRef} />
            </div>
          </div>
        </Reveal>
      )}
    </section>
  )
}

/* ————— flow mode: one flat card drifting past — image-first, click to open ————— */

function FlowCard({ cert, clone }: { cert: Certificate; clone?: boolean }) {
  const href = cert.pdf || cert.url
  const inner = (
    <>
      <span className="certflow__art">
        <img
          src={cert.image}
          alt={clone ? '' : `${cert.name} — ${cert.issuer} certificate`}
          loading="lazy"
        />
      </span>
      <span className="certflow__name display">{cert.name}</span>
      <span className="certflow__sub mono-label">
        {cert.issuer} · issued {cert.issued}
      </span>
    </>
  )
  return href ? (
    <a
      className="certflow__card"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
      data-cursor="hover"
    >
      {inner}
    </a>
  ) : (
    <span className="certflow__card" aria-hidden={clone || undefined}>
      {inner}
    </span>
  )
}

/* ————— one group: header + vertical scroller whose certs pile up ————— */

function GroupColumn({
  group,
  certs,
  onTag,
}: {
  group: CertificateGroup
  certs: Certificate[]
  onTag: (t: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [touched, setTouched] = useState(false)
  const shownActive = Math.min(active, certs.length - 1)

  /* while the pile has travel left the wheel scrolls it natively; once it's
     exhausted (or a one-card group never had overflow) the delta hands off to
     the page — overscroll-behavior blocks native chaining (a vertical flick
     must never become rail travel), so without this the column is a dead zone
     the site can't scroll past. Native listener: React's onWheel is passive,
     and the boundary case needs preventDefault. */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return // sideways input belongs to the rail
      const max = el.scrollHeight - el.clientHeight
      const exhausted = max <= 0 || (e.deltaY > 0 ? el.scrollTop >= max - 1 : el.scrollTop <= 0)
      if (!exhausted) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
      scrollPageBy(e.deltaY * unit)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const cards = [...el.querySelectorAll<HTMLElement>('.certs__card')]
    let idx = 0
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].offsetTop - 20 <= el.scrollTop) idx = i
    }
    if (idx !== active) setActive(idx)
    if (el.scrollTop > 30 && !touched) setTouched(true)
  }

  return (
    <div className="certs__col">
      <div className="certs__colhead">
        <span className="certs__colname mono-label">{group.title}</span>
        <span className="certs__colrule" />
        <span className="certs__colidx mono-label">
          <b>0{shownActive + 1}</b> / 0{certs.length}
        </span>
      </div>
      <div className="certs__colscroll" ref={scrollRef} onScroll={onScroll} data-lenis-prevent>
        <div className="certs__stack">
          {certs.map((c, i) => (
            <CertCard key={c.id} cert={c} index={i} total={certs.length} onTag={onTag} />
          ))}
          {certs.length > 1 && !touched && (
            <div className="certs__pilehint mono-label" aria-hidden>
              scroll ↓ to stack
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CertCard({
  cert,
  index,
  total,
  onTag,
}: {
  cert: Certificate
  index: number
  total: number
  onTag: (t: string) => void
}) {
  const href = cert.pdf || cert.url
  return (
    <motion.article
      className="certs__card"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      data-cursor="hover"
    >
      <div className="certs__art">
        <img src={cert.image} alt={`${cert.name} — ${cert.issuer} certificate`} loading="lazy" />
        {href && (
          <a
            className="certs__open"
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${cert.name} certificate`}
            data-cursor="hover"
          >
            ↗
          </a>
        )}
      </div>
      <div className="certs__toprow">
        <span className="certs__cat mono-label">{cert.issuer}</span>
        <span className="certs__idx mono-label">
          0{index + 1} / 0{total}
        </span>
      </div>
      <h3 className="certs__name display">{cert.name}</h3>
      <p className="certs__summary">{cert.summary}</p>
      <div className="certs__tags">
        {cert.tags.map((t) => (
          <button key={t} className="chip certs__tag" onClick={() => onTag(t)} data-cursor="hover">
            {t}
          </button>
        ))}
      </div>
      <p className="certs__meta">
        issued {cert.issued}
        {cert.sample && <span className="certs__samplechip">sample</span>}
      </p>
    </motion.article>
  )
}
