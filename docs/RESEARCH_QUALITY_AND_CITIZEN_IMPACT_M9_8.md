# Research quality, coverage and citizen impact (M9.8)

Date: 28 November 2026. A research-quality milestone: audit the register, put a deterministic priority model and quality report behind it, and do one limited evidence pass. No scheme, rule, engine, citizen or journey change. `data/schemes.json` untouched; nothing imported.

## 1. Infrastructure audit

The register already had more than enough structure for this work; the missing piece was a way to reason about *evidence quality* rather than status labels.

| Existing piece | What it already does |
| --- | --- |
| `src/core/research.ts` | Record/source model, 13 research statuses with legal transitions, source tiers (`PRIMARY_LEGAL`, `PRIMARY_OFFICIAL`, `SECONDARY_OFFICIAL`, `AGGREGATOR`, `UNKNOWN`), condition-level evidence, conflicts, import readiness, validator (duplicate URLs, unsourced conditions, `conflicting_verified`), `staleSources()` freshness queue |
| `src/core/research-coverage.ts` | Coverage by level/state/group/age/category, department counts, "discovery is not coverage" |
| `scripts/research.ts` | `list`, `show`, `validate`, `coverage`, `gaps`, `sources`, `export` |
| `data/research/records.json` | 98 records, 101 sources, 212 open questions |

So M9.8 does **not** rebuild coverage, freshness, transitions or validation. It adds `research-priority.ts` (scoring) and `research-quality.ts` (evidence outcomes + health report), and one CLI command.

## 2. Initial quality findings

Measured on the register before this milestone:

- **98 records**: 51 researched, 47 listing-only; 14 verified, 35 partially verified, 49 unverified.
- **53 records with no eligibility condition at all**; **80 with no official application link**; **10 with no benefit recorded**.
- **2 conflicts** (Cheyutha, PMFBY) and **2 outdated** records — all preserved, none silently resolved.
- **101 sources**, all primary official/legal except one secondary; no aggregator is used as evidence anywhere. One source is `GONE` (the 2019 Aasara order on `scpwd.telangana.gov.in`, which still does not respond).
- **212 unresolved questions** across all 98 records: the register is honest about what it does not know, but there was no tool that sorted them by citizen impact.
- **Zero import-ready records.** Readiness is not the bottleneck; evidence is.

Status-label audit found no record marked `VERIFIED` without a source and no `AGGREGATOR` used for eligibility. The one real integrity problem was structural: a dead link was the only trace of the Aasara amounts (see §6).

## 3. Quality model

A record is not "complete" because its fields are filled. `assessRecordQuality` derives one outcome from the most serious problem present, in this precedence:

| Outcome | Meaning |
| --- | --- |
| `CONFLICTING` | sources disagree and the register says so |
| `SOURCE_INACCESSIBLE` | a linked source is `GONE` |
| `SOURCE_OUTDATED` | record marked outdated, or every source older than a year |
| `SOURCE_NOT_AUTHORITATIVE` | best linked source is secondary or an aggregator |
| `CONDITION_UNVERIFIED` | no conditions, or conditions without a source |
| `NOT_RESEARCHED` | listing only / unverified with no evidence |
| `COMPLETE` | authoritative, reachable source covers the recorded conditions |

Each row also carries the one next task, its reason, linked source ids, best authority, gaps, and the priority score. `NO_INFORMATION_FOUND` exists as a label for a recorded search but is never assigned automatically — an empty register row is `NOT_RESEARCHED`, not "no scheme exists".

## 4. Priority model

`src/core/research-priority.ts`, model version **1.0.0**, weights sum to 100:

| Factor | Weight | What it measures |
| --- | --- | --- |
| Beneficiary vulnerability | 25 | worst-case group served, from a fixed table (disability, transgender, orphans 1.0 … entrepreneurs 0.35) |
| Evidence uncertainty | 25 | status + verification, raised by missing conditions, unsourced conditions, conflicts |
| Material value | 15 | benefit kind (cash 1.0 … service 0.5), plus whether an amount is established |
| Breadth | 10 | central 1.0, state 0.7, district-limited 0.5 |
| Urgency | 10 | pension/health 1.0 … environment 0.4 |
| Coverage gap | 10 | fewer than six records for the group raises it; needs the full register |
| Likelihood of need | 5 | everyday relevance of the category |

Every factor reports `weight`, `score` (0–1), `contribution`, and a sentence. The total is the sum of contributions, rounded to 0.1; ties break by record id.

**Missing data is never favourable.** An absent beneficiary group scores 0.2 for vulnerability and says "vulnerability cannot be argued". Only *uncertainty* rises when evidence is missing, because that is the research need being measured, and the reason names the specific gap.

**Explicitly a planning tool.** It reads records and returns scores; nothing else imports it into matching, eligibility, verification status or import readiness. Tested by snapshotting the input record before and after.

## 5. Methodology limits

- The weights are judgement, written down and versioned so they can be argued with, not measured effects.
- `coverage_gap` counts register rows, not population or scheme counts per district; thin coverage can mean "we have not looked" rather than "few schemes exist".
- Vulnerability uses the worst group a record serves, not the share of citizens in it.
- Breadth uses scope, not beneficiary counts (the register rarely records them).
- Source authority comes from the declared tier; a mis-tiered source would mislead the report, so tier review stays manual.

## 6. Targeted research performed

Phases 2 and 5 were limited to the top two priorities and one integrity problem. **Three sources were fetched on 2026-11-28 and all returned HTTP 200**:

| Source | URL | What it actually supports |
| --- | --- | --- |
| Suryapet district — Cheyutha | `https://suryapet.telangana.gov.in/scheme/cheyutha-scheme` | ₹10 lakh Aarogyasri cover for BPL card families, launched 9 Dec 2023, 1,672 packages, 21 specialities |
| Wanaparthy district — Cheyutha | `https://wanaparthy.telangana.gov.in/scheme/scheme-title-1-will-appear-here-14` | the *same* name as a monthly pension (₹4,000; ₹6,000 disabled) **plus** the ₹10 lakh cover |
| NACO copy of G.O.Ms.No.34 (28-05-2019) | `https://naco.mohfw.gov.in/files/Telengana.pdf` | Aasara amounts ₹2,016 / ₹3,016 and the category eligibility table |

Record changes:

- **`research-tg-cheyutha`** — two district pages and two conditions added. The conflict is now sharper, not resolved: the state portal and Suryapet describe a health cover; Wanaparthy describes a pension *and* the cover. Status remains `CONFLICTING` / `UNVERIFIED`, no amount is recorded in `benefit`, and the unresolved questions name the missing Government Order and the 2025-26 budget speech that lists Cheyutha among Abhayahastam schemes without settling it.
- **`research-tg-aasara-pensions`** — the 2019 order is now cited in an accessible NACO copy (`PRIMARY_LEGAL`), so the ₹2,016/₹3,016 figures have a legal source again; the dead `scpwd` link stays on record as `GONE`. Verification remains `PARTIALLY_VERIFIED`: the post-2019 rate and the 57-vs-65 age question are still open.

No status was upgraded. No condition, amount or date was inferred.

## 7. Conflicts retained

1. **Cheyutha** — pension vs health cover (above).
2. **PMFBY** — Telangana enrolled through 2024-25 but absent from the 2026 official table; unchanged.
3. **Aasara age** — 57 (2021 outlook) vs 65 (CAG table for 2018-21); unchanged and still an open question.

## 8. Highest-impact gaps

1. **Cheyutha** (81.7) — conflicting evidence, no GO, no application route, no benefit recorded.
2. **Aasara Pensions** (77.1) — partial verification, no official application link, current rate unconfirmed.
3. **Transgender economic rehabilitation** (76.4) — one district page, no conditions recorded.
4. **Free aids and appliances for PwDs** (76.0) — listing only, no conditions.
5. **Supplementary Nutrition Programme** (75.3) and **Single Women Pension** (75.3) — listing only.

Also visible in the queue: 47 listing-only records, 52 condition-unverified records, one unreachable source.

## 9. Freshness policy

Unchanged in substance, now reported: `<=90` days current, `91–180` aging, `>180` stale, no date unknown. Freshness is deliberately **not** a verification signal: a freshly checked aggregator is still not authoritative, and a 2019 Government Order is still valid law. The report counts all four buckets and `staleSources()` remains a review queue, never a downgrade trigger.

## 10. Quality reporting tools

```bash
npm run research -- quality [--limit 10] [--today 2026-11-28]
```

Prints: totals, status/verification/authority/freshness distributions, outcome distribution, the top priorities with reasons and gaps, the action queue with distinct labels (`not researched`, `source inaccessible`, `source not authoritative`, `evidence conflicting`, `condition not verified`, `source outdated`), and any readiness claim the evidence does not support. Deterministic: the only variable input is `--today`.

Module API: `buildQualityReport(records, sources, options)`, `assessRecordQuality`, `sourceAuthority`, `importReadinessProblems`, `formatQualityReport`; `assessRecordPriority`, `rankResearchPriorities`.

## 11. Import readiness

Nothing was imported and no record was promoted. `importReadinessProblems()` exists to catch the opposite failure — a record claiming `READY`/`IMPORTED` without verified, sourced conditions or a `VERIFIED` status. Today it reports **zero** records: the register is already conservative. Readiness remains a human decision; the function only reports.

## 12. Files

Created: `src/core/research-priority.ts`, `src/core/research-quality.ts`, `src/core/research-priority.test.ts`, `src/core/research-quality.test.ts`, this document.
Modified: `scripts/research.ts` (quality command), `data/research/records.json` (3 sources, 2 records), `PLAN.md`.

## 13. Tests

28 new tests: factor weights sum to 100, score equals the sum of contributions, determinism and tie-break by id, vulnerability/benefit/uncertainty/coverage-gap ordering, missing-data low scores with reasons, gap explanations, limit behaviour, and that assessing never mutates a record; authority classification, each outcome, freshness buckets, totals, queue ordering, report determinism, formatter content, and the readiness guard (which must report, not repair).

## 14. Limitations

- The model is a prioritisation aid with hand-set weights, not a measurement of impact.
- Coverage counts register rows, not citizens or schemes in the world.
- District pages are `SECONDARY_OFFICIAL`: useful evidence of what is published, not proof of the rule.
- The quality report has no historical trend (no snapshots are stored).
- 47 records remain listing-only; this milestone did not attempt to change that at scale.
- Freshness buckets are coarse and depend on `lastCheckedOn`, which is manual.

## 15. Recommended next steps

1. **Resolve Cheyutha with a Government Order** — it is the top priority and the only conflict where two official pages describe different programmes.
2. Retrieve the Aasara order after 2019 and settle the current rate and the 57/65 age limit.
3. Work the condition-unverified queue by group, starting with persons with disabilities and transgender records, which have the thinnest coverage.

Next milestone: **M9.9 — closing the top ten research gaps** (evidence only), or the frontend integration if the demo takes priority. Not started.
