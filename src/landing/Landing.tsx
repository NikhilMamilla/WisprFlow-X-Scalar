import { SCHEMES } from '../core'
import './Landing.css'

const LANGUAGES = ['हिन्दी', 'తెలుగు', 'Hinglish']

const STEPS = [
  {
    n: '1',
    title: 'Say a few things about yourself',
    body: 'Speak or type. Age, work, income, and where you live. You can skip anything you are unsure about.',
  },
  {
    n: '2',
    title: 'We check the rules for you',
    body: 'Haq Bolo compares your answers with the written rules of each scheme. No guessing, no agent in the middle.',
  },
  {
    n: '3',
    title: 'Take a list to the office',
    body: 'See which schemes look possible and which do not, with the reason and a printable list of papers to carry.',
  },
]

const STATUS_LABEL: Record<string, string> = {
  VERIFIED: 'Rules checked',
  PARTIAL: 'Partly checked',
  UNVERIFIED: 'Not yet checked',
}

export default function Landing() {
  return (
    <div className="lp">
      <a className="lp-skip" href="#main">
        Skip to main content
      </a>

      <header className="lp-header">
        <a className="lp-brand" href="#top" aria-label="Haq Bolo home">
          <span className="lp-brand-mark" aria-hidden="true">
            हक़
          </span>
          <span>
            <strong>Haq Bolo</strong>
            <small>Your rights, in your language</small>
          </span>
        </a>
        <nav className="lp-nav" aria-label="Main">
          <a href="#how-it-works">How it works</a>
          <a href="#schemes">Schemes</a>
          <a href="#accessibility">Accessibility</a>
          <a className="lp-nav-cta" href="#/start">
            Find schemes
          </a>
        </nav>
      </header>

      <main id="main">
        <section className="lp-hero" id="top">
          <p className="lp-eyebrow">For workers, farmers, families and seniors</p>
          <h1>Government benefits shouldn&rsquo;t be difficult to find.</h1>
          <p className="lp-lede">
            Tell us a little about yourself, in your own language. Haq Bolo asks a few short questions, checks the
            written rules, and shows you which schemes you may be able to use &mdash; and what to carry when you go.
          </p>
          <div className="lp-actions">
            <a className="lp-btn lp-btn-primary" href="#/start">
              Find schemes for me
            </a>
            <a className="lp-btn lp-btn-quiet" href="#how-it-works">
              See how it works
            </a>
          </div>
          <p className="lp-langs">
            Available in{' '}
            {LANGUAGES.map((language, index) => (
              <span key={language}>
                {index > 0 ? ' · ' : ''}
                <span lang={language === 'हिन्दी' ? 'hi' : language === 'తెలుగు' ? 'te' : 'en'}>
                  {language}
                </span>
              </span>
            ))}
          </p>
          <ul className="lp-trust" aria-label="What you can expect">
            <li>
              <strong>No account, no password.</strong> Nothing is saved on a server.
            </li>
            <li>
              <strong>Works without a microphone.</strong> Type the answers if you prefer.
            </li>
            <li>
              <strong>Seven schemes, checked by hand.</strong> We say when something is still unverified.
            </li>
          </ul>
        </section>

        <section className="lp-section" aria-labelledby="why">
          <h2 id="why">Built around the person, not the form</h2>
          <div className="lp-cards">
            <article className="lp-card">
              <h3>Speak, don&rsquo;t type</h3>
              <p>
                Press one button and answer out loud. If the microphone is not available or mishears you twice, the
                app switches to simple Haan / Nahi buttons and a typed box.
              </p>
            </article>
            <article className="lp-card">
              <h3>Plain reasons, in your words</h3>
              <p>
                Every result says why: which rule you meet, which one you do not, and which answer is still missing.
                Rules are code over a fixed dataset, never a guess.
              </p>
            </article>
            <article className="lp-card">
              <h3>Something to take with you</h3>
              <p>
                A printable sheet lists the papers to carry and the office to visit. It is guidance, not an
                application, and it says so.
              </p>
            </article>
          </div>
        </section>

        <section className="lp-section lp-how" id="how-it-works" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ol>
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="lp-step-n" aria-hidden="true">
                  {step.n}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <a className="lp-btn lp-btn-primary" href="#/start">
            Start with your first answer
          </a>
        </section>

        <section className="lp-section" id="schemes" aria-labelledby="schemes-title">
          <h2 id="schemes-title">The schemes in this version</h2>
          <p className="lp-section-lede">
            This is the whole dataset today: seven schemes. Each card shows what the scheme gives and how well its rules
            are checked. It does not show whether you qualify &mdash; that depends on your answers.
          </p>
          <ul className="lp-scheme-list">
            {SCHEMES.map((scheme) => {
              const status = scheme.verification.status
              return (
                <li key={scheme.id} className="lp-scheme">
                  <div className="lp-scheme-top">
                    <h3>{scheme.name_en}</h3>
                    <span className={`lp-badge lp-badge-${status.toLowerCase()}`}>
                      {STATUS_LABEL[status] ?? 'Not yet checked'}
                    </span>
                  </div>
                  <p className="lp-scheme-dept">
                    {scheme.geography.scope === 'central'
                      ? 'All India'
                      : (scheme.geography.authority ?? scheme.geography.states?.join(', ') ?? 'India')}
                  </p>
                  <p>{scheme.benefit_en}</p>
                  <p className="lp-scheme-note">Eligibility is only decided after your answers.</p>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="lp-section lp-access" id="accessibility" aria-labelledby="access">
          <h2 id="access">Made to be usable</h2>
          <ul>
            <li>Large text and large buttons, sized for a phone held at arm&rsquo;s length.</li>
            <li>Keyboard and screen-reader friendly: every control is labelled and focus is always visible.</li>
            <li>No colour-only meaning; status words are written out.</li>
            <li>Respects your system&rsquo;s reduced-motion setting.</li>
            <li>One question and one action at a time, with a Back button that never loses an answer.</li>
          </ul>
        </section>
      </main>

      <footer className="lp-footer">
        <div>
          <strong>Haq Bolo</strong>
          <p>
            A prototype by Team Abhyudaya. It is guidance, not an application, and it is not an official government
            service.
          </p>
        </div>
        <nav aria-label="Footer">
          <a href="#/start">Find schemes</a>
          <a href="#how-it-works">How it works</a>
          <a href="#accessibility">Accessibility</a>
        </nav>
      </footer>
    </div>
  )
}
