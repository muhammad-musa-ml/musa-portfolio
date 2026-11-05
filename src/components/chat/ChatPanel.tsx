import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { askTwin, ChatRequestError, type ChatMessage, type ChatSource } from "../../lib/ai";
import { navigate } from "../../lib/router";
import { ChatLink, renderMarkdown, safeHref } from "./markdown";
import { TRACE_TIMING } from "../../portfolio/motion/timing";
import "../../styles/chat.css";

type Msg = {
  id: number;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "complete" | "stopped" | "error";
  issue?: string;
  retryable?: boolean;
  request?: ChatMessage[];
  mode?: "model" | "portfolio";
  localFallback?: boolean;
  sources?: ChatSource[];
};

const SUGGESTIONS = [
  "What is WUMI Health?",
  "Walk me through your LLM safety research",
  "What’s resume-gauntlet?",
  "Can I try your Kaiju Cats planner?",
  "What are you looking for in your next role?",
];

const GREETING = "**Hi, I’m MusA.I.** Musa’s AI twin. Ask me about his work, technical decisions, or experience.";

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
    { id: 0, role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followReply = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSent = useRef(false);
  const nextId = useRef(1);
  const mounted = useRef(true);
  const active = useRef<{ id: number; controller: AbortController; cancelFrame: () => void } | null>(null);
  const windowRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const reduceMotion = useReducedMotion();
  const portfolioChat = transitionStyle === "trace";

  useEffect(() => {
    mounted.current = true;
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
      ).filter((control) => control.getClientRects().length > 0);
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
      mounted.current = false;
      active.current?.controller.abort();
      active.current?.cancelFrame();
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && followReply.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const runRequest = async (history: ChatMessage[], id: number) => {
    const controller = new AbortController();
    let content = "";
    let mode: Msg["mode"];
    let localFallback = false;
    let sources: ChatSource[] = [];
    let frame: number | undefined;
    let timer: number | undefined;
    const cancelFrame = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
      frame = timer = undefined;
    };
    const flush = () => {
      cancelFrame();
      if (!mounted.current || active.current?.id !== id) return;
      setMsgs((messages) => messages.map((message) => message.id === id
        ? { ...message, content, mode, sources, localFallback }
        : message));
    };
    const schedule = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(flush);
      // Browsers pause animation frames in hidden tabs. Do not hold replies there.
      timer = window.setTimeout(flush, 80);
    };
    active.current = { id, controller, cancelFrame };
    followReply.current = true;
    setBusy(true);
    try {
      for await (const event of askTwin(history, { signal: controller.signal })) {
        if (controller.signal.aborted) break;
        if (event.type === "delta") content += event.text;
        else if (event.type === "meta") {
          mode = event.mode;
          localFallback = event.reason === "unavailable";
        }
        else if (event.type === "sources") {
          sources = event.sources.filter((source, index, all) =>
            safeHref(source.url) && all.findIndex((item) => item.url === source.url) === index);
        }
        schedule();
      }
      if (controller.signal.aborted) throw new DOMException("Response stopped", "AbortError");
      if (!content.trim()) throw new ChatRequestError("empty", "No response arrived. Try again.");
      flush();
      if (mounted.current) setMsgs((messages) => messages.map((message) =>
        message.id === id ? { ...message, status: "complete" } : message));
    } catch (err) {
      flush();
      const stopped = controller.signal.aborted;
      const issue = stopped ? "Response stopped." :
        err instanceof ChatRequestError ? err.message :
          content ? "Connection interrupted." : "Couldn’t connect. Try again.";
      if (mounted.current) setMsgs((messages) => messages.map((message) =>
        message.id === id ? {
          ...message, status: stopped ? "stopped" : "error", issue,
          retryable: !(err instanceof ChatRequestError) || err.retryable,
        } : message));
    } finally {
      cancelFrame();
      if (active.current?.id === id) active.current = null;
      if (mounted.current) {
        setBusy(false);
        inputRef.current?.focus();
      }
    }
  };

  const send = (text: string) => {
    const question = text.trim().slice(0, 4000);
    if (!question || active.current) return;
    setInput("");
    const history: ChatMessage[] = [
      ...msgs.filter((message) => message.id !== 0 && message.content.trim())
        .map(({ role, content }) => ({ role, content })),
      { role: "user", content: question },
    ];
    const userId = nextId.current++;
    const replyId = nextId.current++;
    setMsgs((messages) => [
      ...messages,
      { id: userId, role: "user", content: question },
      { id: replyId, role: "assistant", content: "", status: "streaming", request: history },
    ]);
    void runRequest(history, replyId);
  };

  const retry = (message: Msg) => {
    if (active.current || !message.request) return;
    const id = message.content ? nextId.current++ : message.id;
    const reply: Msg = { id, role: "assistant", content: "", status: "streaming", request: message.request };
    // Keep every partial answer visible. An empty failed attempt can be reused.
    setMsgs((messages) => message.content ? [...messages, reply] :
      messages.map((item) => item.id === message.id ? reply : item));
    void runRequest(message.request, id);
  };

  const openLink = (href: string) => {
    onClose();
    navigate(href);
  };

  // auto-ask a question handed in from the ⌘K palette
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() && !autoSent.current) {
      const timer = window.setTimeout(() => {
        autoSent.current = true;
        send(initialQuestion);
      }, 0);
      return () => clearTimeout(timer);
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
                  key={m.id}
                  className={`chat__msg chat__msg--${m.role}`}
                >
                  <span className="chat__who">
                    {portfolioChat && (
                      <span aria-hidden="true">
                        {m.role === "user" ? "$" : ">"}{" "}
                      </span>
                    )}
                    {m.role === "user" ? "You" : "MusA.I"}
                  </span>
                  {(m.content || m.status === "streaming") && <div className="chat__bubble">
                    {m.mode === "portfolio" && (
                      <span className="chat__reply-context">
                        Matching portfolio notes{m.localFallback ? " · live answers unavailable" : ""}
                      </span>
                    )}
                    {m.content ? (
                      renderMarkdown(m.content, { onNavigate: openLink })
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
                    {!!m.sources?.length && (
                      <div className="chat__sources" aria-label="Sources">
                        {m.sources.map((source) => (
                          <ChatLink key={source.url} href={source.url} onNavigate={openLink}>
                            {source.label}<span aria-hidden="true"> ↗</span>
                          </ChatLink>
                        ))}
                      </div>
                    )}
                  </div>}
                  {m.issue && (
                    <div className="chat__reply-status" role="status">
                      <span>{m.issue}</span>
                      {m.retryable && i === msgs.length - 1 && (
                        <button type="button" disabled={busy} onClick={() => retry(m)}>
                          Retry
                        </button>
                      )}
                    </div>
                  )}
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
              placeholder="Ask MusA.I…"
              maxLength={4000}
              aria-label="Your question"
              enterKeyHint="send"
            />
            {busy ? <button
              type="button"
              className="chat__stop"
              onClick={() => active.current?.controller.abort()}
              aria-label="Stop response"
              data-cursor="hover"
            >
              <span aria-hidden="true">■</span> Stop
            </button> : <button
              type="submit"
              disabled={!input.trim()}
              data-cursor="hover"
              aria-label="Send question"
            >
              Send <span aria-hidden="true">↵</span>
            </button>}
          </form>

          <p className="chat__disclaimer">
            Reach Musa at <a href="mailto:mmusa2@wisc.edu">mmusa2@wisc.edu</a>.
          </p>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
