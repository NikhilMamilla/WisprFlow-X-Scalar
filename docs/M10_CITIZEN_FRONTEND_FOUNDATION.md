# M10 — Citizen-facing frontend foundation

Date: 28 November 2026. The product already had a working citizen flow; M10 adds the missing public entry point and documents what exists, rather than rebuilding screens that were already shipped and tested.

## 1. Architecture audit

| Question | Finding |
| --- | --- |
| Frontend framework | Vite 8 + React 19, TypeScript, already installed |
| Entry | `src/main.tsx` → `src/App.tsx`; hash routing only, no router dependency |
| Existing routes | `#/diagnostic` → `DiagnosticPage`; everything else → `Flow` |
| Existing screens | `LanguageScreen`, `StoryScreen`, `QuestionScreen`, `ResultsScreen`, `SheetScreen`, `AboutScreen`, `ConflictScreen` |
| Existing components | `Header`, `Footer`, `Waveform`, `DotField`, `HelloBubbles`, `WhatIUnderstood` |
| Core reuse | `Flow` already imports `initialState`/`step` from `src/core`, the answer parsers, and speaks through `voice/`; results are real matches, not mock |
| Design system | `theme.css` tokens: cream surfaces, deep green `--green`, DM Sans / DM Serif / Plus Jakarta, Devanagari + Telugu fonts, 20px body floor |
| Backend | tiny Express server serving the build; no frontend consumption needed for this milestone |
| What must stay untouched | eligibility engine (`matcher`, `rules`), `data/schemes.json`, journey core, research data |

So the gap was not "no frontend"; it was **no front door**: a first-time citizen landed straight in a microphone permission prompt.

## 2. What was built

**Landing page** (`src/landing/Landing.tsx`, `Landing.css`) — the public page:

1. Header with brand, section links and a "Find schemes" shortcut.
2. Hero: "Government benefits shouldn't be difficult to find.", the plain-language explanation, primary CTA **Find schemes for me** (`#/start`), secondary **See how it works**, and the three supported languages in their own scripts.
3. Honest trust strip: no account, works without a microphone, six hand-checked schemes, unverified things labelled.
4. Three feature cards (voice-first input, plain reasons, printable paper list).
5. How-it-works: three numbered steps.
6. Scheme preview built from `SCHEMES` — real names, real benefit text, real scope and `verification.status` badge (Rules checked / Partly checked / Not yet checked). It states that eligibility is only decided after the answers, and shows no eligibility result.
7. Accessibility section and a footer that says it is a prototype, guidance not an application, and not an official government service.

**Routing change** (`src/App.tsx`): default is the landing page; `#/start` enters the existing Flow; `#/diagnostic` is unchanged. The journey itself was not touched or duplicated.

## 3. Citizen experience flow

Landing → **Find schemes for me** → language screen → voice/typed story → at most four follow-ups with progress → results with reasons → printable sheet → About. Back, skip, revisit and correction are handled by the existing screens and core; M10 added no second state machine.

## 4. Reused rather than rebuilt

Question cards, progress indicator, answer controls, result cards and status labels already exist in `QuestionScreen` and `ResultsScreen`, backed by the eligibility engine and the six-scheme dataset. Adding parallel components would have created unused abstractions, so the landing was built to hand over to them. This also keeps the "no fake eligibility" rule: there is exactly one place that decides results.

## 5. Design system

Reuses `theme.css` tokens — cream `--cream`, deep green `--green`, warm line `--line`, heading/body fonts, `--size-body-min: 20px`, shared radii. New classes are namespaced `lp-` so the existing flow's styles cannot collide. No gradients, no glass, no dark theme, no animation beyond a 1px press and colour transitions.

## 6. Responsive and accessibility

- Mobile-first: fluid type with `clamp()`, single-column grids below 720px, full-width buttons, static (not sticky) header on small screens.
- Semantic landmarks (`header`, `main`, `footer`, `nav` with labels), one `h1`, ordered lists for steps.
- Skip link, `:focus-visible` outlines at 3px, 56px buttons, visible focus, `aria-label` on navigation.
- Status is written, not colour-only; badges carry text.
- `prefers-reduced-motion` disables transitions.
- Contrast: ink `#1a1a1a` on cream `#ffffeb`, green `#034f46` on cream for CTAs.

## 7. Testing and validation

- New `src/landing/Landing.test.tsx` (5 tests, server-rendered): headline and CTA, steps and honest limitation wording, exactly six real scheme cards with no "You qualify" text, only the three supported languages, and accessible structure.
- `tsc -b` clean; full suite 672 tests pass (28 files); lint 0 errors (2 pre-existing warnings); `vite build` succeeds; research validation 98 records / 108 sources.
- Docker was **not** rebuilt for this change: the repo's token rules reserve the Docker gate for the explicit GATE word. The landing adds no runtime dependency, so the existing image build is unaffected.

## 8. Known limitations

- The landing was verified by markup tests and a production build, not by a human looking at it on a phone. Visual review is still needed.
- No router: hash links only, so deep links are simple but SEO is not a goal.
- The scheme preview is a static list of the real dataset; it does not run eligibility.
- Benefits on cards are the dataset's English text; the landing is not translated.

## 9. M11 integration points

- `#/start` is the single handover point to the journey; a future screen can replace Flow without touching the landing content.
- The landing's scheme list maps 1:1 to `SCHEMES`, so a future results preview can reuse the same badge labels.
- Voice, LLM and translation remain unimplemented and are not referenced by the landing beyond the language names it actually supports.

## 10. Files

Created: `src/landing/Landing.tsx`, `src/landing/Landing.css`, `src/landing/Landing.test.tsx`, this document.
Modified: `src/App.tsx` (default route), `PLAN.md`.
Unchanged: `data/schemes.json`, `src/core/*`, `src/Flow.tsx`, `src/screens/*`, research data.
