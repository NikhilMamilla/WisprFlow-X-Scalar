# Haq Bolo

*Speak your rights.* A voice-first scheme finder for India's informal workers. The worker talks, the app asks a few short follow-up questions, then says which government schemes to chase first and prints a sheet of what to carry.

Built for Scaler x Wispr Flow "India Runs on Voice", Round 2 (Team Abhyudaya).

## Run it

```
docker compose up
```

Then open http://localhost:3000. No `.env` file is required: the app runs fully without any API key. See `.env.example` for the optional `LLM_API_KEY`.

Without Docker:

```
npm ci
npm run dev
```

The production server (`npm run build && npm run server`) serves the built frontend and `GET /healthz`.

## What it does

- Pick a language: Hindi, Telugu or Hinglish.
- Say your situation (or type it, or play the sample story).
- The app extracts age, work, income, city/village, bank account and a few yes/no facts.
- It asks at most four follow-ups, one at a time, and reads age and income back before using them.
- It matches the profile against the scheme catalogue with plain code and explains each result: why you qualify, which rule failed, what is still unknown, or what to do first.
- Results are grouped as: do this first, you qualify, unlocks after, maybe, not currently eligible.
- If a scheme depends on where you live, the app asks for your state (and district) — once, in your language — and never treats "don't know" as a rejection. National schemes never ask.
- A printable sheet lists the documents to carry. It says on it that it is guidance, not an application.

It deliberately does **not** depend on an LLM. Eligibility is deterministic and explainable.

## Languages

| Picker | Recognition | Speech output | UI text |
| --- | --- | --- | --- |
| Hindi | `hi-IN` | `hi-IN` | Devanagari Hindi |
| Telugu | `te-IN` | `te-IN` when a Telugu voice exists, otherwise text only with a notice | Telugu |
| Hinglish | `hi-IN` (Hinglish speech is mostly Hindi words) | `en-IN` | Roman Hindi |

Every user-facing string lives in `src/i18n/strings.ts`. Telugu UI text is written but **needs native review**; it is marked in the file. Scheme content falls back Telugu -> Hindi, never to English or Roman script (`src/core/localization.ts`).

## Pilot plan (targets, not results)

The first target is about 200 street vendors and construction workers in two or three markets and labour adda points in Hyderabad, using the Telugu and Hindi voice flow. The measures we would use: at least 80% finish a session without help, a CSC operator agrees with at least 95% of 50 reviewed sessions, and at least 40% of workers contacted after 30 days enrolled in one scheme. These are targets. There is no baseline or pilot data yet.

## What it depends on

- **Speech:** the browser's Web Speech API. On Chrome, recognition is done by the browser vendor's speech service, so audio leaves the device; the About screen says so. If recognition is unavailable, fails twice or the microphone is denied, the app falls back to typed input, Haan/Nahi buttons and a "Play sample" story.
- **No AI model and no paid API.** Matching is plain code over the scheme data. The app needs no key. `/api/extract` returns 501 ("key not set") and nothing depends on it.
- **Hosting:** the matching runs in the browser, so the built `dist/` can be served by any static host as well as by the included Express server and Docker setup.
- **Data:** a hand-checked JSON catalogue with a source link and a check date on every scheme. If an official source changes, the affected scheme is flagged and re-checked; rules we could not confirm are shown as unverified.

## Scheme catalogue

Seven hand-built schemes in `data/schemes.json`: six national ones (e-Shram, PM-SYM, PMSBY, PMJJBY, PM SVANidhi, PM Jan Dhan Yojana) and one Telangana scheme (the Telangana Building and Other Construction Workers Welfare Board registration, for construction workers). The Telangana record comes from the team's research register; it is described only as a registration, with no benefit amounts, because the Board has not published its claim procedure. PM Jan Dhan is also a prerequisite: insurance and pension need a bank account in the user's own name.

Each scheme record carries identity (id, aliases), classification (category, tags, beneficiary groups), geography (central / state / UT / multi-state / district), boolean-field eligibility rules, documents, optional application and structured benefit data, and verification metadata (status, check date, sources).

That catalogue is not comprehensive and is not an official decision. It is the prototype's dataset.

New schemes are added as data. Research files (a scheme object, an array, or `{ "schemes": [...] }`) are validated against the whole catalogue and merged atomically:

```
npm run import:catalogue -- research/file.json          # dry run: report only
npm run import:catalogue -- research/file.json --write  # merge and write
```

One invalid scheme rejects the whole batch and leaves the catalogue untouched. A `VERIFIED` status needs a check date, and a lapsed verification loads as `OUTDATED` instead of reading as current. See `docs/ARCHITECTURE.md` for the format.

## Research register

Schemes are researched before they are imported, and that work has its own register: `data/research/records.json` holds research records, a source register and coverage claims. It is not part of the app bundle and it does not change the six bundled schemes.

A record moves through `DISCOVERED`, `CATALOGUED`, `SOURCE_IDENTIFIED`, `OFFICIALLY_VERIFIED`, `ELIGIBILITY_VERIFIED`, `READY_FOR_IMPORT` and `IMPORTED` (with `NEEDS_RESEARCH`, `CONFLICTING`, `OUTDATED`, `CLOSED` for exceptions). Reaching a status never implies eligibility was verified: that needs evidence, and a status change never alters the verification status. Relationships between records (`STATE_IMPLEMENTATION_OF`, `STATE_TOPUP_OF`, `DUPLICATE_RECORD`, ...) are recorded explicitly; nothing merges because two names look alike. An aggregator portal may be a discovery source but cannot serve as eligibility evidence.

```
npm run research -- validate                       # research rules + catalogue cross-check
npm run research -- coverage                       # coverage by state, UT, group, category
npm run research -- gaps                           # what has not been researched
npm run research -- list --status NEEDS_RESEARCH
npm run research -- list --conflicts --missing-sources
npm run research -- show research-eshram
npm run research -- export --out research-export.json
```

The first campaign covered Telangana: 23 state records and an evidence audit of the six central schemes ([docs/RESEARCH_TELANGANA.md](docs/RESEARCH_TELANGANA.md)). A discovery expansion then catalogued 59 more programmes from official pages ([docs/RESEARCH_TELANGANA_DISCOVERY.md](docs/RESEARCH_TELANGANA_DISCOVERY.md)), so the register now holds 88 records: 75 Telangana state and 13 central. A verification pass then took 20 of those records to evidence-backed status, 6 of them fully verified ([docs/RESEARCH_VERIFICATION_M9_3.md](docs/RESEARCH_VERIFICATION_M9_3.md)). Only the original six central schemes are in the eligibility catalogue; every Telangana record is research, not catalogue data.

Coverage statuses are `COVERED`, `PARTIAL`, `NOT_RESEARCHED`, `NONE_FOUND` and `NEEDS_MORE_RESEARCH`. `NONE_FOUND` records that a search found nothing; it is never proof that no scheme exists, and the report says so. Counts come only from the register. Discovery and research are counted separately: a programme seen once on a listing page is a discovery, not coverage. No state other than Telangana has research yet, and no district has been studied.

## Eligibility engine

`src/core/rules.ts` compiles a scheme's JSON rules into checks once, then evaluates them:

- `age_min`, `age_max`, `income_max_monthly`, `occupation_in`, `urban_only`
- `not` (a boolean fact must be false), `requires` (a boolean fact must be true)
- `only_if` (a scheme is inapplicable unless a fact holds, checked first)
- geography (a state scheme does not apply outside its states)

Missing information is never treated as a pass or a fail. Each result carries one structured `RuleEvaluation` per condition with expected value, actual value, `pass` / `fail` / `unknown`, whether the condition was a prerequisite, and whether the rule set is verified. Statuses: `qualifies`, `needs_prerequisite`, `needs_info`, `does_not_qualify`, `not_needed`, `not_applicable`.

## Verification

Verification is separate from eligibility. Statuses: `VERIFIED`, `PARTIALLY_VERIFIED`, `UNVERIFIED`, `OUTDATED`, `DISCONTINUED`, `UNKNOWN`. `rules_verified` is derived from that status at load time. A scheme whose rules are not fully verified is shown as a possible match to confirm at the office, never as a guarantee. A `DISCONTINUED` scheme is not offered.

## Testing

```
npx vitest run src/core src/i18n   # engine, catalogue, geography, search, localization
npx tsc -b                         # type check
npm run validate:catalogue -- data/schemes.json
npm run import:catalogue -- <research.json>   # dry-run an import (add --write to apply)
npm run bench:catalogue            # optional: registry/match/search timings
```

`npm run gate` (type check + full unit suite + Docker build) is run only when explicitly asked. There are no automated browser or microphone tests; voice behaviour is checked by hand using `docs/MANUAL_TESTS.md`.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data model, registry, rule evaluation, dependency handling, import validation and data flow.

## Privacy

- The core engine runs in the browser. The user's story, profile and results are not sent to this app's server.
- Speech recognition and synthesis use the browser's own Web Speech API. On Chrome that is typically a remote vendor service; the About screen says so and does not claim recognition is local.
- Nothing is persisted: no local storage, no cookies, no analytics, no tracking, no accounts.
- The server logs only its listening port. `/api/extract` returns 501 while no key is configured and the app works without it.
- Source links open in a new tab with `rel="noreferrer"`.

## Known limitations

- Seven schemes only; rules are hand-built and two of them (e-Shram, PM SVANidhi) are explicitly only partially verified.
- Some `source_url` values are the closest official document the team had, not necessarily the scheme's own page; the catalogue validator warns about non-government domains.
- District-level schemes can be evaluated from a user-supplied district, but there is no bundled district list, so a district is compared only as text against what a scheme declares. An Indic-script district is treated as unverified rather than guessed.
- Only one state scheme (Telangana construction workers) is in the catalogue. The state question appears only when a scheme needs it; everyone else is never asked.
- Telugu translations need native review.
- Browser support depends on the Web Speech API; typed input and the sample story work without a microphone.
