import { SCHEMES } from '../core'
import './Landing.css'

const LANGUAGES: { label: string; lang: string }[] = [
  { label: 'हिन्दी', lang: 'hi' },
  { label: 'తెలుగు', lang: 'te' },
  { label: 'Hinglish', lang: 'en' },
]

const STEPS = [
  { title: 'Say it your way', body: 'Speak or type your age, work and where you live. Skip anything you are unsure of.' },
  { title: 'We check the written rules', body: 'Plain rules, no guessing. Every result shows why and where it came from.' },
  { title: 'Take a list to the office', body: 'A printable sheet shows what to carry and which scheme to start with.' },
]

const STATUS_LABEL: Record<string, string> = {
  VERIFIED: 'Rules checked',
  PARTIALLY_VERIFIED: 'Partly checked',
  PARTIAL: 'Partly checked',
  UNVERIFIED: 'Not yet checked',
}

function levelTag(scope: string, states?: string[]): string {
  if (scope === 'central') return 'All India'
  return states && states.length > 0 ? states.join(', ') : 'State'
}

export default function Landing() {
  return (
    <div className="lp theme-night">
      <a className="lp-skip" href="#main">
        Skip to main content
      </a>

      <header className="lp-header">
        <a className="lp-brand" href="#top" aria-label="Haq Bolo home">
          <span className="lp-mark" aria-hidden="true">
            हक़
          </span>
          <strong>Haq Bolo</strong>
        </a>
        <a className="btn btn-primary lp-cta-small" href="#/start">
          Find schemes
        </a>
      </header>

      <main id="main">
        <section className="lp-hero" id="top">
          <p className="eyebrow lp-eyebrow">For workers, farmers, families and seniors</p>
          <h1>
            Government benefits shouldn&rsquo;t be <span className="accent">difficult</span> to find.
          </h1>
          <p className="lp-lede">
            Speak in your own language. Haq Bolo checks the written rules and tells you which schemes to chase first,
            and what papers to carry.
          </p>
          <a className="btn btn-primary lp-cta" href="#/start">
            Find schemes for me
          </a>
          <p className="lp-langs">
            Available in{' '}
            {LANGUAGES.map((l, index) => (
              <span key={l.label}>
                {index > 0 ? ' · ' : ''}
                <span lang={l.lang}>{l.label}</span>
              </span>
            ))}
          </p>
          <ul className="lp-trust" aria-label="What to expect">
            <li>No account needed</li>
            <li>Works without a microphone</li>
            <li>Source on every match</li>
          </ul>
        </section>

        <section className="lp-section" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ol className="lp-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="lp-step-n" aria-hidden="true">
                  {index + 1}
                </span>
                <span>
                  <strong>{step.title}</strong>
                  <span className="lp-step-body">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-section" aria-labelledby="schemes-title">
          <h2 id="schemes-title">Seven schemes in this version</h2>
          <p className="lp-section-lede">
            Hand-checked and linked to official sources. Eligibility is only decided after your answers.
          </p>
          <ul className="lp-scheme-list">
            {SCHEMES.map((scheme) => (
              <li key={scheme.id} className="lp-scheme">
                <span className="lp-scheme-name">{scheme.name_en}</span>
                <span className="lp-scheme-meta">
                  <span className="lp-tag">{levelTag(scheme.geography.scope, scheme.geography.states)}</span>
                  <span className="lp-status">{STATUS_LABEL[scheme.verification.status] ?? 'Not yet checked'}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="lp-footer">
        <p>
          A prototype by Team Abhyudaya. Guidance, not a government decision, and not an official government service.
          Your voice is processed by your browser&rsquo;s speech service.
        </p>
      </footer>
    </div>
  )
}
