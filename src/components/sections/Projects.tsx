import { useRef } from 'react'
import { profile } from '../../lib/profile'
import { Reveal, SectionHeader } from '../ui'

export default function Projects() {
  return (
    <section className="section" id="projects">
      <SectionHeader
        index="03"
        kicker="projects & research"
        title={
          <>
            Things I’ve <em style={{ color: 'var(--amber)' }}>actually built.</em>
          </>
        }
      />
      <div className="pj">
        {profile.projects.map((p, i) => {
          const featured = i === 0 || p.name.includes('WUMI')
          return (
            <Reveal
              key={p.name}
              delay={Math.min((i % 3) * 0.08, 0.24)}
              className={featured ? 'pj__cell pj__cell--featured' : 'pj__cell'}
            >
              <TiltCard p={p} featured={featured} />
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function TiltCard({
  p,
  featured,
}: {
  p: (typeof profile.projects)[number]
  featured?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateZ(6px)`
    el.style.setProperty('--glow-x', `${(px + 0.5) * 100}%`)
    el.style.setProperty('--glow-y', `${(py + 0.5) * 100}%`)
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0)'
  }

  return (
    <div
      ref={ref}
      className={`pj__card ${featured ? 'pj__card--featured' : ''}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-cursor="hover"
    >
      <div className="pj__glow" aria-hidden />
      <div className="pj__top">
        <span className="chip chip--cat">{p.category || 'Project'}</span>
      </div>
      <h3 className="pj__name display">{p.name}</h3>
      <p className="pj__desc">{p.description}</p>
      {p.highlights && p.highlights.length > 0 && (
        <ul className="pj__hl">
          {p.highlights.slice(0, featured ? 4 : 2).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
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
