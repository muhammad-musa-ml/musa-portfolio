import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { getScrollProgress } from '../lib/scrollBus'
import { PALETTE_KEY } from '../lib/platform'

// index doubles as the keyboard shortcut (press 1 → journey, etc.) and
// matches the section numbering on the page (01–07)
const LINKS = [
  { href: '#journey', id: 'journey', label: 'Journey', index: '1' },
  { href: '#work', id: 'work', label: 'Work', index: '2' },
  { href: '#toolkit', id: 'toolkit', label: 'Toolkit', index: '3' },
  { href: '#projects', id: 'projects', label: 'Projects', index: '4' },
  { href: '#certificates', id: 'certificates', label: 'Certificates', index: '5' },
  { href: '#humanity', id: 'humanity', label: 'Humanity', index: '6' },
  { href: '#contact', id: 'contact', label: 'Contact', index: '7' },
]

export default function Nav({
  onOpenChat,
  onOpenPalette,
}: {
  onOpenChat: () => void
  onOpenPalette: () => void
}) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const progress = useMotionValue(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // drive the top progress bar off the shared scroll bus without React re-renders
  useEffect(() => {
    let raf = 0
    const loop = () => {
      progress.set(getScrollProgress())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [progress])

  // scroll-spy: whichever section owns the most viewport wins the nav highlight.
  // the hero (#top) is observed too so no tab stays lit at the top of the page.
  useEffect(() => {
    const ids = ['top', ...LINKS.map((l) => l.id)]
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)
    if (targets.length === 0) return
    const ratios = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        let best: string | null = null
        let bestRatio = 0
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id
          }
        }
        if (bestRatio > 0.05) setActive(best === 'top' ? null : best)
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: '-15% 0px -55% 0px' }
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // lock body scroll while the mobile overlay is open
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <div className="nav__progress" aria-hidden>
        <motion.div
          className="nav__progress-fill"
          style={{ scaleX: reduce ? 0 : progress }}
        />
      </div>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`nav ${scrolled ? 'nav--scrolled' : ''}`}
      >
        <a href="#top" className="nav__mark" aria-label="Back to top" data-cursor="hover">
          <span className="nav__mark-dot" />
          m.musa
        </a>
        <div className="nav__links">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`nav__link ${active === l.id ? 'nav__link--active' : ''}`}
              data-cursor="hover"
            >
              <kbd className="nav__link-index" aria-hidden>{l.index}</kbd>
              {l.label}
              {active === l.id && (
                <motion.span
                  className="nav__indicator"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </a>
          ))}
        </div>
        <div className="nav__right">
          <button className="nav__ai" onClick={onOpenChat} data-cursor="hover">
            <span className="nav__ai-pulse" />
            ask my AI
            <kbd>/</kbd>
          </button>
          <button
            className="nav__palette"
            onClick={onOpenPalette}
            title="Command palette — jump anywhere"
            aria-label="Open command palette"
            data-cursor="hover"
          >
            <kbd>{PALETTE_KEY}</kbd>
          </button>
        </div>
        <button
          className={`nav__burger ${menuOpen ? 'is-open' : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          data-cursor="hover"
        >
          <span />
          <span />
          <span />
        </button>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="nav__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                className="nav__overlay-link display"
                onClick={closeMenu}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
                data-cursor="hover"
              >
                <kbd className="nav__link-index" aria-hidden>{l.index}</kbd>
                {l.label}
              </motion.a>
            ))}
            <motion.button
              className="nav__overlay-link display"
              style={{ color: 'var(--signal)', background: 'none', border: 'none' }}
              onClick={() => {
                closeMenu()
                onOpenChat()
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 * LINKS.length, ease: [0.16, 1, 0.3, 1] }}
              data-cursor="hover"
            >
              ask my AI
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
