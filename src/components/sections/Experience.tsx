import { useState } from 'react'
import { profile } from '../../lib/profile'
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
      <SectionHeader
        index="02"
        kicker="experience"
        title={
          <>
            Where the work <em style={{ color: 'var(--signal)' }}>happened.</em>
          </>
        }
      />
      <div className="xp">
        {profile.experience.map((e, i) => (
          <Reveal key={i} delay={Math.min(i * 0.06, 0.3)}>
            <XpCard {...{ e }} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function XpCard({ e }: { e: (typeof profile.experience)[number] }) {
  const [open, setOpen] = useState(false)
  const shown = open ? e.bullets : e.bullets.slice(0, 3)
  return (
    <article className="xp__card">
      <div className="xp__head">
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
      </div>
      <ul className="xp__bullets">
        {shown.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      {e.bullets.length > 3 && (
        <button className="xp__more" onClick={() => setOpen(!open)} data-cursor="hover">
          {open ? '− collapse' : `+ ${e.bullets.length - 3} more`}
        </button>
      )}
    </article>
  )
}
