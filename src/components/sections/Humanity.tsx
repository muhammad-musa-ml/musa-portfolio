import { profile } from '../../lib/profile'
import { Reveal, SectionHeader } from '../ui'

const ICONS: Record<number, string> = { 0: '⌂', 1: '⛨', 2: '◍', 3: '⚿', 4: '⚙' }

export default function Humanity() {
  const { why, themes, evidence } = profile.ai_for_humanity

  return (
    <section className="section humanity" id="humanity">
      <div className="humanity__halo" aria-hidden />
      <SectionHeader
        index="06"
        kicker="ai for humanity"
        title={
          <>
            Intelligence is only worth building if it{' '}
            <em style={{ color: 'var(--amber)' }}>reaches people.</em>
          </>
        }
      />

      {why && (
        <div className="humanity__quote-wrap">
          <Reveal>
            <span className="humanity__glyph" aria-hidden>”</span>
            <blockquote className="humanity__quote display">{why}</blockquote>
            <p className="humanity__quote-attr mono-label">— the thread through all of it</p>
          </Reveal>
        </div>
      )}

      {themes && themes.length > 0 && (
        <div className="humanity__themes">
          {themes.map((t, i) => (
            <Reveal key={i} delay={0.06 * i}>
              <div className="humanity__theme" data-cursor="hover">
                <span className="humanity__theme-icon" aria-hidden>
                  {ICONS[i] ?? '✦'}
                </span>
                <p>{t}</p>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <div className="humanity__evidence">
        <Reveal>
          <p className="mono-label" style={{ marginBottom: '1.5rem' }}>
            receipts, not slogans
          </p>
        </Reveal>
        <div className="humanity__evidence-grid">
          {evidence.slice(0, 6).map((e, i) => (
            <Reveal key={i} delay={Math.min(i * 0.06, 0.3)}>
              <div className="humanity__evidence-card" data-cursor="hover">
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
