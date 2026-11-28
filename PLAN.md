# Plan (Fri 27 Nov to Mon 30 Nov 2026, IST)

Each milestone ends with a short report and a human check. Run GATE only when told.

## M0 - Scaffold and Docker (Fri)
Vite + React + TS app, Express server, Dockerfile (multi-stage), docker-compose.yml, .gitignore, .env.example (LLM_API_KEY empty and optional), README stub, git init and first push.
Done when: `docker compose up` serves a "Haq Bolo" placeholder page at localhost:3000 with no env file present.

## M1 - Voice spike (Fri)
One diagnostic page: pick hi-IN / te-IN / en-IN, mic button, live transcript with confidence, "speak this text" button, a list of available speechSynthesis voices for the chosen language, a typed-transcript fallback box. No product logic.
Done when: a human confirms on their own Android Chrome and laptop Chrome which languages recognise and which have a voice (write the findings into docs/VOICE_FINDINGS.md).

## M2 - Core engine (Sat morning)
src/core: Profile type, rule-based extractor (number words in Hindi/Telugu/Hinglish, occupation lexicon, yes/no, income and age phrases), matcher over data/schemes.json with pass/fail reasons per rule, follow-up question picker. Vitest unit tests with at least 30 transcript cases across the three languages.
Done when: `npx vitest run src/core` passes. This is the only automated test suite.

## M2.1 - Patch after review (Fri)
Add PM Jan Dhan (a bank account in your own name) as a sixth scheme. A missing prerequisite (no bank account, no Aadhaar) is NOT "does not qualify": it is a new status "needs_prerequisite" that says what to do first, so the demo story ("account is in my brother's name") ends with "open your own Jan Dhan account first, then insurance and pension unlock". Also fix "main 35 ka hoon" and salary words.

## M3 decisions (made in review, build to these)
- Merging answers: a later non-null answer overrides an earlier one. If one utterance contains two different values for a field, store null and ask "which one is right". A value the user confirmed at read-back is locked and never overwritten by the extractor.
- Occupation follow-up: never ask "street vendor, yes or no?". Ask an open question ("Aap kya kaam karte hain?") and run the extractor on the answer, with big buttons as backup: thela or rehdi, construction, delivery, other.
- Read-back: after the story, read back age and monthly income whenever they were extracted, before any matching. Say "roughly" for estimated income.
- Screen and spoken text: one strings file per language keyed by scheme id, rule id and status. Hindi and English first. Telugu strings marked for native review.

## M3 - The flow UI (Sat)
Screens: language pick, speak, live profile fill, follow-up question with read-back, results (spoken and cards), printable sheet. State machine in src/core. Mobile first.
Voice requirements found in the M1 review:
- recognition.ts currently uses continuous=false and reports only the LAST result. For a 40 second story, accumulate every final result into one transcript and auto-restart recognition when it ends early (Android Chrome stops after short pauses). Do not rely on continuous=true alone on Android; test both.
- Add abort() to the recognizer wrapper (needed for interruption handling in M4).
- Mic access needs HTTPS or localhost. Phone testing uses the deployed HTTPS link.
Done when: a human completes the sample story end to end by voice on a phone.

## M4 - Failure handling (Sun morning)
Low confidence or empty transcript message, two-failure fallback to Haan/Nahi, silence prompts at 6s and 12s, interruption (speechSynthesis.cancel on mic tap), contradiction handling, off-topic steer-back, "Play sample" mode, About screen with honesty notes.
Done when: each case in docs/MANUAL_TESTS.md passes by hand.

## M5 - Scheme intelligence and scalable catalogue foundation (implemented)
Data model, registry, compiled rule engine with structured explanations, verification model, dependency graph, catalogue validation/import CLI, localization fallback, filtering foundation. See docs/ARCHITECTURE.md.

Status:
- Completed: scheme model (identity, classification, geography, beneficiary groups, structured benefits/application/documents, dependencies, verification + sources); centralized registry with id/alias/category/state indexes; rules compiled once and evaluated into `pass`/`fail`/`unknown` explanations; statuses `qualifies`, `needs_prerequisite`, `needs_info`, `does_not_qualify`, `not_needed`, `not_applicable`; geographic applicability; `DISCONTINUED` schemes withheld; field and scheme-id dependencies with cycle/missing-id detection; `validateCatalogue` + `npm run validate:catalogue`; catalogue filters; 60 new unit tests.
- Preserved: the six schemes, their rule values and their outcomes; results UI, sheet, About screen, flow, speech handling.
- Not done in M5: no real state/central expanded dataset (deliberately); district matching (the profile has no district field); no database/backend (static catalogue is sufficient for this stage); native Telugu review; browser and microphone tests.
- Verification: `npx tsc -b` clean, `npx vitest run src/core src/i18n` 389 passing, catalogue CLI on data/schemes.json, production build.

## M6 - Geography-aware eligibility and catalogue scalability (implemented)
State/UT and district on the profile, one shared state table with normalisation, a geography evaluator inside the existing matcher, contextual location follow-ups with correction, registry district index and a catalogue search layer. See docs/ARCHITECTURE.md.

Status:
- Completed: `src/core/geo.ts` (28 states + 8 UTs, names/codes/aliases in Roman, Devanagari and Telugu, NFKC + case + spacing normalisation); `src/core/geography.ts` (applicable / not applicable / unknown state / unknown district / invalid metadata); `state` and `district` profile fields; state/district follow-ups asked only when a scheme needs them, with skip, re-ask on an unrecognised place and a location correction that re-evaluates; `src/core/search.ts` over names, aliases, category, tags, beneficiary groups, states and benefit text; district/state indexes and filters; validator checks for district scope, unknown state names, duplicate districts and the absence of a verified district table; new strings in hi/te/en.
- Preserved: the six schemes and their outcomes, story extraction, read-back, the four-question cap, results, sheet, languages and speech handling. All six schemes are national, so no location question appears in the current build.
- Not done in M6: no state/district scheme data (deliberately, research is separate); no bundled district list, so district comparisons are text-only and unverifiable; no search UI (the journey stays voice-first); Telugu still needs native review; no browser, microphone, mobile or Docker verification.
- Verification: `npx tsc -b` clean, `npx vitest run` 467 passing, catalogue CLI on data/schemes.json, oxlint, production build, `npm run bench:catalogue` (2000 synthetic schemes: 122 ms registry build, 16.0 ms full match, 2.6 ms search).

## M7 - Scheme intelligence, catalogue readiness and rule precompilation (implemented)
Precompiled rule sets in the registry, an atomic research-import pipeline with a summary report, verification-date integrity, a district-table extension point and scale benchmarks. See docs/ARCHITECTURE.md.

Status:
- Completed: rules compiled once per scheme object (`checksFor` cache + `registry.checks`, frozen, no stale compilation after a rebuild); `matchCatalogue` consumes them; `importSchemes` validates the combined catalogue and applies atomically with per-category counts; `npm run import:catalogue` (dry run by default, atomic file write); verification `checkedOn` required for VERIFIED/PARTIALLY_VERIFIED, `effectiveOn`/`expiresOn` validated and a lapsed verification loaded as OUTDATED; `DISTRICTS_BY_STATE` + `lookupDistrict` extension point (deliberately empty); benchmarks for 6 to 10,000 schemes.
- Preserved: every eligibility outcome, the six schemes and their rules, profile/follow-up behaviour, languages, UI.
- Not done in M7: no researched state/district scheme has been imported (that data is external); no district table; no import UI; Telugu still needs native review; no browser, microphone, mobile or Docker verification; no real government-source re-checking.
- Verification: `npx tsc -b` clean, `npx vitest run` 507 passing, `npm run validate:catalogue -- data/schemes.json` 6 valid, oxlint, production build, `npm run bench:catalogue` (10,000 schemes: 1,058 ms build, 105 ms full match, 19.6 ms search).

## M8 - Research infrastructure and coverage baseline (implemented)
A research register separate from the scheme catalogue: lifecycle, sources, relationships, coverage audit, validation and a CLI. See docs/ARCHITECTURE.md.

Status:
- Completed: `src/core/research.ts` (research record, source register, coverage claims, 11-status lifecycle with guards, relationship model, validation), `src/core/research-coverage.ts` (coverage by central/state/UT, beneficiary group, age band and category, gaps and report), `scripts/research.ts` (`list`, `show`, `validate`, `coverage`, `gaps`, `export`), `data/research/records.json` (the six existing schemes as imported records, with their real sources).
- Preserved: the six schemes, `data/schemes.json`, every eligibility rule and outcome, the UI, the follow-up flow and the languages.
- Not done in M8: no state, UT or district scheme has been researched yet, so every state and UT reports NOT_RESEARCHED; beneficiary-group and age-band tagging of the six imported records is incomplete; no source has been re-fetched, so all change-detection states are UNCHECKED; no research UI.
- Verification: `npx tsc -b` clean, `npx vitest run` 543 passing, `npm run research -- validate` 6 records / 4 sources, coverage and gaps run on the real register, oxlint, production build.

## M9 - Telangana research campaign (implemented)
Research-only milestone: a source-backed Telangana research baseline in the M8 register, plus an evidence audit of the six central schemes. See docs/RESEARCH_TELANGANA.md.

Status:
- Completed: 23 Telangana records (15 researched, 8 catalogued with questions), 29 sources, 8 relationships, one deliberately CONFLICTING record (Cheyutha), one OUTDATED record (Rythu Bandhu, replaced by Rythu Bharosa); official evidence added for all six central schemes; record model extended with an optional benefit block, application notes and district scope.
- Preserved: data/schemes.json untouched, every eligibility rule and outcome unchanged, no scheme imported, no UI change.
- Not done in M9: no education or scholarship research, no district-specific research (33 districts, none studied), no current GOs for several 2018-2019 amounts, no import of the verified schemes, no native Telugu review.
- Verification: research validation clean (29 records, 29 sources), coverage and gaps run on the real register, `npx tsc -b`, full Vitest suite, production build, oxlint.

## M9.1 - Research quality audit (implemented)
Evidence audit of the Telangana register and remediation of what it found. See docs/RESEARCH_QUALITY_AUDIT_M9_1.md.

Status:
- Corrected: Aasara old-age limit (65 -> 57, from the 2021 state outlook), two verification statuses downgraded (Aasara, Rythu Bharosa), Rythu Bharosa's per-acre amount removed from the per-beneficiary field, svanidhi and PM-SYM wording tightened, one 404 source removed, one unreachable GO marked GONE, two dead application links withdrawn.
- Infrastructure: validation now refuses eligibility-verified records without sourced conditions or evidence, duplicate source URLs, dangling source scheme ids, and warns when a closed scheme is marked verified; coverage separates researched from listing-only records and never counts discovery as coverage.
- Preserved: 29 records, 0 imports, data/schemes.json unchanged, matcher and UI untouched.
- Verification: research validation clean, coverage/gaps/list run, tsc, full Vitest suite, build, lint.

## M9.2 - Telangana discovery expansion (implemented)
Six independent discovery paths (department, beneficiary, welfare board, central-implementation, district page, keyword variants) over the Telangana ecosystem. See docs/RESEARCH_TELANGANA_DISCOVERY.md and docs/RESEARCH_DISCOVERY_REGISTER.md.

Status:
- 59 new records (52 state, 7 central) from official pages fetched on 2026-11-28; register now 88 records, 78 sources, 50 departments, 17 categories.
- 12 duplicate or already-known candidates rejected; board benefits kept as one record per registration; central schemes kept separate from state delivery.
- Coverage report now breaks records down by department; four categories added (education, skill_development, disability, transport) with the reason recorded.
- No verification upgrade, no eligibility conditions, no amounts, no imports; data/schemes.json unchanged.
- Verification: research validate/coverage/gaps/list, tsc, full Vitest suite, lint, build.

## M9.3 - High-impact verification (implemented)
Twenty records taken from discovery status to evidence-backed verification. See docs/RESEARCH_VERIFICATION_M9_3.md.

Status:
- 6 records fully VERIFIED (BOCWWB, PM-KISAN, AIF, PMFME, SC overseas scholarship, BC corporation subsidy); 14 partially verified with the missing piece named; PMFBY left conflicting because two official replies disagree about Telangana participation.
- 17 new sources, including G.O.Ms.No.7 (2025), G.O.Rt.No.298 (2015), the overseas scholarship G.O.s, the Labour Welfare Fund Act 1987, PMKISAN/PMFME/AIF/PMFBY guidelines and the Aarogyasri/C KGBV portals.
- Register now 88 records / 95 sources: 41 researched, 12 verified, 27 partial, 0 import-ready.
- No engine, matcher or UI change; data/schemes.json unchanged.

## M5 (original plan, now later work) - Optional LLM extractor and Telugu polish
POST /api/extract uses the LLM only if LLM_API_KEY is set, otherwise the rule-based extractor. Same output schema. Improve Telugu phrases and voice fallbacks from VOICE_FINDINGS.md.
Done when: app behaves identically with no key, and better on messy speech with a key.
Still pending: the endpoint returns 501 today; no LLM path is implemented.

## M6 - Ship (Sun night to Mon)
README (run instructions, architecture, limitations, scheme data sources), clean-clone Docker test on a second machine, optional live deploy, final GATE. Deck and demo video are handled outside this repo by the team.
Submit Mon by about 6 pm.
