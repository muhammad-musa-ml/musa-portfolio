import { motion } from 'motion/react'
import { profile } from '../../lib/profile'

const EASE = [0.16, 1, 0.3, 1] as const

const FACTS = [
  'ACM CSET ’23 published',
  '4.0 GPA · UW–Madison',
  '1,100+ students taught',
  'founded WUMI Health',
  'LLM safety research',
  'first Shahmukhi NLP benchmark',
]

export default function Hero({ onOpenChat }: { onOpenChat: () => void }) {
  return (
    <section className="hero" id="top">
      <div className="hero__inner">
        <motion.p
          className="hero__status mono-label"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        >
          <span className="hero__status-dot" /> {profile.name} · CS grad researcher,
          UW–Madison · AI/ML × security × health
        </motion.p>

        <h1 className="hero__title display" aria-label="I teach machines to serve people.">
          <Line delay={0.3}>I teach</Line>
          <Line delay={0.42}>
            <em className="hero__em">machines</em>
          </Line>
          <Line delay={0.54}>
            to serve <em className="hero__em hero__em--teal">people.</em>
          </Line>
        </h1>

        <motion.p
          className="hero__sub"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75, ease: EASE }}
        >
          From Lahore to Madison — I break language models to make them safer, build
          health records for hospitals that never had them, and teach a few hundred
          students along the way. This site is my journey. It also answers back.
        </motion.p>

        <motion.div
          className="hero__cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
        >
          <a href="#journey" className="btn btn--ghost" data-cursor="hover">
            walk the journey <span aria-hidden>↓</span>
          </a>
          <button className="btn btn--amber" onClick={onOpenChat} data-cursor="hover">
            interrogate my AI twin <span aria-hidden>→</span>
          </button>
        </motion.div>
      </div>

      <motion.div
        className="hero__ticker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.3 }}
        aria-hidden
      >
        <div className="hero__ticker-track">
          {[...FACTS, ...FACTS].map((f, i) => (
            <span key={i} className="hero__ticker-item">
              {f} <span className="hero__ticker-sep">✦</span>
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

function Line({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="hero__line">
      <motion.span
        style={{ display: 'inline-block' }}
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}
