import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useInView } from 'motion/react'

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
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
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
  // torchlight ignite: the heading catches light (amber glow + brief flicker)
  // the first time it scrolls into view
  const ref = useRef<HTMLHeadingElement>(null)
  const ignited = useInView(ref, { once: true, margin: '-18% 0px -18% 0px' })
  return (
    <header className="sec-head">
      <Reveal>
        <div className="section-kicker mono-label">
          <span style={{ color: 'var(--cream-faint)' }}>{index}</span>
          <span style={{ color: 'var(--cream-faint)' }} aria-hidden>·</span>
          <span>{kicker}</span>
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <h2 ref={ref} className={`sec-title display ${ignited ? 'is-ignited' : ''}`}>
          {title}
        </h2>
      </Reveal>
    </header>
  )
}

/** Wraps an interactive element (button/link) and nudges it toward the cursor on hover. */
export function Magnetic({
  children,
  className,
  strength = 0.1, // a whisper — anything stronger reads as the button dodging the cursor
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 16, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 200, damping: 16, mass: 0.4 })

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - r.left - r.width / 2) * strength)
    y.set((e.clientY - r.top - r.height / 2) * strength)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy, display: 'inline-block' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  )
}

/** Animates a number counting up from `from` to `value` once it scrolls into view. */
export function CountUp({
  value,
  from = 0,
  duration = 1.4,
  decimals = 0,
  separator = false,
  prefix = '',
  suffix = '',
}: {
  value: number
  from?: number
  duration?: number
  decimals?: number
  separator?: boolean
  prefix?: string
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduce = useReducedMotion()
  const format = (n: number) =>
    separator ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n.toFixed(decimals)
  const [display, setDisplay] = useState(format(reduce ? value : from))

  useEffect(() => {
    if (!inView || reduce) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(format(from + eased * (value - from)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value, from, duration, decimals, separator])

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
