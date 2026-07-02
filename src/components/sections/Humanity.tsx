import { profile } from '../../lib/profile'
import { Reveal, SectionHeader } from '../ui'

const ICONS: Record<number, string> = { 0: '⌂', 1: '⛨', 2: '◍', 3: '⚿', 4: '⚙' }

export default function Humanity() {
  return (
    <section className="section humanity" id="humanity">
      <div className="humanity__halo" aria-hidden />
      <SectionHeader
        index="04"
        kicker="ai for humanity"
        title={
          <>
            Intelligence is only worth building if it{' '}
            <em style={{ color: 'var(--amber)' }}>reaches people.</em>
          </>
        }
      />

      <div className="humanity__grid">
        <Reveal>
          <blockquote className="humanity__quote display">
            “I grew up watching brilliant people lose time, health, and opportunity to
            systems that simply didn’t see them. Every model I train, every record I
            digitize, every language I bring online is a small correction to that.”
          </blockquote>
          <p className="humanity__quote-attr mono-label">— the thread through all of it</p>
        </Reveal>

        <div className="humanity__themes">
          {profile.ai_for_humanity.themes.map((t, i) => (
            <Reveal key={i} delay={0.08 * i}>
              <div className="humanity__theme">
                <span className="humanity__theme-icon" aria-hidden>
                  {ICONS[i] ?? '✦'}
                </span>
                <p>{t}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="humanity__evidence">
        <Reveal>
          <p className="mono-label" style={{ marginBottom: '1.5rem' }}>
            receipts, not slogans
          </p>
        </Reveal>
        <div className="humanity__evidence-grid">
          {profile.ai_for_humanity.evidence.slice(0, 6).map((e, i) => (
            <Reveal key={i} delay={Math.min(i * 0.06, 0.3)}>
              <div className="humanity__evidence-card">
                <span className="humanity__evidence-index mono-label">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p>{e}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
