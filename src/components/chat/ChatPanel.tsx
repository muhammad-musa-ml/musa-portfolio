import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { askTwin, type ChatMessage } from "../../lib/ai";
import { renderMarkdown } from "./markdown";
import { TRACE_TIMING } from "../../portfolio/motion/timing";
import "../../styles/chat.css";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const SUGGESTIONS = [
  "What is WUMI Health?",
  "Walk me through your LLM safety research",
  "What’s resume-gauntlet?",
  "What are you looking for in your next role?",
];

const GREETING = `**Hi, I’m MusA.I.** I’m an AI twin grounded in this portfolio, answering in Musa’s voice. Ask about my projects, the decisions behind them, or the skills I could bring to your team. I’ll say when the evidence runs out.`;

export default function ChatPanel({
  onClose,
  initialQuestion,
  transitionStyle,
}: {
  onClose: () => void;
  initialQuestion?: string;
  transitionStyle?: "trace";
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followReply = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSent = useRef(false);
  const windowRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const reduceMotion = useReducedMotion();
  const portfolioChat = transitionStyle === "trace";

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        windowRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),[tabindex="0"]',
        ) ?? [],
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !windowRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !windowRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && followReply.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    followReply.current = true;
    setInput("");
    setBusy(true);
    const history: ChatMessage[] = [
      ...msgs.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      { role: "user", content: q },
    ];
    setMsgs((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: "" },
    ]);
    try {
      const { stream } = await askTwin(
        history.filter((m) => m.content !== GREETING),
      );
      let acc = "";
      for await (const chunk of stream) {
        acc += chunk;
        setMsgs((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (!acc.trim()) throw new Error("empty");
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "rate_limited"
          ? "_MusA.I is receiving too many requests. Please try again shortly._"
          : `_I couldn’t reach the response service. Try again in a moment, or contact me by email._`;
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: msg,
          error: true,
        };
        return copy;
      });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  // auto-ask a question handed in from the ⌘K palette
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() && !autoSent.current) {
      autoSent.current = true;
      send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const suggestions = msgs.length <= 1 && (
    <div className="chat__suggestions" aria-label="Suggested questions">
      {portfolioChat && (
        <p className="chat__suggestions-label">A place to start</p>
      )}
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          className="chat__chip"
          onClick={() => send(suggestion)}
          data-cursor="hover"
        >
          {suggestion}
          {portfolioChat && <span aria-hidden="true">↗</span>}
        </button>
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        className="chat__backdrop"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : transitionStyle === "trace"
              ? TRACE_TIMING
              : undefined
        }
        onClick={onClose}
      >
        <motion.aside
          ref={windowRef}
          className={`chat__window${transitionStyle === "trace" ? " chat__window--trace" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="MusA.I chat"
          initial={
            reduceMotion
              ? false
              : transitionStyle === "trace"
                ? { opacity: 0.86, x: 0 }
                : { opacity: 0.4, x: 64 }
          }
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: transitionStyle === "trace" ? 0 : 64 }}
          transition={{
            duration: reduceMotion
              ? 0
              : transitionStyle === "trace"
                ? TRACE_TIMING.duration
                : 0.45,
            ease:
              transitionStyle === "trace"
                ? TRACE_TIMING.ease
                : [0.16, 1, 0.3, 1],
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="chat__bar">
            {portfolioChat ? (
              <>
                <span className="chat__terminal-mark" aria-hidden="true">
                  &gt;_
                </span>
                <div className="chat__identity">
                  <h2 className="chat__title">MusA.I</h2>
                  <span className="chat__subtitle">
                    A conversation about my work
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="chat__dots" aria-hidden>
                  <span /> <span /> <span />
                </div>
                <span className="chat__title">MusA.I</span>
              </>
            )}
            <button
              className="chat__close"
              onClick={onClose}
              aria-label="Close MusA.I"
              data-cursor="hover"
            >
              <span className="chat__escape">esc</span>{" "}
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div
            className="chat__scroll"
            ref={scrollRef}
            data-lenis-prevent
            onScroll={(event) => {
              const element = event.currentTarget;
              followReply.current =
                element.scrollHeight -
                  element.scrollTop -
                  element.clientHeight <
                80;
            }}
          >
            <div
              className="chat__messages"
              role="log"
              aria-label="Conversation with MusA.I"
              aria-live="polite"
              aria-busy={busy}
            >
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`chat__msg chat__msg--${m.role} ${m.error ? "chat__msg--error" : ""}`}
                >
                  <span className="chat__who">
                    {portfolioChat && (
                      <span aria-hidden="true">
                        {m.role === "user" ? "$" : ">"}{" "}
                      </span>
                    )}
                    {m.role === "user" ? "You" : "MusA.I"}
                  </span>
                  <div className="chat__bubble">
                    {m.content ? (
                      renderMarkdown(m.content)
                    ) : (
                      <span
                        className="chat__thinking"
                        role="status"
                        aria-label="MusA.I is thinking"
                      >
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {portfolioChat && suggestions}
          </div>

          {!portfolioChat && suggestions}

          <form
            className="chat__inputrow"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <span className="chat__prompt" aria-hidden>
              {portfolioChat ? ">" : "❯"}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={busy ? "Thinking…" : "Ask MusA.I…"}
              disabled={busy}
              aria-label="Your question"
              enterKeyHint="send"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              data-cursor="hover"
              aria-label="Send question"
            >
              Send <span aria-hidden="true">↵</span>
            </button>
          </form>

          <p className="chat__disclaimer">
            MusA.I answers from my portfolio. For a conversation with me, reach
            me directly at <a href="mailto:mmusa2@wisc.edu">mmusa2@wisc.edu</a>.
          </p>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
