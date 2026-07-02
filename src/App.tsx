import { useEffect, useState, lazy, Suspense } from 'react'
import Lenis from 'lenis'
import SceneCanvas from './three/SceneCanvas'
import Cursor from './components/Cursor'
import Nav from './components/Nav'
import Hero from './components/sections/Hero'
import Journey from './components/sections/Journey'
import Experience from './components/sections/Experience'
import Projects from './components/sections/Projects'
import Humanity from './components/sections/Humanity'
import Footer from './components/sections/Footer'
import { setScrollProgress, setPointer } from './lib/scrollBus'

const ChatPanel = lazy(() => import('./components/chat/ChatPanel'))

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.05 })
    let raf: number
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    lenis.on('scroll', ({ scroll, limit }: { scroll: number; limit: number }) => {
      setScrollProgress(limit > 0 ? scroll / limit : 0)
    })

    const onPointer = (e: MouseEvent) => {
      setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1
      )
    }
    window.addEventListener('mousemove', onPointer, { passive: true })

    // press "/" anywhere to summon the AI twin
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        setChatOpen(true)
      }
      if (e.key === 'Escape') setChatOpen(false)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      lenis.destroy()
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // lock page scroll while chat overlay is open
  useEffect(() => {
    document.body.style.overflow = chatOpen ? 'hidden' : ''
  }, [chatOpen])

  return (
    <>
      <SceneCanvas />
      <Cursor />
      <div className="grain" />
      <Nav onOpenChat={() => setChatOpen(true)} />
      <main style={{ position: 'relative', zIndex: 2 }}>
        <Hero onOpenChat={() => setChatOpen(true)} />
        <Journey />
        <Experience />
        <Projects />
        <Humanity />
        <Footer onOpenChat={() => setChatOpen(true)} />
      </main>
      {chatOpen && (
        <Suspense fallback={null}>
          <ChatPanel onClose={() => setChatOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
