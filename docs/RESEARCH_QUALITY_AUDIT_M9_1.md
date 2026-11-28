# Research quality audit — Telangana register (M9.1)

Date: 27 November 2026. Scope: all 29 research records, 29 sources, the validation and coverage code, and the M9 documentation. No scheme was added, no district research started, `data/schemes.json` was not touched.

## Executive summary

The register was structurally sound and its source trail was real: every cited URL was fetched during M9, every condition named a source, and no aggregator was used as eligibility evidence. The **classifications were not all justified**, though, and two of them would have misled a citizen.

Three defects mattered most:

1. **Aasara's old-age age limit was wrong.** The record said 65, from the CAG table covering 2018-21. The Government of Telangana's own Socio Economic Outlook 2021 states the pensionable age was reduced from 65 to **57**. A 60-year-old widow would have been told she was too young for a pension she may be entitled to. Corrected.
2. **Two application links did not resolve.** `aasara.telangana.gov.in` and `tgobmmsnew.cgg.gov.in` both failed to connect when checked on 2026-11-27, yet were presented as application routes. They are now notes, not links.
3. **Coverage counted listings as research.** A scheme seen once on a district listing page and never studied counted towards a group's coverage. The report now separates *researched* from *discovered only*, and a group is never `COVERED` while a listing sits unexamined.

Two verification statuses did not survive the audit (Aasara and Rythu Bharosa moved from `VERIFIED` to `PARTIALLY_VERIFIED`), one dead source was removed, one authoritative source was added, and one unreachable Government Order was marked `GONE` rather than quietly kept as evidence.

After remediation the trustworthy headline is: **21 records researched, 8 listings only, 6 fully verified, 14 partially verified, 9 unverified, 1 conflicting, 1 outdated, 0 import-ready.** Eligibility conditions are recorded with evidence for 15 records, but that is a statement about recorded conditions, not about the catalogue's rules, and it is not a statement that any scheme is ready to be shown as a guaranteed entitlement.

The register is a credible research baseline for one state. It is not comprehensive, not fully current, and not yet safe to import wholesale.

## Record-by-record audit

Evidence quality: **Strong** (guideline, order, or departmental page that states the conditions), **Adequate** (official summary page that states them), **Weak** (old or indirect page), **Insufficient** (listing only). Freshness: year of the substantive source.

| Scheme | Current status | Evidence quality | Eligibility quality | Freshness | Problems | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| e-Shram | IMPORTED | Adequate | Partial | 2026 | Official FAQ not reconciled with the catalogue rule set | Compare rules before any catalogue edit |
| PM-SYM | IMPORTED | Strong | Partial | 2026 | Contribution slabs unverified; benefit wording was hedged (fixed) | Locate PM-SYM contribution table |
| PMSBY | IMPORTED | Strong | Partial | 2026 | Cover amount not recorded; catalogue still cites the old FAQ | Re-verify cover and premium |
| PMJJBY | IMPORTED | Strong | Partial | 2026 | Premium not recorded; catalogue still cites the old FAQ | Re-verify premium |
| PMJDY | IMPORTED | Strong | Partial | 2026 | Overdraft eligibility conditions not detailed | Add OD conditions from the FAQ |
| PM SVANidhi | IMPORTED | Adequate | Partial | 2026 | Telangana notification status unconfirmed; one condition overstated (fixed) | Confirm state notification |
| Rythu Bharosa | ELIGIBILITY_VERIFIED | Adequate | Partial | 2025 | District page contradicts itself on landless labourers; per-acre amount was stored as a per-beneficiary amount (fixed); verification downgraded | Obtain the Agriculture Department guideline |
| Indiramma Indlu | OFFICIALLY_VERIFIED | Adequate | Partial | 2025 | No income limit or selection order; relationship to 2BHK unresolved | Obtain the housing order |
| Rajiv Yuva Vikasam | ELIGIBILITY_VERIFIED | Strong | Partial | 2025 | Application window closed; loan vs subsidy ambiguity; portal unreachable (fixed) | Confirm whether a new window opened |
| Aasara Pensions | ELIGIBILITY_VERIFIED | Adequate | Partial | 2019-2023 | **Age limit was wrong (65, should be 57)**; 2019 amount; GO URL unreachable (all fixed) | Current GO and current rate |
| Kalyana Lakshmi | ELIGIBILITY_VERIFIED | Adequate | Partial | 2025 | Amount only on a district page; disabled-girl amount unconfirmed | Obtain the BC Welfare order |
| Shaadi Mubarak | ELIGIBILITY_VERIFIED | Adequate | Partial | 2025 | Own amount not stated in any source read | Obtain the minority welfare order |
| Dalit Bandhu | ELIGIBILITY_VERIFIED | Adequate | Partial | 2026 | Income ceiling and selection method absent | Obtain SC Corporation guidelines |
| Arogya Lakshmi | ELIGIBILITY_VERIFIED | Strong | Partial | 2026 | Enrolment route not stated | Confirm Anganwadi enrolment |
| KCR Kit | OFFICIALLY_VERIFIED | Weak | Partial | 2018 | Six-year-old kit value and contents | Verify current kit |
| Mahalakshmi | ELIGIBILITY_VERIFIED | Adequate | Partial | 2024-2026 | State portal and district page disagree on the income test | Obtain the scheme order |
| Gruha Jyothi | ELIGIBILITY_VERIFIED | Adequate | Partial | 2024-2026 | Enrolment route unclear; tenancy treatment unknown | Obtain DISCOM instructions |
| Cheyutha | CONFLICTING | Insufficient | Conflicting | 2018 vs 2023 | Two official pages describe different schemes under one name | Resolve with a GO; do not merge |
| Rythu Bandhu | OUTDATED | Weak | None | 2019 | Evidence shows existence and replacement only (fixed) | Closure order |
| Kanti Velugu | OFFICIALLY_VERIFIED | Weak | Partial | 2019 | Campaign status unknown | Confirm current round |
| 2BHK Dignity Housing | OFFICIALLY_VERIFIED | Weak | Partial | 2018 | Allocation status unknown; overlaps Indiramma Indlu | Confirm whether still allocating |
| Rythu Bima | CATALOGUED | Insufficient | None | — | Listing only | Research next |
| Mission Bhagiratha | CATALOGUED | Insufficient | None | — | Likely a service, not an entitlement | Decide scope |
| Mission Kakatiya | CATALOGUED | Insufficient | None | — | Infrastructure programme, no applicant | Decide scope |
| Haritha Haram | CATALOGUED | Insufficient | None | — | No individual entitlement identified | Decide scope |
| Sheep Distribution | CATALOGUED | Insufficient | None | — | No guideline read | Research next |
| Land distribution to Dalits | CATALOGUED | Insufficient | None | — | No order read | Research next |
| SHE Teams | CATALOGUED | Insufficient | None | — | Police service, not a benefit | Decide scope |
| Single Women Pension | CATALOGUED | Insufficient | None | — | Overlaps the Aasara record | Fold into Aasara or research separately |

## Source audit

**Strongest (used correctly):** `financialservices.gov.in/pmsby` and `/pmjjby` (eligibility FAQs), `pmjdy.gov.in/scheme` (benefits), `eshram.gov.in/faqs` and `/Schemes` (eligibility and PM-SYM benefits), `mohua.gov.in` PM SVANidhi guidelines, the Rajiv Yuva Vikasam guideline PDF, `wdcw.tg.nic.in/Arogya_Lakshmi.html`, the CAG Aasara performance audit, `Telangana-Socio-Economic-Outlook-2021.pdf`, `telangana.gov.in/Government-Initiatives`, and `telanganaepass.cgg.gov.in`.

**Weak but usable:** the eight district scheme pages. They are official and NIC-hosted, but they are summaries with 2018-2019 publish dates and at least one internal contradiction (Rythu Bharosa on land ownership). They can support "this scheme exists and here is a summary", not "these are the current rules".

**Broken:** `india.gov.in/spotlight/pm-street-vendors-atmanirbhar-nidhi-pm-svanidhi` returns HTTP 404 — removed. `scpwd.telangana.gov.in/...Aasara Pensions).pdf` (the 2019 G.O.) does not connect from this environment — marked `GONE` and no longer cited; its text was only ever read through a search index, which is not evidence.

**Superseded:** the `pmsvanidhi.qcin.org` FAQ remains registered as historical evidence but is no longer cited for verification. It is correctly tiered `SECONDARY_OFFICIAL`.

**Not supporting the claim they were attached to (fixed):** the Medak district page was listed as *eligibility* evidence for Rythu Bandhu although it states neither conditions nor amount; the Aasara G.O. was cited as `PRIMARY_LEGAL` while unreachable; a certificate-of-vending condition was attributed to the PM SVANidhi guidelines more specifically than the text supports.

**Duplicates:** none. The register is now checked for duplicate URLs, and a source id colliding with a non-existent scheme (`aasara-pensions`) was caught and corrected to the research record id.

**Currentness:** every source carries `change.status: UNCHECKED`. No source has been re-fetched to detect change, so freshness in this register means "the page said this when read on 2026-11-27", not "this is current policy".

## Critical findings

### CRITICAL

1. **Aasara age limit wrong (65 vs 57).** Contradicted the state's own 2021 outlook. Fixed in the record, with both figures documented and the conflict kept as an open question.
2. **Unreachable application links presented as routes.** `aasara.telangana.gov.in` and `tgobmmsnew.cgg.gov.in` fail to connect. Removed from `applicationUrl`; the failure is recorded in the notes.
3. **Legal evidence that could not be opened.** The 2019 G.O. host refuses connections; the register had it as the primary legal source. Marked `GONE`, replaced by two reachable sources that state the amount and the age.

### HIGH

4. **Coverage counted discovery as research.** Farmers read "PARTIAL (4 records)" while two of those were never looked at. Coverage now reports *researched* and *discovered* separately and never marks an area `COVERED` with an unexamined listing.
5. **`ELIGIBILITY_VERIFIED` was not enforced by the validator.** A record could claim the status with no conditions at all. Validation now requires conditions, a source id on each condition, and eligibility evidence.
6. **Rythu Bharosa was `VERIFIED` on a self-contradicting district summary,** with a per-acre figure stored as a per-beneficiary amount. Downgraded to partial; amount moved into prose.
7. **A dead source (HTTP 404) stayed in the register.** Removed.

### MEDIUM

8. **PM-SYM benefit wording was hedged** and implied the figure came from a general pension list; the e-Shram page states PM-SYM benefits explicitly. Rewritten.
9. **PM SVANidhi condition overstated** identification mechanics. Softened to the Act's definition.
10. **Rythu Bandhu evidence mislabelled** as eligibility evidence. Moved.
11. **Six-to-eight-year-old district pages** are the only evidence for three schemes. Kept, but flagged low confidence and `PARTIALLY_VERIFIED`.
12. **Duplicate URLs and dangling `schemeIds` were undetectable.** Both are now validation errors.
13. **An outdated "fully verified" claim could survive** on a closed scheme. Now a warning.

### LOW

14. `discoveryUrl` for Aasara is a state web directory, not a scheme page.
15. Exclusions have no per-item source attribution in the schema; they inherit the record's evidence.
16. No structured audit log: corrections live in `notes`, not a change journal.
17. No change detection has ever run (`change.status: UNCHECKED` everywhere).

## Coverage integrity

| Measure | M9 reported | After audit |
| --- | --- | --- |
| Records | 29 | 29 |
| Researched | not reported | 21 |
| Listing only | not reported | 8 |
| Fully verified | 8 | 6 |
| Partially verified | 12 | 14 |
| Unverified | 9 | 9 |
| Eligibility conditions evidenced | 15 | 15 |
| Application information | 8 | 6 |
| Import-ready | 0 | 0 |
| District-specific | 0 | 0 |
| Districts studied | 0 of 33 | 0 of 33 |

The M9 figures were arithmetically correct but two of the eight "fully verified" records did not meet the standard, and coverage percentages implied research that had not happened. The corrected report states researched and discovered counts separately, prints "discovery is not coverage", and keeps `NEEDS_MORE_RESEARCH` for areas with listings only.

Zero district records is a **scope** statement, not a finding of absence. No district-specific scheme has been looked for, and the report says so.

## Recommended remediation plan

1. **Current Government Orders** for Aasara (age and amount), Mahalakshmi (income test), Cheyutha (which scheme is which), Kalyani/Shaadi amounts, Dalit Bandhu selection. Nothing here can be called verified until then.
2. **Re-check every application URL** before any record becomes import-ready; three failed at audit.
3. **Confirm the three stale schemes** (KCR Kit, Kanti Velugu, 2BHK) are still operating.
4. **Decide scope** for the four non-entitlement programmes (Bhagiratha, Kakatiya, Haritha Haram, SHE Teams) so they stop inflating category counts.
5. **Run change detection** on the 29 sources (content hashes) and set `change.status` honestly.
6. **Reconcile the six central catalogue rules** with the official evidence now registered — as a separate, tested change to `data/schemes.json`, not this milestone.
7. **Three-district pilot** using the official 33-district directory before claiming any district coverage.
8. Then, and only then, consider importing records that still pass validation with no open questions.

## What this audit did not do

No new schemes, no district research, no other states, no eligibility-engine or UI changes, no catalogue edits, no import. Source *content* was verified for the pages read in M9 plus the audit checks; it was not re-read page by page for all 29 sources, and no source was re-fetched to detect change. Amounts that no source printed remain blank.
