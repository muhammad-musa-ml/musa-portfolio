import { motion, useReducedMotion } from 'motion/react'
import { profile } from '../../lib/profile'
import { CountUp, Magnetic } from '../ui'

const EASE = [0.16, 1, 0.3, 1] as const

const FACTS = [
  'ACM CSET ’23 published',
  '4.0 GPA · UW–Madison',
  '1,100+ students taught',
  'founded WUMI Health',
  'LLM safety research',
  'first Shahmukhi NLP benchmark',
]

const STATS = [
  { node: <>4% → <CountUp value={68} />%</>, label: 'jailbreak success rate' },
  { node: <><CountUp value={1600} separator />+</>, label: 'students taught' },
  { node: <><CountUp value={92.9} decimals={1} />%</>, label: 'Shahmukhi NLP accuracy' },
  { node: <><CountUp value={1200} separator />+</>, label: 'hospitals unified' },
]

export default function Hero({ onOpenChat }: { onOpenChat: () => void }) {
  const reduce = useReducedMotion()

  return (
    <section className="hero" id="top">
      <div className="hero__inner">
        <motion.div
          className="hero__kicker"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        >
          <p className="mono-label hero__kicker-role">{profile.role_line}</p>
          <p className="mono-label hero__kicker-degree">M.S. COMPUTER SCIENCES · UW–MADISON</p>
          {profile.availability && (
            <span className="hero__pill">
              <span className="hero__pill-dot" aria-hidden />
              {profile.availability}
            </span>
          )}
        </motion.div>

        <h1 className="hero__title display" aria-label="I teach machines to serve people.">
          <Line delay={0.3} reduce={!!reduce}>I teach</Line>
          <Line delay={0.42} reduce={!!reduce}>
            <em className="hero__em">machines</em>
          </Line>
          <Line delay={0.54} reduce={!!reduce}>
            to serve <em className="hero__em hero__em--teal">people.</em>
          </Line>
        </h1>

        <motion.p
          className="hero__sub"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75, ease: EASE }}
        >
          From Lahore to Madison — I break language models to make them safer, build
          health records for hospitals that never had them, and teach a few hundred
          students along the way. This site is my journey. It also answers back.
        </motion.p>

        <motion.div
          className="hero__cta"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
        >
          <Magnetic>
            <a href="#journey" className="btn btn--ghost" data-cursor="hover">
              walk the journey <span aria-hidden>↓</span>
            </a>
          </Magnetic>
          <Magnetic>
            <button className="btn btn--twin" onClick={onOpenChat} data-cursor="hover">
              <span className="btn__pulse" aria-hidden />
              interrogate my AI twin
              <kbd>/</kbd>
            </button>
          </Magnetic>
        </motion.div>

        <motion.div
          className="hero__stats"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
        >
          {STATS.map((s, i) => (
            <div className="hero__stat" key={i} data-cursor="hover">
              <span className="hero__stat-num display">{s.node}</span>
              <span className="hero__stat-label">{s.label}</span>
            </div>
          ))}
        </motion.div>

        <motion.a
          href="#journey"
          className="hero__scrollcue mono-label"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.3 }}
          data-cursor="hover"
        >
          <span>scroll</span>
          <span className="hero__scrollcue-rail" aria-hidden />
        </motion.a>
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

function Line({
  children,
  delay,
  reduce,
}: {
  children: React.ReactNode
  delay: number
  reduce: boolean
}) {
  return (
    <span className="hero__line">
      <motion.span
        style={{ display: 'inline-block' }}
        initial={reduce ? false : { y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}
