import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { profile } from '../../lib/profile'
import { Reveal, SectionHeader } from '../ui'

export default function Journey() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.75', 'end 0.6'],
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
        <motion.div className="journey__line" style={{ scaleY: lineScale }} aria-hidden />
        {profile.journey_milestones.map((m, i) => (
          <div key={i} className={`journey__row ${i % 2 ? 'journey__row--flip' : ''}`}>
            <div className="journey__year-cell" aria-hidden>
              <Reveal delay={0.05}>
                <span className="journey__year display">{String(m.year)}</span>
              </Reveal>
            </div>
            <div className="journey__node" aria-hidden>
              <motion.span
                className="journey__node-dot"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
              />
            </div>
            <div className="journey__card-cell">
              <Reveal delay={0.12}>
                <article className="journey__card" data-cursor="hover">
                  <p className="mono-label journey__card-sub">{m.subtitle}</p>
                  <h3 className="journey__card-title display">{m.title}</h3>
                  <p className="journey__card-body">{m.description}</p>
                </article>
              </Reveal>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
