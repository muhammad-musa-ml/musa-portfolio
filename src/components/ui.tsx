import type { ReactNode } from 'react'
import { motion } from 'motion/react'

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeader({
  index,
  kicker,
  title,
}: {
  index: string
  kicker: string
  title: ReactNode
}) {
  return (
    <header style={{ marginBottom: 'clamp(2.5rem, 6vh, 4.5rem)' }}>
      <Reveal>
        <div className="section-kicker mono-label">
          <span style={{ color: 'var(--cream-faint)' }}>{index}</span>
          <span>{kicker}</span>
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <h2
          className="display"
          style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginTop: '1rem', maxWidth: '18ch' }}
        >
          {title}
        </h2>
      </Reveal>
    </header>
  )
}
