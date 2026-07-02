import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

const LINKS = [
  { href: '#journey', label: 'Journey' },
  { href: '#work', label: 'Work' },
  { href: '#projects', label: 'Projects' },
  { href: '#humanity', label: 'Humanity' },
]

export default function Nav({ onOpenChat }: { onOpenChat: () => void }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`nav ${scrolled ? 'nav--scrolled' : ''}`}
    >
      <a href="#top" className="nav__mark" aria-label="Back to top">
        <span className="nav__mark-dot" />
        m.musa
      </a>
      <div className="nav__links">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className="nav__link">
            {l.label}
          </a>
        ))}
      </div>
      <button className="nav__ai" onClick={onOpenChat} data-cursor="hover">
        <span className="nav__ai-pulse" />
        ask my AI
        <kbd>/</kbd>
      </button>
    </motion.nav>
  )
}
