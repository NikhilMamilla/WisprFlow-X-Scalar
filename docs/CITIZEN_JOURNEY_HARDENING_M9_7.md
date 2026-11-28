# Citizen journey hardening (M9.7)

Date: 28 November 2026. Reliability work on the M9.6 orchestration core: answer correction, skip/revisit, session isolation, atomicity and lifecycle edge cases. No scheme, rule, research, citizen-explanation or engine change.

## 1. Architecture audit findings

| Area | M9.6 state | M9.7 verdict |
| --- | --- | --- |
| Session lifecycle | Derived statuses + explicit `PAUSED`/`COMPLETED`; `resume()` re-derives | Sound, kept |
| Question selection | Deterministic chain (coverage → providing field → fixed order → id) | Sound, extended for skips |
| Answer validation | Six guards, normalisation per field, rejection before any write | Sound, reused by correction |
| Profile mutation | New object per operation; original untouched | Sound |
| Answer history | Append-only, but every record was an original answer | Extended with corrections |
| Re-evaluation | Full `explainForCitizen` pass after each change | Sound, reused by correction/skip |
| Isolation | `deepFreeze` on every stored session; views copy arrays | Sound; tested explicitly now |
| Atomicity | All-or-nothing because a new session is built before returning | Sound; now covered by tests |
| Correction | **Missing** | Added |
| Skip / revisit | **Missing** — a citizen had to answer or abandon the journey | Added |
| Skip-aware selection | **Missing** | Added |

Everything listed as sound was left alone. `buildSession`'s positional signature was replaced by a small `SessionState` object only because three new pieces of state had to travel through it; that is the whole internal refactor.

## 2. Newly added capabilities

- `correctAnswer(session, field, value)` — change a previously answered field.
- `skipQuestion(session, questionId?)` — skip the current question without answering it.
- `revisitSkipped(session, field)` — bring a skipped question back.
- Skip-aware `selectNextQuestion(questions, profile, schemes?, policy)`.
- `skips` and `revisitQuestion` on the session and the view; `action`/`previousValue`/`sequence` on answer records.
- Store methods `correct`, `skip`, `revisit`; stateless wrappers `correct`, `skip`, `revisit`.
- Two new error codes: `NOTHING_TO_SKIP`, `QUESTION_NOT_ANSWERED`.

## 3. Answer correction semantics

- A correction targets a **field**, not a question id, because the question may no longer be asked.
- Validation uses `questionForField(field)`, so a correction is checked by exactly the same rules the original answer used (range, integer, choice, state/district recognition, yes/no words).
- The profile takes the new value immediately and the whole journey is re-evaluated: explanations, condition rows, next question and status are all rebuilt.
- History is append-only. The correction is a new `AnswerRecord` with `action: 'CORRECTION'`, `previousValue` and a higher `sequence`; the original entry is never edited.
- The latest record for a field is the current answer. Earlier entries are evidence of what the citizen said before.
- Paused or completed journeys reject corrections (`SESSION_PAUSED` / `SESSION_COMPLETED`). A field with no answer returns `QUESTION_NOT_ANSWERED`. An invalid value returns `INVALID_ANSWER` and changes nothing.

## 4. Answer history semantics

Each record carries `questionId`, `field`, `value`, `action`, `sequence`, `answeredAt`, and `previousValue` for corrections. `sequence` is `answers + skips + 1` at insertion time, so it is unique and monotonic across both logs without a counter field. History records the truth of the interaction, not a tidied version of it: correcting the same field three times leaves four entries.

## 5. Skip behaviour

A skip is a separate `SkipRecord` (`questionId`, `field`, `sequence`, `skippedAt`). The profile is not touched, so no rule can read a skip as "no", and no scheme can become ineligible because of it.

Policy, as implemented:

1. A skipped question is not offered again while any other open question has never been skipped.
2. Once every other open question is answered or skipped, the **earliest skipped** question is offered once more.
3. A second skip of the same question is final: it is never offered again, and the journey ends (usually in `NEEDS_VERIFICATION` with `missing_information_without_question`).
4. Each question therefore gets at most two offers, which bounds the loop: `questions × 2` skips at most.
5. Answering a revisited question clears the revisit request but the skip record stays in `skips`.

Selection order with skips: explicit revisit → never-skipped questions → one-skip questions (earliest skip first) → `null`.

## 6. Revisit behaviour

`revisitSkipped(session, field)` sets `revisitQuestion`. The next selection returns that question even while other questions are open, so a citizen can change their mind immediately. Guards: the field must be skipped, unanswered and still part of the journey; otherwise `INVALID_STATE`. The request is cleared by the next answer or skip, so it cannot cause a loop.

## 7. Question-selection policy (full)

```
open        = questions where profile[field] is null
if revisit set and its question is open      -> it
else if any open question has 0 skips        -> rank by (coverage, providing field, fixed order, id)
else                                          -> earliest question skipped exactly once
else                                          -> null
```

Only `citizenQuestions()` output is ever considered; answered and permanently-skipped fields cannot return.

## 8. Session isolation

- Stored sessions are deep-frozen, including profile, answers, skips, questions, explanations and match results.
- Views copy arrays (`answers`, `skips`, `questions`, `excluded`) and rebuild the four result groups; mutating them changes only the caller's copy.
- `profile` and the explanation objects in a view are the frozen internals, so assigning to them throws in strict mode and never mutates the session.
- Tests mutate profile, history, skips, questions and results on a returned view and then re-read the session.
- Two sessions never share objects; answering one cannot change the other.

## 9. Atomicity

Every operation validates before it builds anything, and the store commits only a successful outcome. A rejected answer, correction, skip, revisit or transition returns the frozen previous session by identity, so no partial state exists to leak. Tests compare full views before and after a batch of rejected operations.

## 10. Lifecycle

Unchanged states and reasons. New guards: correction and skip and revisit all reject `PAUSED`/`COMPLETED`; `resume()` still distinguishes paused from completed and re-derives status; `complete()` on an open journey keeps the questions visible but blocks mutation; reopening returns to the derived state. Skipping everything twice ends in `NEEDS_VERIFICATION` / `missing_information_without_question` with zero answers — never `LIKELY_ELIGIBLE`.

## 11. Typed API

```ts
store.start(profile)                       // JourneyResponse
store.get(sessionId)
store.answer(sessionId, questionId, value)
store.correct(sessionId, field, value)     // NEW
store.skip(sessionId, questionId?)         // NEW
store.revisit(sessionId, field)            // NEW
store.pause / resume / complete
store.has / size

correct(session, field, value) / skip(session, questionId?) / revisit(session, field)
selectNextQuestion(questions, profile, schemes?, { skips, revisit })
```

Errors: `UNKNOWN_SESSION`, `INVALID_PROFILE`, `UNKNOWN_QUESTION`, `QUESTION_ALREADY_ANSWERED`, `QUESTION_NOT_CURRENT`, `INVALID_ANSWER`, `NOTHING_TO_SKIP`, `QUESTION_NOT_ANSWERED`, `SESSION_PAUSED`, `SESSION_COMPLETED`, `INVALID_STATE`.

## 12. Limitations

- Sessions remain in memory; a restart loses them.
- One current question at a time: corrections and revisits are explicit operations.
- No deletion of history or profile reset; a new answer is a correction.
- A field can only be corrected after it was answered in the journey; values supplied in the initial profile have no answer record to correct (start a new journey to change them).
- Skips are per question and per journey; there is no "never ask me this" preference.
- No TTL/eviction.

## 13. Privacy

Skips and corrections reveal no new data: the same profile fields are collected, and the logs stay in memory. A correction keeps the previous value, which is necessary for an honest explanation, so a later persistence layer must treat answer history as personal data with the same care as the profile.

## 14. Walkthroughs

### A. Correction changes a decision

Start: 30, street vendor, town, bank account, no PF/ESIC, no tax (income and Aadhaar unknown).

1. Question `question_monthly_income` → **30000**. PM-SYM fails `pmsym:income_max_monthly`; no question remains, status `READY_WITH_RESULTS` with 1 not eligible.
2. Citizen says the income was wrong: `correct(sessionId, 'monthly_income', 9000)`.
3. Profile shows 9000; history is `[ANSWER 30000, CORRECTION 9000 ← 30000]`; PM-SYM is no longer rejected, and the Aadhaar question returns (`pmsym:requires:has_aadhaar` is open again).
4. Answer Aadhaar **yes** → PM-SYM becomes `LIKELY_ELIGIBLE`.

### B. Skip, then revisit

1. Empty profile, first question `question_has_bank_account` (4 schemes). Citizen is not sure → `skip`.
2. `skips` has one entry, profile unchanged, answers empty, results identical. Next question is a different field.
3. Later the citizen taps "ask me that again": `revisit(sessionId, 'has_bank_account')` → that question is current again while others are open.
4. Answer **haan** → profile updated, `revisitQuestion` cleared, skip record still in history.
5. Had the citizen skipped it a second time instead, it would never return; the journey would continue with the remaining questions.

### C. Ends in verification uncertainty

A session with only the e-Shram record and a complete worker profile has no questions and all conditions passing, but the rules are `PARTIALLY_VERIFIED` → status `NEEDS_VERIFICATION`, reason `verification_uncertainty`, one result in `results.needsVerification`, with `evidence.reasons` naming the partial check. Alternatively, skipping every question twice leaves `answers: []`, `counts.NOT_ELIGIBLE: 0` and the journey ends as `NEEDS_VERIFICATION` / `missing_information_without_question`. Neither case ever reports a scheme as eligible.
