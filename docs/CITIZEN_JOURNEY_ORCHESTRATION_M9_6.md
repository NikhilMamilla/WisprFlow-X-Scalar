# Citizen journey orchestration (M9.6)

Date: 28 November 2026. A deterministic, in-memory session layer that sequences one citizen through profile → matching → explanation → question → answer → re-evaluation → results. It adds no eligibility logic: matching stays in `matcher.ts`, and every citizen-facing statement comes from `citizen.ts`.

`data/schemes.json`, the rules, the research register and the M9.5 explanation output are unchanged.

## 1. Architecture

```
startJourney(profile)
   validateInitialProfile()          types.ts field shapes + geo lookups only
   buildSession()
     explainForCitizen(profile)      citizen.ts -> matcher.ts -> rules.ts
     selectNextQuestion()            citizenQuestions() order, filtered
     deriveStatus()
   -> frozen JourneySession + JourneyView

submitAnswer(session, questionId, value)
   state guards -> question guards -> normalizeAnswer() -> profile copy
   -> buildSession() again (fresh engine pass) -> answer appended
```

There is no `src/core/profile.ts` in this project: the profile type and its field list live in `types.ts`, and the safest reuse was to validate against those existing constants (`PROFILE_FIELDS`, `OCCUPATIONS`, `emptyProfile`) rather than introduce a parallel profile model. There is also no existing session store: `dialog.ts` is the UI's turn reducer and owns screens, effects and read-back, which is a different concern. M9.6 therefore adds `journey.ts` as a thin coordinator and leaves `dialog.ts` untouched.

Reused, not reimplemented: `explainForCitizen`, `citizenQuestions`, `selectNextQuestion` over `CitizenQuestion`, `matchSchemes` (stored only as the engine trace), `findRegion`, `normalizeDistrict`, `parseYesNo`.

## 2. Session lifecycle

```
            start()
              |
              v
   COLLECTING_INFORMATION --answer--> (re-derive) --no questions--> READY_WITH_RESULTS
              |                                    \--> NEEDS_VERIFICATION
              |                                     \--> COMPLETED (nothing applies)
        pause()                                    complete()
              v                                       v
           PAUSED --resume()--> (re-derive)         COMPLETED --resume()--> (re-derive)
```

`COLLECTING_INFORMATION`, `READY_WITH_RESULTS`, `NEEDS_VERIFICATION` and `COMPLETED` are **derived** from the profile and the remaining questions. `PAUSED` and an explicit `COMPLETED` are the only states a caller sets, and `resume()` re-derives the status rather than restoring a stale snapshot.

## 3. Journey states and reasons

| Status | Derived when | Reason |
| --- | --- | --- |
| `COLLECTING_INFORMATION` | a question is still open | `questions_remaining` |
| `READY_WITH_RESULTS` | no questions left and at least one decisive result | `results_ready` |
| `NEEDS_VERIFICATION` | no questions left, every result is `NEEDS_VERIFICATION` | `verification_uncertainty` |
| `NEEDS_VERIFICATION` | no questions left but a result still says `MORE_INFORMATION_NEEDED` | `missing_information_without_question` |
| `COMPLETED` | no applicable schemes at all | `no_applicable_schemes` |
| `PAUSED` / `COMPLETED` | `pause()` / `complete()` | `paused_by_citizen` / `completed_by_citizen` |

## 4. Data flow

`JourneySession` holds the profile, the engine's `matchResults` (one per evaluated scheme), the `explanations`, `excluded`, `questions`, `nextQuestion`, `answers`, status/reason, timestamps and the pause/complete flags. Everything is deep-frozen before it is stored.

`JourneyView` is what callers see: `sessionId`, status, reason, profile, four result groups, `counts`, excluded, questions, `nextQuestion`, answers, timestamps. Grouping never drops data — each group holds the full `CitizenExplanation`, so condition rows, reasons, sources, `evidence` and `blockedBy`/`unlockedBy` survive.

## 5. Question prioritisation

`citizenQuestions()` already deduplicates by field and orders by how many schemes a field unblocks. `selectNextQuestion()` filters answered fields and applies this tie-break chain:

1. **Coverage** — more schemes in the question's `schemes[]` wins.
2. **Unblocking** — a field that some scheme in play can `provide` (a bank account also points at PMJDY) wins a tie.
3. **Fixed field order** — age, income, occupation, town/village, state, district, bank, Aadhaar, PF/ESIC/NPS, income tax, dependants.
4. **Question id** — final deterministic tie-break.

Only questions from `CitizenQuestion[]` are ever offered, so no question can exist without an unanswered condition behind it. Nothing sensitive is asked because no scheme in the catalogue needs it.

## 6. Answer validation

Six guards, in order, before anything is written:

| Guard | Error code |
| --- | --- |
| journey completed | `SESSION_COMPLETED` |
| journey paused | `SESSION_PAUSED` |
| question already in `answers` | `QUESTION_ALREADY_ANSWERED` |
| question id not in this journey | `UNKNOWN_QUESTION` |
| question is not `nextQuestion` | `QUESTION_NOT_CURRENT` |
| value fails the question's rules | `INVALID_ANSWER` |

Normalisation follows the field: numbers for age/income/dependants (range + integer checked from `question.validation`), occupation label → `OCCUPATIONS` value, state → canonical region name, district → normalised district, yes/no words (`haan`, `nahi`, `yes`, `no`) → booleans, `urban_or_rural` → `urban`/`rural`.

A rejected answer returns the frozen session untouched and appends nothing to `answers`; tests compare the whole view before and after.

## 7. Re-evaluation

Each accepted answer rebuilds the session by calling `explainForCitizen()` again on the new profile. Conditions previously `UNKNOWN` resolve, `MORE_INFORMATION_NEEDED` shrinks, and a scheme can become `NOT_ELIGIBLE` when an answer fails a mandatory rule. Verification uncertainty is never recalculated away: a partially verified scheme stays `NEEDS_VERIFICATION` after every answer.

## 8. Completion

- Questions run out → no more asking, even if the citizen has not "finished".
- A decisive result (eligible or not) yields `READY_WITH_RESULTS`.
- If everything left is uncertain, the journey ends in `NEEDS_VERIFICATION` with `verification_uncertainty`, never a fabricated yes.
- If a result still needs information but no question can supply it, the reason is `missing_information_without_question` rather than a false "complete".
- The same question is never asked twice: answered fields are excluded by `profile[field] !== null` and by the answer history.

## 9. Errors

All expected failures are returned, not thrown:

```ts
type JourneyResponse = { ok: true; journey: JourneyView } | { ok: false; error: JourneyError }
interface JourneyError { code: JourneyErrorCode; message: string; details?: Record<string, string | number> }
```

`JourneyStore` uses `UNKNOWN_SESSION` for an id it has never seen; the stateless helpers take a session object and therefore never need it.

## 10. API

```ts
const store = new JourneyStore({ now?, createId?, schemes? })
store.start(profile)                       // JourneyResponse
store.get(sessionId)                       // JourneyResponse
store.answer(sessionId, questionId, value) // JourneyResponse
store.pause(sessionId) / resume() / complete()
store.has(sessionId) / size()

// stateless equivalents over a JourneySession
beginJourney(profile, options) / startJourney(profile, options)
submitAnswer(session, questionId, value, options) / answerQuestion(...)
pauseJourney / resumeJourney / completeJourney
selectNextQuestion(questions, profile, schemes?)
validateInitialProfile(input)
viewOf(session)
```

Example:

```ts
const store = new JourneyStore()
const started = store.start({ age: 24, occupation: 'street_vendor', urban_or_rural: 'urban' })
// started.journey.nextQuestion.field === 'has_bank_account'
const answered = store.answer(started.journey.sessionId, 'question_has_bank_account', 'haan')
// answered.journey.profile.has_bank_account === true, answers length 1
```

## 11. Session limitations

- **Memory only.** Restarting the process loses every journey. There is no database, file, Redis or cookie.
- **One question at a time.** An out-of-order or repeated answer is refused rather than queued.
- **No answer corrections.** Changing an earlier answer needs a new journey; `answers` is append-only.
- **No expiry or eviction.** A long-running process would need a TTL in a later milestone.
- **Schemes are per-store.** `schemes` is injectable for tests; the store does not reload the catalogue.
- Timestamps come from an injectable clock so tests are deterministic; production uses ISO `Date`.

## 12. Privacy implications

- Only `Profile` fields are ever requested, and only when a condition needs them. No name, phone, email, address, Aadhaar number, caste, religion or gender is collected.
- The session holds the citizen's answers in memory for the duration of the journey. Nothing is logged, transmitted or persisted by this layer.
- Frozen state prevents accidental mutation, but a caller with the session object can read the profile: this is a core library, not a boundary. An HTTP layer would need to decide what to expose.
- Answer history keeps the exact value the citizen gave, because the results screen has to explain the decision from it.

## 13. Walkthroughs

### A. Eligible after answering

Start: 24, street vendor, town. Status `COLLECTING_INFORMATION`, first question `question_has_bank_account` (4 schemes).

| Question | Answer | Effect |
| --- | --- | --- |
| has_bank_account | haan | bank rules pass |
| in_epf_esic_nps | nahi | e-Shram/PM-SYM exclusion rule passes |
| pays_income_tax | nahi | same |
| monthly_income | 9000 | ₹15,000 cap passes |
| has_aadhaar | haan | Aadhaar requirement passes |

Final: `READY_WITH_RESULTS` / `results_ready`, 3 likely eligible (PM-SYM, PMSBY, PMJJBY), 2 needs verification (e-Shram, SVANidhi), 0 not eligible, 0 missing. Five questions, five answers, no repeats.

### B. Not eligible after an answer

Same start, income answered **30000**. PM-SYM's `income_max_monthly` (₹15,000) fails, so the question for `has_aadhaar` disappears (no remaining scheme needs it). Final: `READY_WITH_RESULTS`, 2 likely eligible, **1 not eligible** — PM-SYM with `pmsym:income_max_monthly` FAILED, "You said 30000; this needs a monthly family income of ₹15,000 or less." — and the two partially verified schemes still `NEEDS_VERIFICATION`.

### C. Ends with unresolved verification uncertainty

A store built with only the e-Shram record and a complete worker profile (`age 32`, no tax, no PF/ESIC): no questions remain, every condition passes, but the rules are `PARTIALLY_VERIFIED`. Final state `NEEDS_VERIFICATION` / `verification_uncertainty`, one result in `results.needsVerification` with `evidence.reasons` naming the partial check and `evidence.notes` carrying the register's own note about the disputed upper age limit. The journey does not present e-Shram as eligible.
