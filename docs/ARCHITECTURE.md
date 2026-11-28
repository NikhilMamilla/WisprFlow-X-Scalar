# Architecture

Haq Bolo is a Vite + React app whose decision logic is pure TypeScript in `src/core`. Nothing in `src/core` imports React, the DOM or the server, so the same code runs in the browser, in Vitest and in the catalogue CLI.

## Data flow

```
voice / typed story
      |
      v
src/core/extractor.ts     -> Profile (null = not said; never guessed)
      |
src/core/dialog.ts        -> read-back, follow-ups, conflicts, results
      |
src/core/matcher.ts       -> MatchResult[] per scheme
      |   uses src/core/rules.ts (compiled checks) and scheme geography
      v
src/screens/*             -> cards, printed sheet (language-picked text)
```

`data/schemes.json` is the only place scheme rules live. It is loaded by `src/core/schemes.ts`, which validates it and derives runtime fields; the app never reads the JSON directly.

## Scheme model (`src/core/scheme.ts`)

One shape for central, state, UT, multi-state and district schemes:

| Group | Fields |
| --- | --- |
| Identity | `id`, `aliases`, `name_en`, `name_hi`, `name_te` |
| Classification | `category` (free text), `tags`, `beneficiaryGroups` |
| Geography | `geography.scope`, `geography.states`, `geography.districts`, `geography.authority` |
| Eligibility | `rules` (see below) |
| Documents | `documents[]` with `required`, `condition`, `alternatives`, `notes` |
| Benefits | flat `benefit_*` one-liner plus optional structured `benefits[]` |
| Application | optional `application` steps/url/online/offline/department/helpline/deadline |
| Dependencies | `provides` (boolean fields this scheme establishes), `prerequisites` (scheme ids) |
| Trust | `verification.status`, `checkedOn`, `effectiveOn`, `expiresOn`, `confidence`, `sources[]`, plus `source_url` and `verify_note` |

Localized content is `LocalizedText { en, hi, en_roman?, te? }`. Telugu is optional so a new scheme can be validated before translation; the fallback is Telugu -> Hindi, never English (`src/core/localization.ts`).

### Adding a scheme

Add one object to `data/schemes.json` (or a future import file) with a unique lowercase `id`, names/benefit in en/hi/en_roman (and te when available), `category`, `geography`, `rules`, at least one document, `source_url` and a `verification` block. Nothing in the matcher, results UI, document list or localization layer needs editing. Run `npm run validate:catalogue -- <file>`; it exits non-zero on any error.

A real example from the bundled catalogue (PMSBY, abridged):

```json
{
  "id": "pmsby",
  "aliases": ["suraksha bima", "pm accident insurance"],
  "name_en": "PM Suraksha Bima Yojana (accident insurance)",
  "name_hi": "प्रधानमंत्री सुरक्षा बीमा योजना (दुर्घटना बीमा)",
  "benefit_en": "Accident insurance at a very low yearly premium, taken from your bank account.",
  "category": "insurance",
  "beneficiaryGroups": ["individual", "worker"],
  "geography": { "scope": "central", "authority": "Department of Financial Services, Ministry of Finance" },
  "rules": { "age_min": 18, "age_max": 70, "not": [], "requires": ["has_bank_account"] },
  "documents": [{ "en": "Aadhaar card", "hi": "आधार कार्ड", "en_roman": "Aadhaar card" }],
  "source_url": "https://…",
  "verification": { "status": "VERIFIED", "checkedOn": "2026-11-27" }
}
```

A state scheme uses `"geography": { "scope": "state", "states": ["Telangana"] }`; a district scheme uses `"scope": "district"` with both `states` and `districts` (the validator requires both). Use the canonical state name from `src/core/geo.ts` (`Telangana`, not `telangana` or `TG`); the validator warns about a name it does not recognise.

## Registry (`src/core/registry.ts`)

`buildRegistry()` indexes the catalogue by id, alias, category, state, provided field and dependents, and refuses duplicate ids or aliases. The matcher and the UI look schemes up here (`REGISTRY`) instead of scanning arrays. `filterSchemes()` is the internal foundation for a larger catalogue (category, tag, beneficiary group, scope, state, occupation, verification status, provider, "depends on this scheme", available-only). `matchCatalogue()` reuses the prebuilt provider map so a bigger catalogue does not rebuild it per story.

## Rule engine (`src/core/rules.ts`)

Supported operators: `age_min`, `age_max`, `income_max_monthly`, `occupation_in`, `urban_only`, `only_if`, `not`, `requires`. Any other key is a catalogue error, not a silently ignored rule.

`compileChecks()` produces the checks in a fixed order (age, income, occupation, location, forbidden fields, required fields) so results and explanations are stable.

**Compiled once, not per profile (M7).** `compileChecks` is the pure builder. `checksFor(scheme)` caches its result in a `WeakMap` keyed by the scheme object, and `buildRegistry` stores the compiled set per id in `registry.checks`. `matchCatalogue(registry, profile)` passes those sets into `matchScheme`, so matching never recompiles a rule set. The compiled array and each criterion are `Object.freeze`d, so a caller cannot corrupt them. A registry rebuild creates new scheme objects and therefore new compilations — a stale compiled set cannot survive a catalogue swap, and the previous registry keeps its own. Equivalence between cached and freshly compiled rules is covered by `src/core/precompile.test.ts`.

`evaluate()` returns:

- `passed` / `failed` / `missing` (unchanged shapes the UI already reads)
- `evaluations[]`: `ruleId`, `kind`, `field`, `expected`, `actual`, `result` (`pass` / `fail` / `unknown`), `prerequisite`, `verified`, `explanationKey` (an i18n key)

Missing data is `unknown`, never a pass or a fail. One known failure settles a scheme even when other fields are unknown.

## Statuses (`src/core/matcher.ts`)

| Status | Meaning |
| --- | --- |
| `qualifies` | every known condition passes and nothing is missing |
| `needs_prerequisite` | only `requires:` conditions failed; `unlocked_by` names the scheme that provides the field |
| `needs_info` | at least one condition is unknown and none failed |
| `does_not_qualify` | a non-prerequisite condition failed |
| `not_needed` | `only_if` says the scheme is already satisfied or irrelevant (PM Jan Dhan when the user has a bank account) |
| `not_applicable` | outside the scheme's state, or the scheme is discontinued |

`qualifies` on a scheme whose verification status is not `VERIFIED` is presented as a possible match to confirm, never as a guarantee.

## Geography (`src/core/geo.ts`, `src/core/geography.ts`)

One table (`REGIONS`) holds all 28 states and 8 union territories with a canonical English name, an ISO 3166-2:IN code and the spellings people actually use in Roman, Devanagari and Telugu. Telugu spellings need native review, like the rest of the Telugu content.

- `normalizeText` makes comparisons case-, spacing-, punctuation- and unicode-width-insensitive (`normalize('NFKC')`). `Telangana`, `telangana`, `TELANGANA` and `ＴＥＬＡＮＧＡＮＡ` are one place.
- `findRegion` resolves a name, a code (`TS`) or an alias (`andhra`, `orissa`, `pondicherry`, `bengal`) to the canonical record, and ignores a trailing `state`/`राज्य`/`రాష్ట్రం`. It returns `null` for anything it does not know, and the caller treats that as *unknown*, never as *somewhere else*.
- Two-letter codes are deliberately excluded from the story extractor's keywords: `ka` is an ordinary Hindi word ("35 ka hoon"), so it must not mean Karnataka. Codes still work for a typed or spoken location answer.
- Districts have no bundled list (there is no verified source in this repo and inventing one could reject real users). `normalizeDistrict` only trims, title-cases and drops a trailing `district`/`जिला`/`జిల్లా`, and an Indic-script district is reported as unverifiable instead of being force-matched to an English name.
- `DISTRICTS_BY_STATE` is the extension point: deliberately empty, keyed by canonical state name (or code) to district names, with `lookupDistrict(table, state, district)` returning `match` / `no_match` / `unknown_state` / `no_table`. Tests pass their own table. When a state's districts are supplied from an official source, add them there, record the source here, and the validator starts reporting `district_not_in_table` for a declared district the table does not contain. Eligibility itself never rejects a user because the table is missing.

`evaluateGeography(profile, scheme)` returns one of:

| Result | Meaning | Matcher maps to |
| --- | --- | --- |
| `applicable` | national scheme, or the user's state/district matches | continue to the rules |
| `not_applicable` | a known state or district does not match, or the scheme is discontinued | `not_applicable` |
| `unknown_state` | the scheme is state/UT/district-scoped and the state is not known | `needs_info`, missing `state` |
| `unknown_district` | the state matches but the district is unknown or cannot be compared | `needs_info`, missing `district` |
| `invalid_metadata` | a state scheme with no states in its data | `needs_info`, missing `state` (never silently national) |

Order matters: `only_if` is checked first (so "not needed" keeps its meaning), then geography, then the rules. A state mismatch is settled before a district is ever asked for. National schemes never consult location, so the six-scheme flow is unchanged.

The profile stores `state` (canonical name once recognised) and `district` (the user's own spelling). Both are user-provided: there is no geolocation, no GPS, no IP lookup and no persistence.

## Prerequisites and dependencies (`src/core/dependencies.ts`)

Two kinds:

1. Field prerequisites (`rules.requires`): evaluated per profile as satisfied, unmet or unknown. A scheme declares what it provides (`provides`), so a blocked scheme points at the scheme that unblocks it (PM Jan Dhan provides `has_bank_account`).
2. Scheme-id prerequisites (`prerequisites`): a structural graph. `buildDependencyGraph()` reports missing ids and cycles (including self-reference), and `resolvePrerequisites()` flattens both kinds into ordered steps with `satisfied: true | false | null`. `schemesInCycles()` lists unreachable schemes.

Cycles are caught by the validator at load time, so the UI cannot loop.

## Verification and sources (`src/core/scheme.ts`, `src/core/catalogue.ts`)

`verification.status` is the single source of truth; `rules_verified` is derived (`status === 'VERIFIED'`) so the two can never disagree. Sources record url, optional title/type/issuer/dates and whether the source is official (explicit, or derived from a `.gov.in` / `.nic.in` / `.gov` domain). When a scheme has no explicit source list, one is derived from `source_url` with the catalogue's `checked_on` date. Nothing claims a rule is verified merely because a URL exists.

Integrity rules added in M7:

- `VERIFIED` and `PARTIALLY_VERIFIED` require `checkedOn` (per scheme, or the catalogue's `checked_on`). A status without a date is an unfalsifiable claim and is a validation **error**.
- `verification.effectiveOn` / `expiresOn` and the same fields on each source are optional, must be `YYYY-MM-DD`, and an expiry before the effective date is an error.
- If `verification.expiresOn` is in the past, the scheme loads as `OUTDATED` (so `rules_verified` becomes `false` and the UI stops presenting it as current) and the validator emits `expired_verification`. A lapsed source produces `expired_source`. No bundled scheme sets an expiry, so this changes nothing today.
- Conflicting sources are never reconciled automatically: the human-written `verify_note` carries the disagreement (e-Shram does exactly this).
- Import never upgrades a status; it only carries what the research file states.

## Catalogue import (`src/core/import.ts`, `scripts/import-catalogue.ts`)

`importSchemes(existing, incoming, options)` validates the **combined** list (existing + incoming), so an import cannot introduce a duplicate id, alias clash, name clash or dangling prerequisite that the single-file validator would reject. It returns an `ImportReport`:

- `ok` — the whole batch passed.
- `counts` — examined / valid / invalid / duplicates / duplicate ids / alias collisions / missing fields / invalid rules / invalid geography / invalid sources / localization gaps / verification issues / dependency issues.
- `catalogue` — the merged catalogue **only** when `ok`; otherwise the exact `existing` array (same reference), which is what makes the import atomic. A partially valid batch is never applied.
- `addedIds` — empty on failure.

Errors are attributed to incoming schemes by the id in their issue path; an error that cannot be attributed to one scheme blocks the whole batch. `formatImportReport` renders the one-screen summary.

The workflow:

```
npm run import:catalogue -- research/telangana.json          # dry run: validate + summary, writes nothing
npm run import:catalogue -- research/telangana.json --write  # merge, then write atomically
```

`--write` renames a temp file over the target, so a crash cannot leave a half-written catalogue, and the base file's `_note` / `checked_on` metadata is preserved. The script refuses to import into a base catalogue that is already invalid. Validation is never weakened to make an import pass.

### Research file format

A research file may be a single scheme object, an array, or `{ "schemes": [...] }` — the same shape as `data/schemes.json`. Required per scheme: `id`, `name_en`, `name_hi`, `benefit_en`, `benefit_hi`, `benefit_en_roman`, `rules`, at least one `documents` entry, `source_url`, and `verification`. Optional: `aliases`, `name_te`, `benefit_te`, `category`, `tags`, `beneficiaryGroups`, `geography`, `provides`, `prerequisites`, `application`, `benefits`, `verify_note`.

Eligibility stays machine-evaluable and narrow: only the operators in `RULE_KEYS` are accepted, and a rule is a claim about a **verified** condition. Research findings that are not yet confirmed belong in `verify_note` (and a `PARTIALLY_VERIFIED` / `UNVERIFIED` status), never in `rules`. A URL is not verification; `checkedOn` is required for a verified status; an expiry downgrades the scheme rather than hiding the fact that it lapsed.

A batch file is just an array:

```json
{ "schemes": [ { "id": "tg_example", "...": "one full scheme object" } ] }
```

## Catalogue validation (`src/core/catalogue.ts`, `scripts/validate-catalogue.ts`)

`validateCatalogue(input)` is pure, never throws, and never half-applies: on any error it returns `ok: false` with an empty `schemes` array. It checks:

- schema and required fields; unique ids; alias collisions; duplicate official names
- classification values and geography consistency (a state scheme must list states; a central scheme must not)
- rule operators, profile field names, occupations, numeric bounds, `age_min <= age_max`, a field both required and forbidden
- documents (present, localized, alternatives/notes well-formed)
- source URLs and dates, verification status/confidence, official-source presence (warning)
- localization: missing Telugu (warning), Devanagari inside a Telugu field (error)
- prerequisite ids, cycles, discontinued-scheme handling (warning)

`validateCatalogue` is used at module load for the bundled catalogue, in tests, and by `npm run validate:catalogue` for a future import file.

## Search and filtering (`src/core/search.ts`, `src/core/registry.ts`)

`buildSearchIndex` runs once per registry and stores, per scheme, the normalised name, normalised aliases, normalised category/tags/beneficiary groups/states and a haystack of every text field (English, Hindi, Telugu, Roman benefits included). `searchSchemes` scores a query: exact name 100, name prefix 80, exact alias 70, alias prefix 60, name substring 50, alias substring 40, category/tag/state 30, anywhere in the haystack 20. Ties keep catalogue order. A state code or alias is resolved first, so `TS` finds a Telangana scheme. There is no search UI: the journey stays conversational.

`filterSchemes` narrows with prebuilt indexes where possible: category, state (normalised), district (district-restricted schemes that list it, plus schemes without a district restriction), scope, tag, beneficiary group, occupation, verification status, provider, "depends on this scheme", and available-only. `dependentsOf` uses the same index for reverse dependency lookup.

## Profile and follow-ups (`src/core/types.ts`, `src/core/followups.ts`, `src/core/dialog.ts`)

Profile fields are all optional (`null` = not said): age, occupation, monthly income (+ estimated flag), urban/rural, dependants, state, district, and four yes/no facts. `district` was added in M6; older profiles remain valid because every field defaults to `null`.

A location question is offered only when a result is actually blocked on it: the matcher reports `missing: ['state']` or `['district']` only for a scheme whose geography cannot be evaluated. Because all six bundled schemes are national, the current flow never asks for a location. When it does ask:

- state is asked when at least one scheme needs it, and is last in the priority order so it does not take a slot from an age/income question;
- district is only asked after the state is known, and only for a district-restricted scheme whose state already matches;
- the four-question cap is unchanged;
- Skip leaves the field `null`, which produces `needs_info`, never `does_not_qualify`;
- an unrecognised answer re-asks (with `location_unknown`) instead of being stored;
- `locationCorrection` clears only state/district (and their asked marks) and re-evaluates, keeping every other answer.

`step(state, event, schemes)` accepts an optional catalogue so geography can be tested with a fixture scheme without adding invented schemes to `data/schemes.json`.

## Research register (`src/core/research.ts`, `src/core/research-coverage.ts`, `scripts/research.ts`)

A research record is not a scheme record. A scheme exists to be matched against a profile; a research record exists to hold provenance, open questions and how far verification got. `data/research/records.json` is one validated document holding three things: the records, the source register, and coverage claims made by researchers. It is a research artefact and is not bundled into the app, so the six schemes and every eligibility outcome are untouched by it.

### Lifecycle

`DISCOVERED -> CATALOGUED -> SOURCE_IDENTIFIED -> OFFICIALLY_VERIFIED -> ELIGIBILITY_VERIFIED -> READY_FOR_IMPORT -> IMPORTED`, plus `NEEDS_RESEARCH`, `CONFLICTING`, `OUTDATED` and `CLOSED` reachable from the researching states. `applyTransition` is pure and refuses a step the evidence does not support:

- `ELIGIBILITY_VERIFIED` needs at least one piece of evidence;
- `READY_FOR_IMPORT` needs eligibility verification first;
- `IMPORTED` needs the catalogue scheme id it became;
- no transition ever changes `verificationStatus`. A discovered scheme is not a verified scheme, and `OFFICIALLY_VERIFIED` (the scheme and its documents exist) says nothing about who qualifies.

Import readiness is separate and explicit: `NOT_READY`, `NEEDS_INFO`, `READY`, `IMPORTED`. `READY` is rejected while unresolved questions remain.

### Relationships

`SAME_SCHEME`, `DUPLICATE_RECORD`, `STATE_IMPLEMENTATION_OF`, `STATE_TOPUP_OF`, `RELATED`, `SUBSCHEME_OF`, `REPLACES`, `REPLACED_BY`. A relationship names one research record or one catalogue scheme by id, and every target is checked to exist. Nothing merges automatically: two records with the same official name produce a warning asking for a relationship. A state implementation, a state top-up and the central scheme stay separate records with their own conditions and application paths.

### Sources

Each source keeps id, URL, title, issuing authority, level, geography, tier, kind, retrieval date, verification date, reliability, licence notes, content hash, associated schemes and a change-detection state. Tiers run `PRIMARY_LEGAL`, `PRIMARY_OFFICIAL`, `SECONDARY_OFFICIAL`, `AGGREGATOR`, `UNKNOWN`. An `AGGREGATOR` source is accepted for discovery but is rejected by validation as eligibility evidence or as the basis of an eligibility condition, so a scraped portal can never become the reason a rule is believed.

### Coverage

Coverage is derived from the register, never assumed: central government, the 28 states and 8 union territories from `geo.ts`, 19 beneficiary groups, 4 age bands, and whatever categories the records use.

| Status | Meaning |
| --- | --- |
| `COVERED` | records exist and all of them are verified |
| `PARTIAL` | records exist but at least one is not verified |
| `NEEDS_MORE_RESEARCH` | a record in the area is conflicting or marked needs-research |
| `NOT_RESEARCHED` | no record, and no claim |
| `NONE_FOUND` | a researcher searched and recorded finding nothing |

`NONE_FOUND` is a statement about a search, not about the country. It requires a note saying what was searched, it never creates a record, it is overridden as soon as a record exists, and the report prints the caveat every time. No national scheme count is hardcoded anywhere.

The coverage report also counts records by department and prints the count, because discovery is run department by department and the next pass should start where the last one stopped. The department map itself lives in `docs/RESEARCH_DISCOVERY_REGISTER.md`.

Discovery is not coverage. A record that exists only on a listing page (status `DISCOVERED`/`CATALOGUED` with no registered evidence) is counted as `discovered`, never as `researched`, and an area is never `COVERED` while one sits unexamined; an area with listings only reports `NEEDS_MORE_RESEARCH`. The report prints both counts, because a register that inflates coverage with unopened tabs is worse than a small one.

Validation enforces the same distinction: `ELIGIBILITY_VERIFIED` needs at least one recorded condition, a source id on every condition and eligibility evidence; `OFFICIALLY_VERIFIED` needs evidence; a source URL cannot be registered twice; and a source's associated scheme id must be a catalogue scheme or a research record.

### CLI

```
npm run research -- list [--status S] [--level CENTRAL|STATE|UT] [--state X] [--category C] [--group G]
npm run research -- list [--unverified] [--missing-sources] [--conflicts] [--ready]
npm run research -- show <record-id>
npm run research -- validate          # research rules + catalogue cross-checks
npm run research -- coverage          # human-readable coverage report
npm run research -- gaps              # every area not yet researched
npm run research -- export [--out file.json]
```

`--file` and `--catalogue` override the defaults (`data/research/records.json`, `data/schemes.json`). `validate` also checks that an `IMPORTED` record names a scheme that actually exists, so the register cannot drift away from the catalogue. Importing a record into the catalogue is still the explicit step in `scripts/import-catalogue.ts`; nothing here writes scheme data.

## Performance

- Rules are compiled per scheme; matching is one pass over `schemes x conditions`.
- Registry indexes (id, alias, category, state, district) avoid scans for lookup and filtering.
- The provider map is built once for the bundled catalogue and reused by `matchCatalogue`; the search index is built once per registry.
- Scheme text is read from data at render time; no per-render JSON parsing, no repeated matching in the dialog (results are computed once per state advance).

Measured with `npm run bench:catalogue` (synthetic clones of a real scheme, Node 20 through tsx, this machine, M7 build):

| Schemes | Registry build | Match (compiled) | Recompile-only cost | Search | Category filter | Alias lookup | Dependency lookup | Heap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | 3.2 ms | 0.17 ms | 0.31 ms | 0.21 ms | 0.004 ms | 0.001 ms | 0.000 ms | 0.1 MB |
| 100 | 27.6 ms | 2.09 ms | 2.10 ms | 0.50 ms | 0.017 ms | 0.001 ms | 0.000 ms | 1.8 MB |
| 500 | 110.6 ms | 4.96 ms | 9.69 ms | 1.20 ms | 0.026 ms | 0.001 ms | 0.000 ms | 2.5 MB |
| 1,000 | 141.7 ms | 6.88 ms | 9.20 ms | 2.77 ms | 0.040 ms | 0.000 ms | 0.000 ms | 7.3 MB |
| 2,000 | 201.3 ms | 10.98 ms | 20.81 ms | 4.63 ms | 0.070 ms | 0.000 ms | 0.000 ms | 18.7 MB |
| 5,000 | 660.4 ms | 29.06 ms | 43.40 ms | 10.65 ms | 0.165 ms | 0.000 ms | 0.000 ms | 13.9 MB |
| 10,000 | 1,058.4 ms | 104.88 ms | 104.25 ms | 19.58 ms | 0.277 ms | 0.002 ms | 0.001 ms | 19.4 MB |

The "recompile-only cost" column is what the engine would spend compiling every rule set once, which is what the matcher used to do on every profile. Precompilation roughly halves matching at 2,000–5,000 schemes; at 10,000 the result-object allocation dominates both columns, so the saving is no longer the bottleneck. Matching is computed once per dialog step, not per render.

Synthetic entries are only used for measurement; they are never written to the catalogue. Heap is the process delta after building the registry and is indicative only (no forced GC).

No database or backend is needed: the catalogue is static data shipped with the app, and the profile is in-memory only. Adding a database now would add infrastructure without changing what the MVP does.
