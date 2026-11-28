# Telangana scheme discovery expansion (M9.2)

Date: 28 November 2026. Discovery only: no scheme was imported, no eligibility rule was written, no UI or engine code changed, `data/schemes.json` untouched.

## 1. Discovery results

| Measure | Count |
| --- | --- |
| Candidate programmes surfaced by six independent discovery paths | ~120 |
| New records added to the register | **59** |
| Of those, state programmes | 52 |
| Of those, central schemes implemented in Telangana | 7 (PMFBY, PM-KISAN, PM-KUSUM, PMMSY, PMFME, PM Surya Ghar, Agriculture Infrastructure Fund) |
| Genuinely new unique programmes | 59 |
| Candidates returned that were already in the register | 11 |
| Renamed / replaced / umbrella cases handled as one record | 3 (BOCWWB board benefits, Labour Welfare Fund benefits, pre/post-matric scholarship families) |
| Records that reached eligibility verification | 0 |

Every new record is `CATALOGUED`, `UNVERIFIED`, `NEEDS_INFO`, with one official source fetched on 2026-11-28. Nothing discovered in this milestone was verified further than "the official page describes this programme".

### Why 59 and not 200

Every candidate needed an official page that actually loaded and described the programme. Programmes whose only source was a directory listing, an aggregator, an unreachable host or a search snippet were **not** turned into records. That is why departments with real programmes (disability and transgender welfare, horticulture micro-irrigation, Mission Vatsalya, KCC) appear in the gap list rather than the register.

### Structure decisions

- **One record per board registration, not per benefit.** The BOCWWB page lists eight benefits under one registration (marriage gift, maternity, accident relief, disability relief, hospitalisation, natural death, funeral, unregistered-worker relief). Eight records would imply eight separate applications. The record carries the benefit list in `benefitSummary` and the questions that a benefit-level record would have answered.
- **Central schemes are separate records from their state delivery.** PMFBY, PM-KISAN, PM-KUSUM, PMMSY, PMFME, PM Surya Ghar and AIF are `CENTRAL` with the Telangana implementing agency named in `department`. Where state delivery is documented, it is in the notes; no state top-up was invented.
- **Scholarship families are umbrella records.** Pre-matric and post-matric are each one record with the community variants named in `aliases` and questions; the four overseas schemes are separate because they have separate departments and separate portals.
- **TGSRTC passes are separate from Mahalakshmi.** Free travel for women is the Mahalakshmi record; the bus-pass record covers the other concession categories and links to Mahalakshmi with `RELATED`.

## 2. Research distribution

- **Records:** 88 total (75 Telangana state, 13 central, 0 UT).
- **Departments:** 50 distinct department labels, listed in [RESEARCH_DISCOVERY_REGISTER.md](RESEARCH_DISCOVERY_REGISTER.md).
- **Categories (17):** agriculture 16, education 15, entrepreneurship 11, social welfare 7, women and child 7, health 6, labour 4, insurance 4, utilities 4, financial inclusion 3, employment 3, housing 2, skill development 2, pension 1, environment 1, disability 1, transport 1.
- **New categories justified:** `education`, `skill_development`, `disability`, `transport`. The existing set had no place for schooling support, skilling, disability-specific benefits or travel concessions, and forcing them into `social_welfare` would have hidden exactly the gaps discovery is meant to expose. No existing category was renamed.
- **Beneficiary groups:** farmers (11), students (14 across variants), entrepreneurs (11), SC/ST/OBC (17), women (9), minorities (7), weavers (4), persons with disabilities (3), construction workers (2), fisherfolk (2), artisans (2), unorganised workers (4). **34 new records carry no group** because they are open to all households or individuals (health cover, emergency relief, helpline, rooftop solar, industrial incentives) and the taxonomy has no "all residents" key. That is a real limitation of the group coverage numbers, not a claim that those schemes have no beneficiaries.
- **Geography:** Telangana statewide for 52; 7 central; 0 district-restricted records. District pages were used only as evidence for statewide programmes.

## 3. Evidence quality

- **Official sources:** 59 discovery sources, all `PRIMARY_OFFICIAL`, all fetched and HTTP-checked on 2026-11-28. Ten URLs cover more than one record (ePASS, the BC Welfare page, the fisheries page, the OBMMS portal); each such source lists every record id it supports rather than being registered twice.
- **Weakest evidence:** district pages (Jagtial minorities, Kamareddy BC/MEPMA, Mahabubabad SC corporation, Warangal fisheries/sericulture, Wanaparthy DRDA/handlooms) — official, but summaries that may lag the departmental order. They are marked `confidence: low` and carry that question in the record.
- **Sources that failed and were not used:** the Disability/Senior Citizens/Transgender department site (`wdsc.telangana.gov.in`), the horticulture micro-irrigation page, the Minority Finance Corporation site (HTTP 406), the SC/ST residential society site (HTTP 404), the child rights commission, the tribal residential society (404), and the skill-development directorate. Those programmes are listed as gaps, not records.
- **Conflicts recorded:** none new. No amount was copied from a district page into `benefit.amountInr`; no eligibility condition was recorded at all.
- **Rejected as already in the register:** Arogya Lakshmi, KCR Kit, Cheyutha, Rajiv Yuva Vikasam, Dalit Bandhu, Mahalakshmi (free women's bus travel), Mission Bhagiratha, sheep distribution, Rythu Bima, single women pension, SHE Teams. The other 18 existing records were checked the same way but no discovery path returned them.
- **Left out rather than guessed:** "Chenetha Chandrutha" (the state handloom wage scheme appears as Chenetha Mithra) and "Bangaru Bidda" (the official name found was Bangaruthalli, and only in a 2018-19 report).

## 4. Gaps remaining

**Departments with programmes but no usable source this round:** Empowerment of Persons with Disabilities / Senior Citizens / Transgender (site unreachable), Horticulture (micro-irrigation page unreachable), Animal Husbandry (dairy and poultry units), Fisheries (department site, only district pages reachable), Civil Supplies (food security, ration cards), Transport (only TGSRTC passes), Energy (only TGREDCO schemes), Environment, Youth Affairs and Sports, Law (advocates fund), Sericulture (department site), Minority Finance Corporation (site error).

**Beneficiary groups still thin:** gig/platform workers (0), migrants (0), orphans (0), veterans (0), senior citizens (only Aasara), persons with disabilities (one new record), transgender (no new record despite a state department), domestic workers, beedi workers, auto drivers.

**District-level discovery:** 0 of 33 district portals scanned systematically; the 12 district pages used were found through searches, not a sweep. No district-specific programme was recorded.

**Deeper research needed:** all 59 new records — that is the point of discovery status. The largest single gap is education: 15 records all pointing at one ePASS portal, with no scholarship amount, income limit or deadline recorded.

**Central schemes not yet covered:** Ayushman Bharat PM-JAY (Telangana implementation), National Food Security Act/ration entitlements, PM Vishwakarma, Stand-Up India, PMEGP, MGNREGA, PM Awas Yojana-Gramin, National Social Assistance Programme components, PM Kisan Maan-dhan, Atal Pension Yojana. Each needs its own record with the Telangana delivery route.

## 5. Infrastructure

- **Coverage report now groups records by department** (`research -- coverage`), so the next discovery pass can be aimed at departments with no records instead of repeating the same searches.
- **Discovery register** ([RESEARCH_DISCOVERY_REGISTER.md](RESEARCH_DISCOVERY_REGISTER.md)): the department-by-department map of what was found, what is blocked and what is untouched.
- **No new validator rules were needed** — the M9.1 rules did the work: they caught ten duplicate source URLs and one invalid relationship type during this milestone, which is why ten sources carry multiple record ids.
- **New tests:** every expansion record must be `UNVERIFIED`/`NEEDS_INFO`, carry a discovery URL, have no eligibility conditions and be backed by at least one `PRIMARY_OFFICIAL` source; plus a department-count test for the coverage report.
- **Not built:** no crawler, no AI extraction, no parallel database. Discovery stayed search-driven with a human-written record per programme.

## 6. Validation

| Command | Result |
| --- | --- |
| `npm run research -- validate` | ok: 88 records, 78 sources, 0 coverage claims, 0 warnings |
| `npm run research -- coverage` | 88 records (21 researched, 67 discoveries), central 13, state 75, verified 6, partial 14, import-ready 0, 17 categories, 50 departments |
| `npm run research -- gaps` | 52 gaps (the same national/district areas; group coverage now splits researched vs discovered) |
| `npm run research -- list --conflicts` | 1 (Cheyutha, unchanged) |
| `npx tsc -b` | exit 0 |
| `npx vitest run` | 23 files, 553 tests passed |
| `npx oxlint src scripts` | 0 errors, 2 pre-existing warnings in `Flow.tsx` |
| `npm run build` | passed |

## 7. Integrity

- `data/schemes.json` unchanged (empty `git diff`).
- Eligibility engine, matcher and UI untouched.
- No discovered scheme imported; 0 import-ready records.
- No eligibility condition, amount, deadline or application link was written for any new record.
- Every new record is separated from verified schemes by status, verification status and import readiness; none carries verification evidence.

## 8. Recommendation

**M9.3 — verify the highest-impact discoveries.** Take the ~20 records that matter most to citizens (Aarogyasri, PMFBY, PM-KISAN, pre/post-matric scholarships, overseas scholarships, BOCWWB, Aasara-adjacent worker benefits, PM-KUSUM, PM Surya Ghar, CMRF) from `CATALOGUED` to `OFFICIALLY_VERIFIED` or `ELIGIBILITY_VERIFIED` by reading the governing order or guideline — not by adding more listings. Discovery is now wide enough that the next marginal record is worth less than the first verified one.

Not started automatically.
