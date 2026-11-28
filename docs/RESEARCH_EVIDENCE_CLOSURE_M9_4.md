# Targeted evidence closure (M9.4)

Date: 28 November 2026. Verification and targeted discovery only: no import, no engine, matcher or UI change, `data/schemes.json` untouched.

Register after this milestone: **98 records, 101 sources** — 51 researched, 14 fully verified, 35 partially verified, 47 listing-only, 2 conflicting, 0 import-ready.

## 1. M9.3 corrections first

Five claims in the previous batch overstated their evidence. All five were fixed before new work:

| # | Problem | Fix |
| --- | --- | --- |
| 1 | PMMSY recorded age 18-60, one-project and lease rules citing the Warangal district page, which does not state them (they came from a fisheries FAQ that was never fetched) | Conditions removed; record downgraded to `OFFICIALLY_VERIFIED`/`PARTIALLY_VERIFIED`; the three rules moved to open questions |
| 2 | Aarogyasri stored ₹10,00,000 as `amountInr` while its own FAQ says ₹2 lakh | Amount removed; all three official figures recorded in prose with their sources |
| 3 | Post-matric minority and PwD income tests cited the ePASS landing page | Minority now cites the Khammam minorities page, PwD the Warangal WCD page — both state the figures |
| 4 | Nethanna Bima was `ELIGIBILITY_VERIFIED` on a launch date | Launch date removed from eligibility; status `OFFICIALLY_VERIFIED` |
| 5 | PM Surya Ghar's summary asserted rupee figures its own note admitted were unread | Summary now says the figures are guideline values not re-read at source |

Also corrected: the RTF record's "colleges may not collect the fee" rule was attributed to the RTI manual; it belongs to the 2026 DBT orders, so it is now an open question.

## 2. Disability welfare

`wdsc.telangana.gov.in` still does not respond from this network, and by the M9.1 rule an unreachable host may not be cited. The department's rules are nevertheless documented in two reachable official sources: the **Telangana State Legal Services Authority** compilation of state disability schemes, and district welfare pages.

**8 new records:**

| Record | Status | What is verified | Source |
| --- | --- | --- | --- |
| Disability pension | `ELIGIBILITY_VERIFIED` / partial | ₹4,016/month, any age, 40% disability (51% hearing), DRDA route | TSLSA + CAG audit |
| PwD pre-matric scholarship | `ELIGIBILITY_VERIFIED` / verified | ₹700 (I-V), ₹1,000 (VI-VIII), ₹1,820 (IX-X), income < ₹1 lakh, allowances | TSLSA + Warangal |
| PwD post-matric scholarship | `ELIGIBILITY_VERIFIED` / partial | RTF to institution + ₹5,000/₹6,500 maintenance; district page states ₹1,820/2,400/4,290 | TSLSA + Warangal |
| PwD aids and appliances | `ELIGIBILITY_VERIFIED` / partial | 11 item types with age and disability floors; OBMMS application | TSLSA + OBMMS |
| PwD economic rehabilitation | `ELIGIBILITY_VERIFIED` / partial | ₹50,000 at 100%; 80% on ₹1-3 lakh bank-linked units | Wanaparthy |
| PwD bus pass | `ELIGIBILITY_VERIFIED` / verified | Free city ordinary, 50% up to deluxe; 100%/40%/IQ<69 criteria | TSLSA |
| PwD marriage incentive | `OFFICIALLY_VERIFIED` / partial | ₹1 lakh one partner, ₹2 lakh both | Wanaparthy |
| PwD residential schools and homes | `OFFICIALLY_VERIFIED` / partial | 5 schools (830 places), 20 homes (2,258), diet ₹1,200-2,000 | TSLSA |

**Gaps:** the pension's current rate (₹3,016 in the 2019 order, ₹4,016 in the 2025 compilation), the income test for several schemes, the admission route for the residential schools, and any UDID-linked central benefit. The state department site remains the single document that would close all of these.

## 3. Transgender welfare

Two records, both deliberately thin because only two reachable official sources describe the programmes:

- **Telangana Transgender Welfare Board** (`OFFICIALLY_VERIFIED` / partial) — board constituted, ₹200 lakh sanctioned for skill training, economic rehabilitation, a home and a help desk, 245 identity cards issued (Socio Economic Outlook 2023).
- **Transgender economic rehabilitation** (`SOURCE_IDENTIFIED` / partial) — a district page states one unit of ₹75,000 at 100% subsidy for 2025-26. No state order was found.

**Gaps:** skill training, shelter home, health clinics, identity-card route and the department's own economic rehabilitation slabs all live on pages that did not respond. Unlike disability, there is no legal-services compilation to substitute. This is the weakest area in the register and is flagged as such rather than padded.

## 4. CMRF — the "conflicting ceilings" were two different schemes

- CMRF's official pages state only: BPL households, medical expenses **already incurred**, and Letters of Credit for NIMS, MNJ and ENT. No ceiling, no income figure, no document list.
- **₹2 lakh** is Aarogyasri's earlier cover (₹1.5 lakh plus a ₹50,000 buffer), still printed in the Trust's FAQ and on district pages; in press reporting it also appears as an income test.
- **₹10 lakh** is Aarogyasri's current cover.
- **Conclusion:** CMRF has no published ceiling; no amount is recorded, and the two figures are documented as belonging to Aarogyasri. `OFFICIALLY_VERIFIED`/`PARTIALLY_VERIFIED` unchanged.

## 5. ePASS RTF and MTF

- **RTF** = tuition and special fee reimbursed against the government-notified fee for the course, paid to the institution. Group-wise range ₹850 (Intermediate) to ₹6.9 lakh (Medical) a year — reported in college reproductions, not in a government document that loaded.
- **MTF** = monthly maintenance by course group and hostel status: professional ₹1,500/₹650, degree ₹1,000/₹500, Intermediate ₹750/₹500, 10 months, **+10% for disabled students** — press reporting of the 2026 orders, not yet read at source.
- G.O.Ms.No.9 (06.06.2026) extends DBT to ST/BC/EBC/Minority/Disabled from A.Y. 2026-27; the PDF is linked but returned no extractable text.
- **No rupee rate was added to a record.** The structure and the 10% disability loading are recorded as open questions pending the order.

## 6. PMFBY — Telangana participation timeline

| Date | Source | Finding |
| --- | --- | --- |
| 29 Mar 2025 | Lok Sabha USQ 5026 | Telangana listed with **40.11 lakh** applications and ₹1,937.83 crore claims |
| 11 Mar 2025 | PIB | 23 States/UTs implementing |
| 28 Jul 2026 | Lok Sabha USQ 1451 | Coverage report for 2023-24 to 2025-26 |
| 3 Aug 2026 | Lok Sabha USQ 2644 | 2021-22 to 2025-26 enrolment table **does not list Telangana** |

**Conclusion:** Telangana was enrolled through at least 2024-25 and is absent from the current-year official table. That is not a published opt-out, and no Telangana notification for 2025-26 or 2026 exists that could settle it. The record stays `CONFLICTING`, with the two replies as evidence and the exact missing document named: a Telangana Agriculture Department season notification or the state's NCIP enrolment page.

## 7. Source freshness

Added `staleSources()` in `src/core/research.ts` and `npm run research -- sources`:

```
sources: 101 total, 1 need a check (older than 90 days or never checked)
by change state: UNCHECKED 100, GONE 1
  GONE       1d ago   http://scpwd.telangana.gov.in/...Aasara%20Pensions%29.pdf
```

- Derived only from dates already in the register — **no network**, so it is deterministic and CI-safe.
- Lists `GONE` sources first, then sources older than the threshold, then never-checked sources.
- A queue entry never changes a verification status; it creates a re-review task.
- Two tests cover the ordering, the age calculation and the "recently checked stays out" case.
- **Not implemented:** fetching, ETag/Last-Modified and content hashing. Those need a deliberate network run with entity handling, and are better as their own change than bolted onto this milestone.

## 8. Validation

| Command | Result |
| --- | --- |
| `npm run research -- validate` | ok: 98 records, 101 sources, 0 warnings |
| `npm run research -- coverage` | 98 records (51 researched, 47 discoveries), verified 14, partial 35, import-ready 0 |
| `npm run research -- gaps` | 52 gaps |
| `npm run research -- list --conflicts` | 2 (Cheyutha, PMFBY) |
| `npm run research -- list --ready` | 0 |
| `npm run research -- sources` | 1 item in the queue (the GONE Aasara order) |
| `npx tsc -b` | exit 0 |
| `npx vitest run` | 23 files, 556 tests passed |
| `npx oxlint src scripts` | 0 errors, 2 pre-existing warnings |
| `npm run build` | passed |

## 9. Integrity

`data/schemes.json` unchanged; eligibility engine, matcher and UI untouched; no import; no invented condition, amount or link; every new figure is tied to a fetched source or explicitly labelled district-published; both conflicts preserved; 0 import-ready records.

## 10. Recommendation

**M9.5 — finish the vulnerable-group evidence.** Two things block real progress now: the state disability/transgender department site (principle: one reachable department mirror or an RTI copy of its scheme schedule would close nine records at once) and the two 2026 scholarship orders (RTF/MTF rates and the 10% disability loading). If neither document can be obtained, the honest next step is to stop adding records and instead build the Citizen Questions page against the 14 verified records. Not started.
