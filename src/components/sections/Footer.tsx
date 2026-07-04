import { useState } from 'react'
import { profile } from '../../lib/profile'
import { PALETTE_KEY } from '../../lib/platform'
import { Reveal, Magnetic } from '../ui'

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

  const resumeHref = profile.resume_pdf
    ? `${import.meta.env.BASE_URL}${profile.resume_pdf.replace(/^\//, '')}`
    : null

  return (
    <footer className="section footer" id="contact">
      <Reveal>
        <p className="mono-label section-kicker">05 · get in touch</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h2 className="footer__title display">
          Let’s build something that <em>matters.</em>
        </h2>
      </Reveal>

      {profile.availability && (
        <Reveal delay={0.15}>
          <p className="footer__availability mono-label">
            <span className="footer__availability-dot" aria-hidden />
            {profile.availability}
          </p>
        </Reveal>
      )}

      <Reveal delay={0.2}>
        <div className="footer__actions">
          <Magnetic className="footer__ai-cta">
            <button className="btn btn--twin" onClick={onOpenChat} data-cursor="hover">
              <span className="btn__pulse" aria-hidden />
              ask my AI twin
              <kbd>/</kbd>
            </button>
          </Magnetic>
          <button className="btn btn--ghost" onClick={copyEmail} data-cursor="hover">
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
          {profile.github && (
            <a
              className="btn btn--ghost"
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              data-cursor="hover"
            >
              github ↗
            </a>
          )}
          {profile.orcid && (
            <a
              className="btn btn--ghost"
              href={profile.orcid}
              target="_blank"
              rel="noreferrer"
              data-cursor="hover"
            >
              orcid ↗
            </a>
          )}
          {resumeHref && (
            <a className="btn btn--ghost" href={resumeHref} download data-cursor="hover">
              download résumé ↓
            </a>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.3}>
        <p className="footer__colophon mono-label">
          built with react, three.js, and a lot of coffee — the AI twin runs on free,
          local-first models — <kbd>{PALETTE_KEY}</kbd> palette · <kbd>/</kbd> twin · <kbd>1</kbd>–<kbd>5</kbd> jump sections
        </p>
      </Reveal>
    </footer>
  )
}
