# Citizen explanation layer (M9.5)

Date: 28 November 2026. A read-only layer over the existing eligibility engine: it turns the engine's rule evaluations into four citizen states, condition-by-condition reasons, questions derived from unanswered conditions, and provenance a citizen can check.

Nothing in `data/schemes.json` changed. No scheme was added, no rule edited, no verification status upgraded.

## 1. Architecture

The engine already produced everything needed to explain a decision. `rules.ts` compiles each scheme's rules into `Criterion`s and `evaluate()` returns one `RuleEvaluation` per condition — expected value, actual value, `pass | fail | unknown`. `matcher.ts` adds geography, prerequisites and the `MatchStatus`. M9.5 maps that onto citizen vocabulary; it does not decide anything a second time.

```
Profile
  |
  v
matcher.matchScheme()          (unchanged engine)
  |  MatchResult: status, evaluations[], missing[], geography, prerequisites
  v
citizen.ts
  |  matcherConditions()  -> geography / only_if rows the matcher settles before rules
  |  ruleCondition()      -> one CitizenCondition per RuleEvaluation
  |  assessEvidence()     -> is the rule set itself confirmed?
  |  stateForScheme()     -> LIKELY_ELIGIBLE | NOT_ELIGIBLE | MORE_INFORMATION_NEEDED | NEEDS_VERIFICATION
  |  citizenQuestions()   -> one question per unanswered field, deduplicated
  v
CitizenReport { results, excluded, questions, counts }
```

One engine pass per scheme. `explainScheme` accepts an optional already-computed `MatchResult`, so a caller that already matched does not evaluate twice, and `explainForCitizen` passes the result it just used. There is no parallel rule interpreter and no second copy of the catalogue.

## 2. Result states

| State | Meaning | How it is derived |
| --- | --- | --- |
| `LIKELY_ELIGIBLE` | Every listed condition passes and the rule set is confirmed | no failures, no unknowns, `evidence.sufficient` |
| `NOT_ELIGIBLE` | At least one confirmed mandatory condition fails | a failure on a scheme whose rules are verified (a failed prerequisite lands here too) |
| `MORE_INFORMATION_NEEDED` | An answer is missing, so eligibility cannot be determined | engine status `needs_info`, or any condition `UNKNOWN` |
| `NEEDS_VERIFICATION` | Answers fit, but the evidence is conflicting, outdated, incomplete or unconfirmed | all conditions pass but `rules_verified` is false, or a failure exists on a scheme whose rules are not confirmed |

Precedence is deliberate:

1. A failure on verified rules settles the result, even if other answers are missing — asking more questions cannot change it.
2. Otherwise a missing answer wins over uncertainty, because the citizen can act on it immediately.
3. Otherwise an unconfirmed rule set makes the result `NEEDS_VERIFICATION`, never `LIKELY_ELIGIBLE`.

Missing information is never a failure, and uncertainty is never rounded up to eligible. A scheme outside the citizen's state, discontinued, or not meant for their situation is **excluded** from results rather than rejected — `excluded[]` carries `outside_your_state`, `discontinued` or `does_not_apply_to_you` with a detail sentence.

## 3. Condition explanations

Every explanation carries `conditions[]`, one row per condition, in a fixed order (location, then `only_if`, then rules):

```ts
interface CitizenCondition {
  id: string                 // "pmsym:age_max" — stable
  ruleId: string
  statement: string          // "Be 40 years old or younger"
  result: 'PASSED' | 'FAILED' | 'UNKNOWN'
  reason: string             // "You said 42; this needs 40 years old or younger."
  yourValue: RuleValue | null
  yourValueText: string | null   // "street vendor", not "street_vendor"
  requirement: string
  requirementValue: ExpectedValue
  prerequisite: boolean
  explanationKey: string     // i18n key already used by the UI
  sourceUrl: string | null   // scheme-level provenance
}
```

`NULL` stays `NULL`. When the citizen has not answered, `yourValue` is null, `reason` says so, and no value is guessed to fill the row. Raw enum values never reach the output: `formatAnswer` maps `street_vendor` to "street vendor" and `urban` to "a town or city".

Geography and `only_if` get their own rows because the matcher settles them before rules run. Without those rows the app would ask for a state with no visible condition behind the question.

## 4. Question generation

`citizenQuestions(results)` emits only questions that an unanswered condition actually requires:

- Only schemes in `MORE_INFORMATION_NEEDED` contribute.
- Only conditions with `result === 'UNKNOWN'` contribute.
- One field is one question, however many schemes need it (`question_age` serves e-Shram, PM-SYM, PMSBY and PMJJBY at once).
- `conditions[]` on the question lists every condition it settles; `schemes[]` lists every scheme it unblocks.
- Order: most schemes unblocked first, then a fixed human order (age, income, occupation, town/village, state, district, bank, Aadhaar, PF/ESIC/NPS, income tax, dependants).

```ts
interface CitizenQuestion {
  id: string                 // "question_age"
  field: ProfileField
  text: string               // "How old are you?"
  help: string | null
  input: 'number' | 'yes_no' | 'choice' | 'text'
  group: 'about_you' | 'your_home' | 'your_work' | 'your_situation'
  required: boolean          // always true: the question exists because it is needed
  schemes: string[]
  conditions: string[]
  validation?: { min?: number; max?: number; integer?: boolean; options?: string[] }
}
```

Validation is data, not prose: age `0–120` integer, monthly income `≥ 0`, state options from `REGIONS`, occupation options rendered as citizen words. The district is only asked when a scheme in play restricts districts. Nothing about caste, religion, gender, health or documents is collected: the current six schemes need none of it, so the layer does not ask.

## 5. Explanation and transparency

`CitizenExplanation` contains:

- `satisfied` / `failed` / `unknown` — condition ids, for the "why matched / why not / what is missing" headings.
- `summary` — one sentence per state, naming the failing conditions or the number of missing answers.
- `evidence` — `{ sufficient, status, checkedOn, reasons, notes }`. `reasons` explains a shortfall in citizen words ("Only part of this scheme's rule set has been checked against official documents."). `notes` carries the register's own `verify_note` and `verification.notes` verbatim — a disagreement is shown, not resolved by the layer.
- `sources[]` — `{ title, url, department, official, verificationStatus, checkedOn, note }` from `verification.sources`, falling back to `source_url`. `title` is `null` when the record has no title; a title is never synthesised.
- `application` — `{ procedure, link, helpline, deadline, documents, amount, unavailable }`. Only documented values are filled. Anything absent is `null`/`[]` **and named in `unavailable`**, where the UI shows "Information not verified yet." `amount` is only produced from a structured `benefits[].amount`, never parsed out of the benefit sentence.
- `blockedBy` / `unlockedBy` — a failed prerequisite (a bank account) plus the scheme that provides it.

## 6. Uncertainty handling

| Situation | Behaviour |
| --- | --- |
| `PARTIALLY_VERIFIED`, `UNVERIFIED`, `UNKNOWN`, `OUTDATED` | `evidence.sufficient = false`; passing schemes become `NEEDS_VERIFICATION` |
| Failure on an unconfirmed rule set | `NEEDS_VERIFICATION`, not `NOT_ELIGIBLE` — the failing rule itself may be wrong |
| `verify_note` records a disagreement | Carried verbatim in `evidence.notes`; the conflicting value is not chosen |
| Verification expired | The catalogue already downgrades it to `OUTDATED` at load; the layer reports that status |
| Missing answer | `MORE_INFORMATION_NEEDED`; never a failed condition |
| No application data | `unavailable` lists the field; nothing is invented |

## 7. Interfaces

```ts
explainScheme(profile, scheme, { match? }): CitizenExplanation
explainForCitizen(profile, schemes = SCHEMES): CitizenReport
citizenQuestions(explanations): CitizenQuestion[]
questionForField(field): CitizenQuestion
assessEvidence(scheme): CitizenEvidence
formatAnswer(value, field?): string
stateLabel(state): string
NOT_VERIFIED // "Information not verified yet."
```

`CitizenReport = { results, excluded, questions, counts }`; `counts` is keyed by the four states. Everything is deterministic: no clock, no random, no network, no LLM. Exported from `src/core/index.ts`.

## 8. Examples

### A. Likely eligible

32-year-old street vendor, urban, ₹10,000/month, bank account and Aadhaar, no PF/ESIC, no income tax.

```
PM Shram Yogi Maan-dhan (pension)  LIKELY_ELIGIBLE
  PASSED  Be at least 18 years old                                  You said 32.
  PASSED  Be 40 years old or younger                                You said 32.
  PASSED  Have a monthly family income of ₹15,000 or less            You said 10000.
  PASSED  Not pay income tax                                        You said no.
  PASSED  Not be covered by PF, ESIC or NPS                          You said no.
  PASSED  Have an Aadhaar card                                      You said yes.
  PASSED  Have a bank account in your own name                      You said yes.
```

e-Shram and SVANidhi return `NEEDS_VERIFICATION` for the same profile: every condition passes, but their rule sets are only partially verified, so `evidence.reasons` says so and the citizen is told to confirm at the office.

### B. Not eligible

Same person, 45 years old, delivery rider, ₹20,000/month.

```
pmsym  NOT_ELIGIBLE
  You do not meet 2 conditions: be 40 years old or younger; have a monthly family income of ₹15,000 or less.
  PASSED  Be at least 18 years old
  FAILED  Be 40 years old or younger        You said 45; this needs 40 years old or younger.
  FAILED  Have a monthly family income of ₹15,000 or less   You said 20000; this needs ...
  ...
```

PMSBY and PMJJBY stay `LIKELY_ELIGIBLE`; SVANidhi shows one `FAILED` row (occupation) but is `NEEDS_VERIFICATION`, not a rejection, because its rules are unconfirmed.

### C. More information needed

22-year-old street vendor, nothing else known.

```
counts: LIKELY_ELIGIBLE 0, NOT_ELIGIBLE 0, MORE_INFORMATION_NEEDED 6, NEEDS_VERIFICATION 0

questions:
  question_has_bank_account   yes_no   pmjdy, pmjjby, pmsby, pmsym
  question_in_epf_esic_nps    yes_no   eshram, pmsym
  question_pays_income_tax    yes_no   eshram, pmsym
  question_monthly_income     number   pmsym
  question_urban_or_rural     yes_no   svanidhi
  question_has_aadhaar        yes_no   pmsym
```

Six schemes, six questions, no duplicates. The pension explanation keeps its two passed rows visible while marking the five unanswered ones `UNKNOWN`.

### D. Needs verification

e-Shram for the profile in A: all conditions pass, `evidence.status = PARTIALLY_VERIFIED`, `evidence.notes` includes the register's own sentence about two PIB documents disagreeing on the upper age limit. The citizen sees "Needs verification", not "eligible".

## 9. Limitations

- **English only.** Statements and reasons are English; `explanationKey` points at the existing Hinglish/Hindi/Telugu strings, but rendering this layer through `i18n` is not done. The app's current screens are untouched.
- **No UI.** There is no screen, no chat, no voice integration: this milestone is the data layer.
- **Scheme-level provenance.** The rule model has no per-condition source, so `sourceUrl` is the scheme's source. Claiming a specific paragraph would require a data-model change and re-verification.
- **Conflict detection is status-based.** A disagreement is surfaced when the register says so (`verify_note`), not derived by comparing sources; there is no structured field for "these two sources disagree about this condition".
- **The district is offered alongside the state** when a district-restricted scheme is present, even before the state is known; a UI must order them (the existing dialog flow already asks state first).
- **Question coverage is the current six schemes' fields.** A research record that needs a new kind of question (disability percentage, land holding) has no field to ask about yet; adding one means extending `Profile` and the extractor, not this layer.
- **`NEEDS_VERIFICATION` is pessimistic by design.** A partially verified scheme with passing answers stays uncertain until its rules are verified, which is the intended behaviour and will keep most of the current catalogue in that state.

## 10. Future integration

1. Render `CitizenReport` in the results screen: state badge, condition list, source line with `checkedOn`.
2. Feed `questions` into `followups.ts` as an alternative ordering source (the engine's `missing[]` is coarser: it loses per-scheme condition ids).
3. Localise via `explanationKey` and a `citizen_*` string set in `i18n/strings.ts`.
4. When the research register gains per-condition sources, add `condition.sourceId` and drop the scheme-level shortcut.
5. Export a printable "why this decision" sheet alongside the existing document sheet.
