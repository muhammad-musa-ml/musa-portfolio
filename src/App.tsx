import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import Lenis from 'lenis'
import SceneCanvas from './three/SceneCanvas'
import TorchVeil from './components/TorchVeil'
import Cursor from './components/Cursor'
import Nav from './components/Nav'
import Hero from './components/sections/Hero'
import Journey from './components/sections/Journey'
import Experience from './components/sections/Experience'
import Toolkit from './components/sections/Toolkit'
import Projects from './components/sections/Projects'
import Certificates from './components/sections/Certificates'
import Humanity from './components/sections/Humanity'
import Footer from './components/sections/Footer'
import CommandPalette from './components/CommandPalette'
import { setScrollProgress, setPointer } from './lib/scrollBus'
import { registerLenis, scrollToId, startLenis, stopLenis } from './lib/scroll'
import { MOTION_OFF } from './lib/motionEnv'

const ChatPanel = lazy(() => import('./components/chat/ChatPanel'))

// digit shortcuts — match the section numbering on the page (01–07);
// "back to top" is the m.musa mark in the nav, no key needed
const SECTION_KEYS: Record<string, string> = {
  '1': 'journey',
  '2': 'work',
  '3': 'toolkit',
  '4': 'projects',
  '5': 'certificates',
  '6': 'humanity',
  '7': 'contact',
}

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrefill, setChatPrefill] = useState<string | undefined>(undefined)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const openChat = useCallback((prefill?: string) => {
    setChatPrefill(prefill)
    setChatOpen(true)
  }, [])

  useEffect(() => {
    // Smooth scroll — unless the visitor prefers reduced motion (or ?still QA).
    let lenis: Lenis | null = null
    let raf = 0
    let onScroll: (() => void) | null = null

    if (!MOTION_OFF) {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.05 })
      registerLenis(lenis)
      const loop = (time: number) => {
        lenis!.raf(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      lenis.on('scroll', ({ scroll, limit }: { scroll: number; limit: number }) => {
        setScrollProgress(limit > 0 ? scroll / limit : 0)
      })
    } else {
      // native scroll: still report progress for any scroll-driven UI
      onScroll = () => {
        const limit = document.documentElement.scrollHeight - window.innerHeight
        setScrollProgress(limit > 0 ? window.scrollY / limit : 0)
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
    }

    const onPointer = (e: MouseEvent) => {
      setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1
      )
    }
    window.addEventListener('mousemove', onPointer, { passive: true })

    return () => {
      lenis?.destroy()
      registerLenis(null)
      cancelAnimationFrame(raf)
      if (onScroll) window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onPointer)
    }
  }, [])

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'

      // ⌘K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen((v) => !v)
        return
      }
      // "/" — jump straight to the AI twin
      if (e.key === '/' && !typing && !paletteOpen) {
        e.preventDefault()
        openChat()
        return
      }
      // 1–7 — jump between sections, same numbers the nav shows
      if (
        !typing &&
        !paletteOpen &&
        !chatOpen &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        SECTION_KEYS[e.key]
      ) {
        scrollToId(SECTION_KEYS[e.key])
        return
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false)
        setChatOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openChat, paletteOpen, chatOpen])

  // lock page scroll while an overlay is open — both the native scroller and
  // Lenis, which otherwise keeps eating wheel events under the overlay
  useEffect(() => {
    const open = chatOpen || paletteOpen
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) stopLenis()
    else startLenis()
  }, [chatOpen, paletteOpen])

  return (
    <>
      <SceneCanvas />
      <TorchVeil />
      <Cursor />
      <Nav onOpenChat={() => openChat()} onOpenPalette={() => setPaletteOpen(true)} />
      <main style={{ position: 'relative', zIndex: 2 }}>
        <Hero onOpenChat={() => openChat()} />
        <Journey />
        <Experience />
        <Toolkit />
        <Projects />
        <Certificates />
        <Humanity />
        <Footer onOpenChat={() => openChat()} />
      </main>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onAskTwin={(prefill) => openChat(prefill)}
        />
      )}

      {chatOpen && (
        <Suspense fallback={null}>
          <ChatPanel onClose={() => setChatOpen(false)} initialQuestion={chatPrefill} />
        </Suspense>
      )}
    </>
  )
}
