import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { profile } from '../../lib/profile'
import type { Experience as ExperienceEntry } from '../../lib/profile'
import { Reveal, SectionHeader } from '../ui'

function fmt(d: string) {
  if (!d || d.toLowerCase() === 'present') return 'now'
  const [y, m] = d.split('-')
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  return m ? `${months[parseInt(m, 10) - 1]} ’${y.slice(2)}` : y
}

export default function Experience() {
  return (
    <section className="section" id="work">
      {/* second anchor — the command palette jumps here */}
      <span id="experience" style={{ position: 'absolute' }} aria-hidden />
      <SectionHeader
        index="02"
        kicker="experience"
        title={
          <>
            Where the work <em style={{ color: 'var(--amber)' }}>happened.</em>
          </>
        }
      />
      <div className="xp">
        <span className="xp__rail" aria-hidden />
        {profile.experience.map((e, i) => (
          <Reveal key={i} delay={Math.min(i * 0.06, 0.3)} className="xp__row">
            <span className="xp__node" aria-hidden />
            <XpCard e={e} defaultOpen={i === 0} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function XpCard({ e, defaultOpen }: { e: ExperienceEntry; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const reduce = useReducedMotion()
  const shown = open ? e.bullets : e.bullets.slice(0, 3)
  const hiddenCount = e.bullets.length - 3

  return (
    <article className="xp__card" data-cursor="hover">
      <button
        className="xp__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%' }}
        data-cursor="hover"
      >
        <div>
          <h3 className="xp__role">{e.role}</h3>
          <p className="xp__org">
            {e.org}
            {e.location ? <span className="xp__loc"> · {e.location}</span> : null}
          </p>
        </div>
        <div className="xp__meta">
          <span className="mono-label xp__dates">
            {fmt(e.start)} — {fmt(e.end)}
          </span>
          <div className="xp__tags">
            {(e.tags || []).map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </button>

      {e.summary && <p className="xp__summary">{e.summary}</p>}

      <motion.ul
        className="xp__bullets"
        initial={false}
        animate={{ height: 'auto' }}
        style={{ overflow: 'hidden' }}
      >
        {shown.map((b, i) => (
          <motion.li
            key={i}
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i >= 3 ? (i - 3) * 0.05 : 0 }}
          >
            {b}
          </motion.li>
        ))}
      </motion.ul>
      {hiddenCount > 0 && (
        <button className="xp__more" onClick={() => setOpen(!open)} data-cursor="hover">
          {open ? '− collapse' : `+ ${hiddenCount} more`}
          <span className={`xp__caret ${open ? 'xp__caret--open' : ''}`} aria-hidden>
            ⌄
          </span>
        </button>
      )}
    </article>
  )
}
