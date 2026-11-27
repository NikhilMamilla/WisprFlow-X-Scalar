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

## M3 - The flow UI (Sat)
Screens: language pick, speak, live profile fill, follow-up question with read-back, results (spoken and cards), printable sheet. State machine in src/core. Mobile first.
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
