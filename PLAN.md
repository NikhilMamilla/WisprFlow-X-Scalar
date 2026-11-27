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

## M5 - Optional LLM extractor and Telugu polish (Sun)
POST /api/extract uses the LLM only if LLM_API_KEY is set, otherwise the rule-based extractor. Same output schema. Improve Telugu phrases and voice fallbacks from VOICE_FINDINGS.md.
Done when: app behaves identically with no key, and better on messy speech with a key.

## M6 - Ship (Sun night to Mon)
README (run instructions, architecture, limitations, scheme data sources), clean-clone Docker test on a second machine, optional live deploy, final GATE. Deck and demo video are handled outside this repo by the team.
Submit Mon by about 6 pm.
