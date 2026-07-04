import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { profile } from '../../lib/profile'
import type { Milestone } from '../../lib/profile'
import { Reveal, SectionHeader } from '../ui'

// icon_hint → node color family on the rail
const KIND: Record<string, string> = {
  home: 'origin',
  'graduation-cap': 'education',
  university: 'education',
  microscope: 'research',
  shield: 'research',
  globe: 'research',
  rocket: 'venture',
  'heart-pulse': 'venture',
  compass: 'next',
}

const kindOf = (m: Milestone) => KIND[m.icon_hint || ''] || 'origin'

export default function Journey() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.75', 'end 0.55'],
  })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section className="section" id="journey">
      <SectionHeader
        index="01"
        kicker="the journey"
        title={
          <>
            Every model has <em style={{ color: 'var(--amber)' }}>training data</em>.
            This is mine.
          </>
        }
      />

      <div className="journey" ref={ref}>
        <div className="journey__rail" aria-hidden />
        <motion.div className="journey__fill" style={{ scaleY: lineScale }} aria-hidden />
        {profile.journey_milestones.map((m, i) => (
          <div className="journey__item" data-kind={kindOf(m)} key={i}>
            <div className="journey__year display" aria-hidden>
              {String(m.year)}
            </div>
            <div className="journey__node" aria-hidden />
            <Reveal className="journey__card" delay={0.04 * (i % 3)}>
              <p className="mono-label journey__card-sub">{m.subtitle}</p>
              <h3 className="journey__card-title display">{m.title}</h3>
              <p className="journey__card-body">{m.description}</p>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  )
}
