import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { askTwin, type ChatMessage } from '../../lib/ai'
import { firstName } from '../../lib/profile'
import { renderMarkdown } from './markdown'
import '../../styles/chat.css'

type Msg = { role: 'user' | 'assistant'; content: string; error?: boolean }

const SUGGESTIONS = [
  'What is WUMI Health?',
  'Walk me through your LLM safety research',
  'What’s resume-gauntlet?',
  'Why does “AI for humanity” matter to you?',
  'Can you work on quantum physics?',
  'What are you looking for in your next role?',
]

const GREETING = `**Salaam — I'm ${firstName}'s AI twin.** I'm trained on his real resume and research record, and I run on an honesty-first policy: I'll tell you what he's done, and I'll tell you plainly what he hasn't. Ask me anything — his work, his skills, whether he's a fit for your team.`

export default function ChatPanel({
  onClose,
  initialQuestion,
}: {
  onClose: () => void
  initialQuestion?: string
}) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoSent = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    setBusy(true)
    const history: ChatMessage[] = [
      ...msgs.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      { role: 'user', content: q },
    ]
    setMsgs((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '' }])
    try {
      const { stream } = await askTwin(history.filter((m) => m.content !== GREETING))
      let acc = ''
      for await (const chunk of stream) {
        acc += chunk
        setMsgs((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
      }
      if (!acc.trim()) throw new Error('empty')
    } catch (err) {
      const msg =
        err instanceof Error && err.message === 'rate_limited'
          ? '_The free AI lane is catching its breath — give it ~15 seconds and ask again._'
          : `_Hmm, my circuits hiccuped. Try again in a moment — or just email the real ${firstName}._`
      setMsgs((m) => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: msg, error: true }
        return copy
      })
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  // auto-ask a question handed in from the ⌘K palette
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() && !autoSent.current) {
      autoSent.current = true
      send(initialQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion])

  return (
    <AnimatePresence>
      <motion.div
        className="chat__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.aside
          className="chat__window"
          role="dialog"
          aria-modal="true"
          aria-label="AI twin chat"
          initial={{ opacity: 0.4, x: 64 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 64 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="chat__bar">
            <div className="chat__dots" aria-hidden>
              <span /> <span /> <span />
            </div>
            <span className="chat__title mono-label">
              {firstName.toLowerCase()}.twin — honesty-first digital stand-in
            </span>
            <button className="chat__close" onClick={onClose} aria-label="Close chat" data-cursor="hover">
              esc ✕
            </button>
          </header>

          <div className="chat__scroll" ref={scrollRef} data-lenis-prevent>
            {msgs.map((m, i) => (
              <div key={i} className={`chat__msg chat__msg--${m.role} ${m.error ? 'chat__msg--error' : ''}`}>
                <span className="chat__who mono-label">
                  {m.role === 'user' ? 'you' : `${firstName.toLowerCase()}.twin`}
                </span>
                <div className="chat__bubble">
                  {m.content ? (
                    renderMarkdown(m.content)
                  ) : (
                    <span className="chat__thinking">
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {msgs.length <= 1 && (
            <div className="chat__suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chat__chip" onClick={() => send(s)} data-cursor="hover">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="chat__inputrow"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <span className="chat__prompt" aria-hidden>
              ❯
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={busy ? 'thinking…' : `ask ${firstName}’s twin anything…`}
              disabled={busy}
              aria-label="Your question"
            />
            <button type="submit" disabled={busy || !input.trim()} data-cursor="hover">
              send
            </button>
          </form>

          <p className="chat__disclaimer">
            AI stand-in grounded in my real résumé — it admits what I haven’t done.
            For anything serious, email the human: <a href="mailto:mmusa2@wisc.edu">mmusa2@wisc.edu</a>
          </p>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  )
}
