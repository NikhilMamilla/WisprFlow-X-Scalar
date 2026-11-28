# High-impact evidence closure (M9.9)

Date: 28 November 2026. An evidence-only milestone: take the six highest-priority records, read authoritative sources, and change a status only where the source supports it. No scheme, rule, engine, citizen, journey, UI or dependency change; `data/schemes.json` untouched; nothing imported.

## 1. Audit before research

The M9.8 priority ranking was regenerated first (`quality --limit 10 --today 2026-11-28`), not assumed. The top six were unchanged: Cheyutha 81.7, Aasara 77.1, Transgender economic rehabilitation 76.4, PwD aids and appliances 76.0, Supplementary Nutrition 75.3, Single Women Pension 75.3. They became the batch; no lower-ranked record was added just to fill the quota of ten.

State at the start: 98 records / 101 sources, 42 complete, 52 condition-unverified, 2 conflicting, 47 listing-only, 0 import-ready, one inaccessible source (the 2019 Aasara order on `scpwd`).

Already attempted before M9.9, and not repeated blindly: the state portal and two district pages for Cheyutha; the NACO copy of G.O.Ms.No.34; the TSLSA disability compilation; the Wanaparthy welfare page. The `wdsc.telangana.gov.in` host had failed from the audit machine in earlier passes; it failed again (see §3).

Realistically closable this pass: Aasara criteria, Single Women criteria, PwD aids general eligibility, nutrition entitlement, transgender eligibility. Not closable: the Cheyutha Government Order (none found), post-2019 Aasara rates, Telangana's SNP ration.

## 2. Batch

| Record | Priority at start | Why selected |
| --- | --- | --- |
| `research-tg-cheyutha` | 81.7 | highest priority; conflicting official pages |
| `research-tg-aasara-pensions` | 77.1 | rate and age unresolved; affects the most people |
| `research-tg-transgender-economic-rehab` | 76.4 | thinnest evidence in the most vulnerable group |
| `research-aids-appliances` | 76.0 | listing only, no conditions |
| `research-supplementary-nutrition` | 75.3 | listing only, large beneficiary group |
| `research-tg-single-women-pension` | 75.3 | listing only, exact rules never recorded |

## 3. Sources accessed

All fetched on 2026-11-28 and all returned HTTP 200 unless noted.

| Source | What was read | Authority |
| --- | --- | --- |
| `cag-aasara-audit` — CAG performance audit of Aasara (2023) | Table 1.1 category criteria, exclusion rules, amounts | Primary official |
| `naco-aasara-go34` — G.O.Ms.No.34, 28-05-2019 | 2019 amounts by category | Primary legal |
| `mcrhrdi-welfare-policies` — MCR HRD Institute, "Welfare Policies of Telangana", Feb 2026 | Aasara/Cheyutha pension table, Rajiv Aarogyasri separated | Secondary official |
| `wdsc-tg-ers` — department Economic Rehabilitation Scheme page | full transgender eligibility criteria, subsidy slabs | Primary official, **intermittent host** |
| `disc-aids-appliances` — Telangana OBMMS aids registration page | 40% disability, residency, application route, window date | Primary official |
| `wcd-snp-rules-2022` — Saksham Anganwadi and Poshan 2.0 Rules, 2022 | entitlement groups, 300 days, Anganwadi registration | Primary legal |
| `wcd-poshan2-guidelines` — Mission Poshan 2.0 guidelines | age bands, adolescent-girl scope | Primary official |
| `suryapet-cheyutha`, `wanaparthy-cheyutha-detail` (from M9.8) | re-read for the conflict | Secondary official |

**Inaccessible.** `wdsc.telangana.gov.in` failed repeated direct HTTP requests from the audit machine on 2026-11-28 (connection error, no status), while the page content was retrievable through a separate fetch. The source is recorded with that caveat, marked intermittent, and is not used to settle any amount. No Telangana department site for supplementary nutrition resolved (`wdcw`, `icds` hosts do not answer), so the nutrition record relies on national law and national guidelines only.

## 4. Per-scheme result

| Field | Cheyutha | Aasara |
| --- | --- | --- |
| Initial priority | 81.7 | 77.1 |
| Initial state | CONFLICTING / UNVERIFIED, 2 conditions, no benefit | ELIGIBILITY_VERIFIED / PARTIAL, 5 conditions |
| Research performed | sought an order; read a 2026 government training summary; re-compared district pages | read CAG criteria table; compared 2019 order, CAG and 2026 summary |
| Evidence established | Cheyutha is used as the pension scheme's name in official training material; Aarogyasri is listed separately | old age 65, widow 18+, disability 40%/hearing 51%, weaver and toddy 50+, HIV on ART, filaria II–III, beedi pre-2014, one member per household except disabled/widows/beedi |
| Still missing | the Government Order; why Wanaparthy says ₹4,000/₹6,000; application route | post-2019 rates; age 57 vs 65; disabled ₹3,016 vs ₹4,016; application route; dialysis and thekadar criteria |
| Conflicts | **retained**, now three-way | **retained** on rate and age |
| Conditions | 3 (1 new) | 12 (7 new) |
| Status | CONFLICTING / UNVERIFIED | ELIGIBILITY_VERIFIED / PARTIALLY_VERIFIED |
| Next | find G.O. or launch file for Cheyutha; ask the department which district figure is correct | read the current Aasara order and the pension sanction guidelines |

| Field | Transgender economic rehabilitation | PwD aids and appliances |
| --- | --- | --- |
| Initial priority | 76.4 | 76.0 |
| Initial state | SOURCE_IDENTIFIED / PARTIAL, 0 conditions, ₹75,000 loan | CATALOGUED / UNVERIFIED, 0 conditions |
| Research performed | read the department scheme page | read the OBMMS registration page |
| Evidence established | ID card or certificate; age 21–55; income below ₹1.5 lakh rural / ₹2 lakh urban or white card; unemployed; Telangana resident; manual application via district notification; ₹50,000 unit at 100% subsidy | Telangana resident; 40%+ disability; online application with food-security or Meeseva income number; item-wise criteria in Annexure A/B; 10-02-2026 window printed |
| Still missing | order behind ₹50,000; whether ₹75,000 is a 2025-26 revision; current window | annexure criteria (age, income, item limits); current window; supply route |
| Conflicts | **retained** (₹50,000 vs ₹75,000) | none |
| Conditions | 5 | 3 |
| Status | ELIGIBILITY_VERIFIED / PARTIALLY_VERIFIED | ELIGIBILITY_VERIFIED / PARTIALLY_VERIFIED |
| Next | open the FY2025-26 application PDF and its notification | open Annexure-A/B and record per-item rules |

| Field | Supplementary Nutrition | Single Women Pension |
| --- | --- | --- |
| Initial priority | 75.3 | 75.3 |
| Initial state | CATALOGUED / UNVERIFIED, 0 conditions | CATALOGUED / UNVERIFIED, 0 conditions, no benefit |
| Research performed | read the 2022 Rules and Poshan 2.0 guidelines | read the CAG criteria and the 2019 order |
| Evidence established | children 6 months–6 years; pregnant and lactating women until 6 months after birth; 300 days a year; registered at an Anganwadi with Aadhaar; adolescent girls only in aspirational districts/NER | unmarried above 30 rural / 35 urban; separated or deserted over one year, above 18; stops on remarriage or reunion; one member per household; ₹2,016 a month |
| Still missing | Telangana ration, quantity and enrolment; state menu | post-2019 rate; Telangana application route and documents |
| Conflicts | none | none |
| Conditions | 4 | 4 |
| Status | ELIGIBILITY_VERIFIED / PARTIALLY_VERIFIED | ELIGIBILITY_VERIFIED / PARTIALLY_VERIFIED |
| Next | read a Telangana ICDS/Anganwadi order or district WCD page | read the current pension order and the application process |

## 5. Conflicts

- **Cheyutha — retained.** Three official descriptions now exist: state portal and Suryapet (₹10 lakh cover only), Wanaparthy (₹4,000/₹6,000 pension plus cover), and the 2026 MCR HRD summary (Aasara/Cheyutha pension at ₹2,016/₹4,016, cover separate under Aarogyasri). None is an order; the figures still cannot be reconciled. Status stays CONFLICTING.
- **Aasara — retained.** Disabled pension ₹3,016 in the 2019 order, ₹4,016 in the 2026 material; old-age age 65 in the CAG audit table, 57 in the state outlook. Both disagreements are in `unresolvedQuestions` and the amount note.
- **Transgender unit cost — retained.** ₹50,000 on the undated department page, ₹75,000 on the Wanaparthy page for 2025-26. Not averaged; the lower is recorded with the higher named.
- **PMFBY** — untouched, still conflicting.

## 6. Status and verification changes

| Record | Status before → after | Verification |
| --- | --- | --- |
| Cheyutha | CONFLICTING → CONFLICTING | UNVERIFIED (unchanged) |
| Aasara | ELIGIBILITY_VERIFIED → same | PARTIALLY_VERIFIED (unchanged) |
| Transgender ERS | SOURCE_IDENTIFIED → ELIGIBILITY_VERIFIED | PARTIALLY_VERIFIED (unchanged) |
| PwD aids | CATALOGUED → ELIGIBILITY_VERIFIED | UNVERIFIED → PARTIALLY_VERIFIED |
| Supplementary Nutrition | CATALOGUED → ELIGIBILITY_VERIFIED | UNVERIFIED → PARTIALLY_VERIFIED |
| Single Women | CATALOGUED → ELIGIBILITY_VERIFIED | UNVERIFIED → PARTIALLY_VERIFIED |

Every change has a `statusHistory` entry dated 2026-11-28 and evidence attached; the register validator confirms no transition skipped a step.

## 7. Before / after

| Metric | M9.8 | M9.9 |
| --- | --- | --- |
| Records | 98 | 98 |
| Sources | 101 | 108 |
| Researched / listing only | 51 / 47 | 54 / 44 |
| Verified / partial / unverified | 14 / 35 / 49 | 14 / 38 / 46 |
| Records with no conditions | 53 | 49 |
| Records with no benefit | 10 | 9 |
| Complete outcomes | 42 | 46 |
| Condition-unverified outcomes | 52 | 48 |
| Conflicts | 2 | 2 |
| Inaccessible sources | 1 | 1 |
| Authoritative sources | 100 | 104 |
| Import ready | 0 | 0 |
| Unresolved questions | 212 | 218 |

The question count rose because new sources raised new specific questions (the FY2025-26 form, annexure criteria, post-2019 orders). That is the intended direction: fewer unknowns hidden, more named.

**Priority movement:** Cheyutha 81.7 → 81.7, Aasara 77.1 → 77.1, Single Women 75.3 → 72.9, Transgender 76.4 → 65.1, Aids 76.0 → 61.6, Nutrition 75.3 → 60.9. The last four fell because evidence improved, not because the schemes matter less.

## 8. Tests and integrity

No production code changed, so the M9.8 suites stand: 667 tests, including determinism of the quality report and priority ranking, outcome precedence, readiness guard and the no-mutation check. Research validation passes with 108 sources and 0 warnings. `data/schemes.json`, eligibility rules, citizen explanations and journey behaviour are byte-for-byte unchanged (verified by `git diff`), and no dependency was added.

## 9. Remaining high-priority gaps

1. **Cheyutha order** — the only conflict where two official sources describe different programmes.
2. **Current Aasara order** — one document would settle rate, disabled amount and the age limit.
3. **Telangana nutrition** — national entitlement is known; state ration and enrolment are not.
4. **Annexure A/B** — per-item PwD aid criteria and current window.
5. **Marriage incentive** (74.2) and **Mahalakshmi** (74.1) are the next two by score, untouched this pass.

## 10. Limitations

- Two of eight sources are secondary (district pages, training material) and none of them can settle a conflict.
- The department page used for transgender eligibility is undated and intermittently reachable.
- National nutrition rules are not evidence of Telangana implementation.
- Import readiness remains 0 by design; evidence closure does not imply import.

## 11. Next milestone

**M9.10 — authoritative order retrieval**: obtain and read the Cheyutha order and the current Aasara order, then re-run M9.9's queue. Not started.
