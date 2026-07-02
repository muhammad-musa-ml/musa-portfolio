import { useState } from 'react'
import { profile } from '../../lib/profile'
import { Reveal } from '../ui'

export default function Footer({ onOpenChat }: { onOpenChat: () => void }) {
  const [copied, setCopied] = useState(false)
  const email = profile.email || 'mmusa2@wisc.edu'

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${email}`
    }
  }

  return (
    <footer className="section footer" id="contact">
      <Reveal>
        <p className="mono-label section-kicker">05 · say salaam</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h2 className="footer__title display">
          Let’s build something that <em>matters.</em>
        </h2>
      </Reveal>
      <Reveal delay={0.2}>
        <div className="footer__actions">
          <button className="btn btn--amber" onClick={copyEmail} data-cursor="hover">
            {copied ? '✓ copied to clipboard' : email}
          </button>
          {profile.linkedin && (
            <a
              className="btn btn--ghost"
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              data-cursor="hover"
            >
              linkedin ↗
            </a>
          )}
          <a
            className="btn btn--ghost"
            href={`${import.meta.env.BASE_URL}Muhammad-Musa-Resume.pdf`}
            download
            data-cursor="hover"
          >
            résumé ↓
          </a>
          <button className="btn btn--ghost" onClick={onOpenChat} data-cursor="hover">
            or just ask my AI →
          </button>
        </div>
      </Reveal>
      <Reveal delay={0.3}>
        <p className="footer__colophon mono-label">
          designed & engineered by musa — react · three.js · one honest AI twin —
          press <kbd>/</kbd> anywhere
        </p>
      </Reveal>
    </footer>
  )
}
