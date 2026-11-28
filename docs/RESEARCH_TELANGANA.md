# Telangana research campaign (M9)

Date: 27 November 2026. Register: `data/research/records.json`. Tooling: `npm run research -- ...` (M8).

This milestone is research, not engineering. No scheme was imported into `data/schemes.json`, no eligibility rule was changed, and nothing was merged. Every count below is derived from the register; none is estimated.

**Expanded in M9.2:** 59 further Telangana and central programmes were catalogued from official pages; see [RESEARCH_TELANGANA_DISCOVERY.md](RESEARCH_TELANGANA_DISCOVERY.md). This document remains the record of the original 29-record research campaign.

**Amended by the M9.1 quality audit** ([docs/RESEARCH_QUALITY_AUDIT_M9_1.md](RESEARCH_QUALITY_AUDIT_M9_1.md)): two verification statuses were downgraded, an incorrect Aasara age limit was corrected, two unreachable application links were withdrawn, and coverage now separates researched from listing-only records. The counts below are post-audit.

## Summary

| Measure | Count |
| --- | --- |
| Research records | 29 |
| Researched (has registered evidence) | 21 |
| Listing only (discovered, not researched) | 8 |
| Telangana state records | 23 |
| Central records audited | 6 |
| District-specific records | 0 |
| Reached official verification (any level) | 19 |
| Eligibility conditions verified | 15 |
| Application information recorded | 6 |
| Fully verified | 6 |
| Partially verified | 14 |
| Unverified | 9 |
| Conflicting | 1 |
| Outdated | 1 |
| Discovered but not researched (CATALOGUED) | 8 |
| Import-ready | 0 |
| Sources registered | 29 |

Zero import-ready is deliberate: every researched scheme still has at least one open question (a current GO, a current amount, or an application route). None was pushed to the catalogue to inflate the number.

## 1. Methodology

1. Audit the M8 model and CLI before writing anything (`src/core/research.ts`, `src/core/research-coverage.ts`, `scripts/research.ts`).
2. Discover from official state and district pages: the Telangana State Portal's Government Initiatives page and the scheme pages of Wanaparthy, Medak, Adilabad, Suryapet, Mulugu, Medchal-Malkajgiri and Yadadri Bhuvanagiri districts.
3. For each scheme, look for an eligibility statement, a benefit statement and an application route on an official page. Where only a listing existed, the record stays `CATALOGUED` with the questions written down.
4. Record only what a source prints. Amounts are recorded only when printed; age and income limits only in the words of the source; unknown stays unknown. No aggregator was used as eligibility evidence.
5. Keep schemes separate. `Kalyana Lakshmi` and `Shaadi Mubarak` are separate records because they are separate services with different communities; `Rythu Bandhu` is separate from `Rythu Bharosa` and linked `REPLACED_BY`.
6. Where official pages disagree (Cheyutha), the record is `CONFLICTING` and stays unverified.
7. Validate the whole register with `npm run research -- validate` after the batch; fix every failure before continuing.

Every source was read on 2026-11-27. Dates in the register are retrieval dates, not claims about when a scheme last changed.

## 2. Official sources consulted

| Tier | Sources |
| --- | --- |
| `PRIMARY_LEGAL` (1) | Aasara G.O. Ms. No. 34 (scpwd.telangana.gov.in) |
| `PRIMARY_OFFICIAL` (27) | Telangana State Portal; district administrations (Wanaparthy, Medak, Adilabad, Suryapet, Mulugu, Medchal-Malkajgiri); Telangana ePASS; Rythu Bharosa portal; Indiramma Indlu portal; Dalit Bandhu portal; WDCW (wdcw.tg.nic.in); Rajiv Yuva Vikasam guidelines; CAG Aasara audit; e-Shram FAQ and scheme finder; Department of Financial Services (PMSBY, PMJJBY, PMJDY); pmjdy.gov.in; PM SVANidhi portal and MoHUA guidelines; National Portal of India |
| `SECONDARY_OFFICIAL` (1) | PM SVANidhi FAQ hosted on qcin.org, kept as historical evidence and no longer used for verification |

District pages are official (district administration, NIC-hosted) but they are a discovery and summary layer: they reproduce scheme descriptions with publish dates, sometimes years old. They are cited as such, and a scheme described only on such a page is never marked fully verified when the description is stale.

The 33-district list is taken from the official [District Web Directory](https://www.telangana.gov.in/district-web-directory/) and is not invented.

## 3. Telangana scheme inventory discovered

| # | Scheme | Record | Category | Department (as sourced) |
| --- | --- | --- | --- | --- |
| 1 | Rythu Bharosa | `research-tg-rythu-bharosa` | agriculture | Agriculture Department |
| 2 | Indiramma Indlu | `research-tg-indiramma-indlu` | housing | not stated on the page |
| 3 | Rajiv Yuva Vikasam | `research-tg-rajiv-yuva-vikasam` | employment | SC/ST/BC/Minority/EBC welfare corporations |
| 4 | Aasara Pensions | `research-tg-aasara-pensions` | social_welfare | not stated in the sources used |
| 5 | Kalyana Lakshmi | `research-tg-kalyana-lakshmi` | women_child | not stated on the page |
| 6 | Shaadi Mubarak | `research-tg-shaadi-mubarak` | women_child | not stated on the page |
| 7 | Dalit Bandhu | `research-tg-dalit-bandhu` | social_welfare | SC Development Department / SC Corporation |
| 8 | Arogya Lakshmi | `research-tg-arogya-lakshmi` | health | WDCW Department |
| 9 | KCR Kit | `research-tg-kcr-kit` | women_child | not stated on the page |
| 10 | Mahalakshmi | `research-tg-mahalakshmi` | women_child | not stated on the page |
| 11 | Gruha Jyothi | `research-tg-gruha-jyothi` | utilities | not stated on the page |
| 12 | Cheyutha (conflicting) | `research-tg-cheyutha` | health | not stated on the page |
| 13 | Rythu Bandhu (outdated) | `research-tg-rythu-bandhu` | agriculture | not stated on the page |
| 14 | Kanti Velugu | `research-tg-kanti-velugu` | health | not stated on the page |
| 15 | 2BHK Dignity Housing | `research-tg-2bhk-housing` | housing | not stated on the page |
| 16 | Rythu Bima | `research-tg-rythu-bima` | agriculture | — |
| 17 | Mission Bhagiratha | `research-tg-mission-bhagiratha` | utilities | — |
| 18 | Mission Kakatiya | `research-tg-mission-kakatiya` | agriculture | — |
| 19 | Haritha Haram | `research-tg-haritha-haram` | environment | — |
| 20 | Sheep Distribution | `research-tg-sheep-distribution` | agriculture | — |
| 21 | Land distribution to Dalits | `research-tg-dalit-land-distribution` | social_welfare | — |
| 22 | SHE Teams | `research-tg-she-teams` | women_child | — |
| 23 | Single Women Pension | `research-tg-single-women-pension` | social_welfare | — |

Records 16-23 are `CATALOGUED`: discovered on an official district listing, not researched further. They are in the register so the gap is visible rather than absent.

## 4. Schemes grouped by category

| Category | Records | Schemes |
| --- | --- | --- |
| agriculture | 5 | Rythu Bharosa, Rythu Bandhu, Mission Kakatiya, Rythu Bima, Sheep Distribution |
| women_child | 5 | Kalyana Lakshmi, Shaadi Mubarak, KCR Kit, Mahalakshmi, SHE Teams |
| social_welfare | 4 | Aasara Pensions, Dalit Bandhu, Land distribution to Dalits, Single Women Pension |
| health | 3 | Arogya Lakshmi, Cheyutha, Kanti Velugu |
| housing | 2 | Indiramma Indlu, 2BHK Dignity Housing |
| utilities | 2 | Gruha Jyothi, Mission Bhagiratha |
| employment | 1 | Rajiv Yuva Vikasam |
| environment | 1 | Haritha Haram |

Education, scholarships, hostels and skill development were **not** researched in this batch; no record exists for them yet. That is a gap, not a finding of "none".

## 5. Schemes grouped by beneficiary

Derived from the tagged records only (a scheme can have several):

| Group | Records |
| --- | --- |
| Women | 8 |
| Farmers | 4 |
| SC / ST / OBC | 4 |
| Widows | 3 |
| Children | 2 |
| Minorities | 2 |
| Persons with disabilities | 2 |
| Weavers and handloom workers | 2 |
| Unorganised workers | 2 |
| Senior citizens | 2 |
| Entrepreneurs | 2 |
| Transgender persons | 1 |

No record yet covers students, gig workers, construction workers, artisans, fisherfolk, migrants or orphans. Those areas report `NOT_RESEARCHED`.

## 6. Verified vs partially verified vs unverified

| Status | Total | Telangana only |
| --- | --- | --- |
| `VERIFIED` | 6 | 2 (Kalyana Lakshmi, Arogya Lakshmi) |
| `PARTIALLY_VERIFIED` | 14 | 12 |
| `UNVERIFIED` | 9 | 9 (Cheyutha + the 8 catalogued) |

"Verified" means the conditions recorded in the register are stated on an official source and the record carries that evidence. It does not mean the catalogue's rules are correct; no catalogue rule was touched.

## 7. Schemes with eligibility conditions verified

Fifteen records reached `ELIGIBILITY_VERIFIED` with evidence: the six central schemes and nine Telangana schemes (Rythu Bharosa, Rajiv Yuva Vikasam, Aasara Pensions, Kalyana Lakshmi, Shaadi Mubarak, Dalit Bandhu, Arogya Lakshmi, Mahalakshmi, Gruha Jyothi).

Each condition carries its `sourceId`; a condition without one would fail validation.

## 8. Schemes with application information verified

Six records name an official application route: Rythu Bharosa (rythubharosa.telangana.gov.in), Indiramma Indlu, Kalyana Lakshmi and Shaadi Mubarak (ePASS), Dalit Bandhu (portal only, no route stated) and 2BHK Housing.

The M9.1 audit withdrew two more: `aasara.telangana.gov.in` and `tgobmmsnew.cgg.gov.in` did not respond on 2026-11-27, so Aasara and Rajiv Yuva Vikasam now describe the route in words with the failure noted, instead of linking to a page that may be down.

For the rest the route is genuinely unknown, not "offline". Several district pages point at Praja Palana or a Gram Panchayat without a URL; those are recorded as `applicationNotes`, not as verified application information.

## 9. District-level coverage

- Districts in the official directory: **33**. District-specific records: **0**.
- No district-specific scheme was found with official evidence, and none was invented to improve the number.
- Every Telangana record is statewide (`districts: []`).
- The register's `districts` field exists for a future district-restricted record; the app's district table (`DISTRICTS_BY_STATE`) is still deliberately empty, so district coverage cannot be reported as `COVERED` anywhere.
- All 33 districts should be treated as `NOT_RESEARCHED` for district-specific benefits. District pages list statewide schemes, which is how the eight `CATALOGUED` records were found.

## 10. Central scheme evidence audit

| Scheme | Previous evidence | Official evidence found | Finding |
| --- | --- | --- | --- |
| e-Shram | PIB release PDF | `eshram.gov.in/faqs` | 16+, unorganised worker not in EPFO/ESIC, **no income criterion**. The catalogue is `PARTIALLY_VERIFIED`; the rule set was not compared field by field and was not changed. |
| PM-SYM | labour.gov.in enrolment page | `eshram.gov.in/Schemes` | Eligibility stated: 18-40, monthly income below ₹15,000, not EPFO/ESIC/NPS. Contribution table not verified. |
| PMSBY | PM SVANidhi FAQ (qcin.org) | `financialservices.gov.in/pmsby` | 18-70, bank/post office account holder, one account only. Catalogue `source_url` still points at the old FAQ; not changed in M9. |
| PMJJBY | PM SVANidhi FAQ (qcin.org) | `financialservices.gov.in/pmjjby` | 18-50, account holder, auto-debit consent. Same catalogue note. |
| PM SVANidhi | qcin.org FAQ | `pmsvanidhi.mohua.gov.in` + MoHUA guidelines | Urban street vendor under the 2014 Act, notified State/UT. Telangana appears in the portal's performance table; notification status still to confirm. |
| PMJDY | PM SVANidhi FAQ (qcin.org) | `pmjdy.gov.in/scheme` | Unbanked adult, BSBD account, no minimum balance, ₹2 lakh accident cover, OD up to ₹10,000. |

For all six: the research record was updated with the official evidence and the unresolved questions; `data/schemes.json` was not edited (`git diff -- data/schemes.json` is empty).

## 11. Missing source information

- Eight `CATALOGUED` records have no eligibility or verification evidence at all: Rythu Bima, Mission Bhagiratha, Mission Kakatiya, Haritha Haram, Sheep Distribution, Land distribution to Dalits, SHE Teams, Single Women Pension.
- Fifteen researched records have no confirmed application route.
- Three amounts are deliberately unrecorded or described only in words: Shaadi Mubarak (no separate figure found), Rythu Bandhu (no figure in the sources read) and Rythu Bharosa (the figure is per acre, so it is not stored as a per-beneficiary amount).

`npm run research -- list --missing-sources` reproduces the first list.

## 12. Conflicting or outdated information

| Record | Issue | Treatment |
| --- | --- | --- |
| Cheyutha | The state portal describes a 2023 health cover launched with Mahalakshmi; a 2018 district page describes financial assistance for weavers, widows, seniors and disabled people | `CONFLICTING`, `UNVERIFIED`, no benefit amount, questions opened. Not merged with anything. |
| Rythu Bandhu | District pages state Rythu Bharosa replaced it | `OUTDATED`, `schemeStatus: CLOSED`, relationship `REPLACED_BY` |
| Mahalakshmi | State portal gives ₹2,500 to women heads of family with no income test; district page adds BPL/Antyodaya and a ₹2 lakh income limit | Both conditions recorded with their sources; question opened |
| Kalyana Lakshmi | Sources disagree on the amount for disabled girls | Only the confirmed ₹1,00,116 is recorded |
| Aasara | Pension amount comes from a 2019 G.O. (current rate unknown), and the 2021 state outlook puts the old-age limit at 57 while the CAG table says 65 | Age corrected to 57 with both figures and the conflict documented; amount recorded with its date; verification downgraded to partial |
| KCR Kit, Kanti Velugu, 2BHK Housing | District pages from 2018-2019 | `PARTIALLY_VERIFIED`, low confidence, current status questioned |

## 13. Research coverage gaps

1. **Education** — ePASS scholarships, fee reimbursement, Gurukul and residential schools, hostels, skill training: no record yet.
2. **Health insurance** — Rajiv Aarogyasri as a separate entitlement (the Cheyutha conflict blocks the current record).
3. **Social welfare corporations** — SC/ST/BC/Minority corporation schemes beyond Rajiv Yuva Vikasam and Dalit Bandhu.
4. **Workers** — gig, platform, construction, migrant and domestic workers; the state's labour welfare boards.
5. **District-specific schemes** — 33 districts, none studied; no district list is bundled.
6. **Amounts and current GOs** — several amounts are 2018-2019 figures.

## 14. Schemes that still need manual verification

Cheyutha (resolve the conflict), Rythu Bandhu (closure order), Mahalakshmi (income test), Aasara (current amount and categories), Dalit Bandhu (selection and income rules), KCR Kit and Kanti Velugu (still running?), 2BHK Housing (still allocating?), Shaadi Mubarak (own amount), and all eight `CATALOGUED` records.

## 15. Recommended next research batch

1. **Education**: Telangana ePASS scholarships (SC/ST/BC/EBC/minority), Gurukul admissions, residential schools, fee reimbursement — the largest untouched category and the one students ask about.
2. **Health**: resolve Cheyutha and add Rajiv Aarogyasri on its own evidence.
3. **Labour**: Telangana Building and Other Construction Workers Welfare Board benefits, unorganised worker welfare.
4. Then **district research**: pick three districts, use the official 33-district directory, and only then decide whether any district-specific scheme exists.
5. Only after that, consider importing the fully verified records into `data/schemes.json` — a separate milestone with its own validation.

## Research progress ledger

`Source` = at least one official source registered; `Elig.` = eligibility conditions recorded with source attribution; `App.` = application route or procedure recorded; `Complete` = COMPLETE (verified conditions and route/question resolved), PARTIAL (some evidence, open questions), DISCOVERED (listing only).

| Record | Scheme | Category | Level | Source | Elig. | App. | Status | Verification | Complete |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| research-eshram | e-Shram | labour | Central | yes | yes | no | IMPORTED | PARTIAL | PARTIAL |
| research-pmsym | PM-SYM | pension | Central | yes | yes | no | IMPORTED | VERIFIED | PARTIAL |
| research-pmsby | PMSBY | insurance | Central | yes | yes | no | IMPORTED | VERIFIED | PARTIAL |
| research-pmjjby | PMJJBY | insurance | Central | yes | yes | no | IMPORTED | VERIFIED | PARTIAL |
| research-svanidhi | PM SVANidhi | entrepreneurship | Central | yes | yes | no | IMPORTED | PARTIAL | PARTIAL |
| research-pmjdy | PMJDY | financial inclusion | Central | yes | yes | no | IMPORTED | VERIFIED | PARTIAL |
| research-tg-rythu-bharosa | Rythu Bharosa | agriculture | Telangana | yes | yes | yes | ELIGIBILITY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-indiramma-indlu | Indiramma Indlu | housing | Telangana | yes | yes | yes | OFFICIALLY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-rajiv-yuva-vikasam | Rajiv Yuva Vikasam | employment | Telangana | yes | yes | no | ELIGIBILITY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-aasara-pensions | Aasara Pensions | social welfare | Telangana | yes | yes | no | ELIGIBILITY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-kalyana-lakshmi | Kalyana Lakshmi | women & child | Telangana | yes | yes | yes | ELIGIBILITY_VERIFIED | VERIFIED | PARTIAL |
| research-tg-shaadi-mubarak | Shaadi Mubarak | women & child | Telangana | yes | yes | yes | ELIGIBILITY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-dalit-bandhu | Dalit Bandhu | social welfare | Telangana | yes | yes | no | ELIGIBILITY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-arogya-lakshmi | Arogya Lakshmi | health | Telangana | yes | yes | no | ELIGIBILITY_VERIFIED | VERIFIED | PARTIAL |
| research-tg-kcr-kit | KCR Kit | women & child | Telangana | yes | yes | no | OFFICIALLY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-mahalakshmi | Mahalakshmi | women & child | Telangana | yes | yes | no | ELIGIBILITY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-gruha-jyothi | Gruha Jyothi | utilities | Telangana | yes | yes | no | ELIGIBILITY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-cheyutha | Cheyutha | health | Telangana | yes | no | no | CONFLICTING | UNVERIFIED | PARTIAL |
| research-tg-rythu-bandhu | Rythu Bandhu | agriculture | Telangana | yes | no | no | OUTDATED | PARTIAL | PARTIAL |
| research-tg-kanti-velugu | Kanti Velugu | health | Telangana | yes | yes | no | OFFICIALLY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-2bhk-housing | 2BHK Dignity Housing | housing | Telangana | yes | yes | yes | OFFICIALLY_VERIFIED | PARTIAL | PARTIAL |
| research-tg-rythu-bima | Rythu Bima | agriculture | Telangana | yes | no | no | CATALOGUED | UNVERIFIED | DISCOVERED |
| research-tg-mission-bhagiratha | Mission Bhagiratha | utilities | Telangana | yes | no | no | CATALOGUED | UNVERIFIED | DISCOVERED |
| research-tg-mission-kakatiya | Mission Kakatiya | agriculture | Telangana | yes | no | no | CATALOGUED | UNVERIFIED | DISCOVERED |
| research-tg-haritha-haram | Haritha Haram | environment | Telangana | yes | no | no | CATALOGUED | UNVERIFIED | DISCOVERED |
| research-tg-sheep-distribution | Sheep Distribution | agriculture | Telangana | yes | no | no | CATALOGUED | UNVERIFIED | DISCOVERED |
| research-tg-dalit-land-distribution | Land distribution to Dalits | social welfare | Telangana | yes | no | no | CATALOGUED | UNVERIFIED | DISCOVERED |
| research-tg-she-teams | SHE Teams | women & child | Telangana | yes | no | no | CATALOGUED | UNVERIFIED | DISCOVERED |
| research-tg-single-women-pension | Single Women Pension | social welfare | Telangana | yes | no | no | CATALOGUED | UNVERIFIED | DISCOVERED |
