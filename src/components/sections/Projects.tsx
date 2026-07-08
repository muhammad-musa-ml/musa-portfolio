import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { profile } from '../../lib/profile'
import type { Project } from '../../lib/profile'
import { Reveal, SectionHeader } from '../ui'

const ALL = 'All'
const ROW_UNIT = 8 // masonry row unit (px) — each cell spans ceil(height / unit)

export default function Projects() {
  const categories = useMemo(() => {
    const set = new Set<string>()
    profile.projects.forEach((p) => set.add(p.category || 'Project'))
    return [ALL, ...Array.from(set)]
  }, [])

  const [filter, setFilter] = useState<string>(ALL)

  // featured projects first, per the data contract — filtering never breaks that order
  const ordered = useMemo(() => {
    return [...profile.projects].sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
  }, [])

  const visible = useMemo(() => {
    if (filter === ALL) return ordered
    return ordered.filter((p) => (p.category || 'Project') === filter)
  }, [ordered, filter])

  return (
    <section className="section" id="projects">
      <SectionHeader
        index="04"
        kicker="projects & research"
        title={
          <>
            Things I’ve <em style={{ color: 'var(--amber)' }}>actually built.</em>
          </>
        }
      />

      <Reveal>
        <div className="pj__filters" role="tablist" aria-label="Filter projects by category">
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={filter === c}
              className={`pj__filter ${filter === c ? 'is-active' : ''}`}
              onClick={() => setFilter(c)}
              data-cursor="hover"
            >
              {filter === c && (
                <motion.span className="pj__filter-bg" layoutId="pj-filter-bg" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
              )}
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      <motion.div className="pj" layout>
        <AnimatePresence mode="popLayout">
          {visible.map((p, i) => (
            <MasonryCell key={p.name} p={p} featured={!!p.featured} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}

/**
 * Masonry cell: measures its own content and translates the height into a
 * grid row-span, so the dense grid packs cards like a mosaic — no stretched
 * cards, no holes, and expanding one card reflows its neighbors smoothly.
 * (forwardRef: AnimatePresence popLayout measures exiting cells via this ref.)
 */
const MasonryCell = forwardRef<HTMLDivElement, { p: Project; featured: boolean; index: number }>(
  function MasonryCell({ p, featured, index }, ref) {
  const inner = useRef<HTMLDivElement>(null)
  const [span, setSpan] = useState(0)

  // layout effect: the span must be set before first paint, or the cell
  // briefly occupies a single 8px row and its content overflows the grid
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const measure = () =>
      setSpan(Math.max(1, Math.ceil(el.getBoundingClientRect().height / ROW_UNIT)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.div
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.03, 0.25) }}
      className={featured ? 'pj__cell pj__cell--featured' : 'pj__cell'}
      style={span ? { gridRowEnd: `span ${span}` } : undefined}
    >
      <div className="pj__inner" ref={inner}>
        <ProjectCard p={p} featured={featured} />
      </div>
    </motion.div>
  )
})

function ProjectCard({ p, featured }: { p: Project; featured?: boolean }) {
  const reduce = useReducedMotion()
  // collapsed by default — the mosaic stays dense; expanding reveals the receipts
  const [open, setOpen] = useState(false)
  const highlights = p.highlights || []

  return (
    <div className={`pj__card ${featured ? 'pj__card--featured' : ''}`} data-cursor="hover">
      <div className="pj__top">
        <span className="chip chip--cat">{p.category || 'Project'}</span>
        {p.link && (
          <a
            className="pj__link"
            href={p.link}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${p.name} link`}
            data-cursor="hover"
          >
            ↗
          </a>
        )}
      </div>
      <h3 className="pj__name display">{p.name}</h3>
      <p className="pj__desc">{p.description}</p>
      {open && highlights.length > 0 && (
        <ul className="pj__hl">
          {highlights.map((h, i) => (
            <motion.li
              key={i}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              {h}
            </motion.li>
          ))}
        </ul>
      )}
      {highlights.length > 0 && (
        <button
          className="pj__more"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          data-cursor="hover"
        >
          {open
            ? '− collapse'
            : `+ ${highlights.length} highlight${highlights.length > 1 ? 's' : ''}`}
          <span className={`xp__caret ${open ? 'xp__caret--open' : ''}`} aria-hidden>
            ⌄
          </span>
        </button>
      )}
      <div className="pj__tech">
        {p.tech.slice(0, 6).map((t) => (
          <span key={t} className="chip chip--tech">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
