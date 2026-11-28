# High-impact scheme verification (M9.3)

Date: 28 November 2026. Verification only: no import, no engine, matcher or UI change, no new discovery batch, `data/schemes.json` untouched.

## 1. Batch selection

Twenty records were chosen from the 88 in the register using four rules, in this order:

1. **Citizen impact first** — a scheme that can pay a hospital bill, replace a lost wage, or fund a year of study outranks one that offers training.
2. **An official document existed or plausibly existed** — a record whose only source is a district listing was not selected, because reading a better page is the point of the milestone.
3. **Spread across beneficiary types** — no more than six records from one domain, so the batch is not a farmer-only or student-only pass.
4. **Fix structural problems found in the register** — PMFBY's contradictory implementation status and the pre/post-matric umbrella records were selected because they are exactly the cases where a status change without evidence would be harmful.

| Priority | Count | Records |
| --- | --- | --- |
| Tier 1 — health, emergency, insurance, worker protection | 6 | Aarogyasri, CMRF, BOCWWB, Labour Welfare Fund, Nethanna Bima, PMFBY |
| Tier 2 — income, education, housing-adjacent, women | 11 | PM-KISAN, PM-KUSUM, PM Surya Ghar, AIF, PMMSY, pre-matric, post-matric, RTF, overseas SC, KGBV, Mid Day Meal |
| Tier 3 — entrepreneurship, skilling, incentives | 3 | PMFME, BC margin money, Chenetha Mitra |

Duplicates and umbrella handling: the four overseas scholarships stayed as separate records (separate departments and portals); pre- and post-matric stayed as umbrella records with per-department conditions rather than being split into four communities each; BOCWWB and the Labour Welfare Fund stayed as one record per registration, not per benefit.

## 2. Results

| Measure | Before | After |
| --- | --- | --- |
| ELIGIBILITY_VERIFIED | 15 | 23 |
| OFFICIALLY_VERIFIED | 4 | 7 |
| CONFLICTING | 1 | 2 |
| OUTDATED | 1 | 2 |
| SOURCE_IDENTIFIED | 0 | 1 |
| CATALOGUED | 59 | 47 |
| verification: VERIFIED | 6 | 12 |
| verification: PARTIALLY_VERIFIED | 14 | 27 |
| verification: UNVERIFIED | 68 | 49 |
| researched (records with evidence) | 21 | 41 |
| import-ready | 0 | 0 |

Six records reached fully `VERIFIED`: BOCWWB, PM-KISAN, AIF, PMFME, the SC overseas scholarship and the BC corporation subsidy. Fourteen stopped at `PARTIALLY_VERIFIED` with the missing piece named. One did not move at all (PMFBY) because the evidence contradicts itself.

## 3. Scheme-by-scheme

### 3.1 Rajiv Aarogyasri — `research-aarogyasri`
- **Priority:** Tier 1. **Status:** `CATALOGUED`/`UNVERIFIED` → `ELIGIBILITY_VERIFIED`/`PARTIALLY_VERIFIED`. Scheme active.
- **Eligibility verified:** members of BPL families enumerated in the Civil Supplies food-security card database; no separate enrolment; a Telangana native without a white card may get a CMCO referral card. There is no published income ceiling — the card *is* the test.
- **Benefit verified:** cashless treatment for listed procedures, up to Rs 10 lakh a year per family (1,672 treatments), per the scheme page.
- **Conflict preserved:** the Trust's own FAQ still states Rs 1.5 lakh plus a Rs 50,000 buffer. Both sources are registered; the record uses Rs 10 lakh and flags the FAQ.
- **Application:** none — walk in to a network hospital with the card; helpline 104. No enrolment URL exists.
- **Open:** current CMCO referral practice; the full procedure list.

### 3.2 Chief Minister's Relief Fund — `research-cm-relief-fund`
- **Priority:** Tier 1. **Status:** `CATALOGUED` → `OFFICIALLY_VERIFIED`/`PARTIALLY_VERIFIED`. Active.
- **Eligibility verified:** BPL households; medical expenses already incurred; treatment covered by Aarogyasri cannot also be funded from CMRF.
- **Benefit:** no ceiling is published anywhere official. The widely repeated "up to Rs 5 lakh" is not recorded because it exists only on non-official sites.
- **Application:** `cmrf.telangana.gov.in`, online only, uploaded through an MLA/MLC recommendation (CMO note, 3 July 2024).
- **Open:** maximum assistance, document list, income ceiling.

### 3.3 BOCWWB benefits — `research-bocwwb-benefits`
- **Priority:** Tier 1. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`VERIFIED`. Active.
- **Eligibility verified:** age 18 to under 60; 90 days of construction work in the preceding 12 months; registration fee Rs 50 plus Rs 12 a year (Rs 60 for five years).
- **Benefits verified with G.O. numbers:** marriage gift Rs 30,000, maternity Rs 30,000, fatal accident Rs 6 lakh, disability up to Rs 5 lakh, natural death Rs 1 lakh, hospitalisation Rs 300/day (max Rs 4,500/month), funeral Rs 30,000, unregistered-worker relief Rs 50,000/20,000/10,000.
- **Application:** registration through the Assistant Labour Officer or MeeSeva; the Board's claim page says "available soon", so the claim route is recorded from the CAG audit.
- **Open:** the age-band conflict with a Khammam district page (18–59), and the unpublished claim procedure.

### 3.4 Labour Welfare Fund — `research-labour-welfare-board`
- **Priority:** Tier 1. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`PARTIALLY_VERIFIED`. Active.
- **Eligibility verified from the 1987 Act:** covered establishments (factories, motor transport, shops/establishments with 20+ persons); 30 days of employment in 12 months; Rs 2 employee and Rs 5 employer contribution a year.
- **Benefit:** statute lists heads of expenditure, not entitlements. District pages publish amounts (marriage Rs 10,000, accidental death Rs 30,000, medical aid Rs 20,000…) — recorded as district-published, not Board-published.
- **Application:** forms at `labour.telangana.gov.in/welfareFundAppls.do`; claims settled by the Assistant/Deputy Commissioner of Labour.
- **Open:** the Board's own amount schedule (its pamphlet returns HTTP 403); the unrevised Rs 1,600 supervisory ceiling.

### 3.5 Nethanna Bima — `research-nethanna-bima`
- **Priority:** Tier 1. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`PARTIALLY_VERIFIED`. Active since 07.08.2022.
- **Eligibility verified:** handloom, powerloom and ancillary workers under the weaver welfare programme, on the Rythu Bima model.
- **Benefit:** the state outlook describes the scheme without a figure; district pages state Rs 5 lakh. Recorded with that caveat, not as a settled amount.
- **Open:** cover amount, age band, enrolment window.

### 3.6 PMFBY — `research-pmfby`
- **Priority:** Tier 1. **Status:** `CATALOGUED` → `CONFLICTING`/`UNVERIFIED` (no upgrade).
- **Why:** official answers disagree. A December 2024 Rajya Sabha reply says Telangana re-joined PMFBY; a March 2026 Lok Sabha reply lists Telangana among states not implementing it. No Telangana notification for a current season was found, and the 2023 operational guidelines PDF returns HTTP 404, so no premium rate or cut-off date is recorded.
- **What this record now says:** notified-crop/notified-area condition only, plus the conflict and the open questions. This is the milestone working as intended — an unresolved official contradiction is preserved, not smoothed over.

### 3.7 PM-KISAN — `research-pmkisan`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`VERIFIED`. Active.
- **Eligibility verified:** landholding family (husband, wife, minor children) with cultivable land per state records; Aadhaar mandatory; payment only to a bank account; eKYC mandatory. Full official exclusion list recorded (institutional landholders, constitutional post holders, ministers/MPs/MLAs, government employees except Group D, pensioners above Rs 10,000/month, income-tax payers, registered professionals, NRIs).
- **Benefit verified:** Rs 6,000 a year in three instalments of Rs 2,000 by DBT.
- **Application:** new farmer registration on `pmkisan.gov.in`; eKYC at CSCs or the app.
- **Open:** the superseded 2019 FAQ still mentions a 2-hectare cap that the current portal and revised guidelines omit; no withdrawal order was found, so the cap is not recorded.

### 3.8 PM-KUSUM — `research-pmkusum`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`PARTIALLY_VERIFIED`. Active.
- **Eligibility verified (Component A, Telangana):** 500 kW to 2 MW plant on barren, uncultivable or agricultural land within 5 km of a 33/11 kV substation; individual farmers, groups, cooperatives, panchayats, FPOs, water users associations, SHGs and federations, on own or leased land.
- **Benefit verified:** TGERC pre-levellised tariff of Rs 3.13/kWh fixed for 25 years; application fee Rs 5,000 per MW plus GST.
- **Open:** no Telangana order confirming the state 30% share for Components B and C; scheme end date and whether new applications are open.

### 3.9 PM Surya Ghar — `research-pm-surya-ghar`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `OFFICIALLY_VERIFIED`/`PARTIALLY_VERIFIED`. Active.
- **Eligibility verified:** residential consumer with a valid consumer number; application only through the national portal with a registered vendor; domestic-content modules required.
- **Benefit:** Rs 30,000/kW for the first 2 kW, Rs 18,000/kW for the third, capped at Rs 78,000 — marked as guideline values because the MNRE guidelines PDF did not load during verification. The portal page is script-rendered and shows no table.
- **Application:** `pmsuryaghar.gov.in`, then DISCOM inspection and net meter.

### 3.10 Agriculture Infrastructure Fund — `research-agri-infra-fund`
- **Priority:** Tier 3. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`VERIFIED`. Active.
- **Eligibility verified:** farmer, FPO, cooperative, SHG/federation, agri-entrepreneur, start-up, PACS, state agency or PPP project; 10% owner contribution; working capital excluded; up to 25 projects, each up to Rs 2 crore.
- **Benefit verified:** 3% interest subvention up to Rs 2 crore for 7 years; CGTMSE guarantee with the fee paid by government; no capital subsidy.
- **Application:** `agriinfra.dac.gov.in` with a Detailed Project Report; routed to the lender.

### 3.11 PMMSY — `research-pmmsy`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`PARTIALLY_VERIFIED`. Active (reported only to September 2026).
- **Eligibility verified:** age 18–60; one project per person; lease of at least 10 years (infrastructure) or 7 years (non-infrastructure).
- **Benefit verified:** 40% of unit cost general, 60% for SC/ST/women; women entrepreneur projects up to Rs 1.5 crore at 60% (PIB, 19 Aug 2025).
- **Application:** DPR to the District Fisheries Office.
- **Open:** continuation beyond September 2026; activity-wise unit costs.

### 3.12 PMFME — `research-pmfme`
- **Priority:** Tier 3. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`VERIFIED`. Active to 31 March 2027 per the September 2026 extension.
- **Eligibility verified:** unincorporated micro unit with fewer than 10 workers, preferably the district's ODOP product; group applicants for common infrastructure; 10% beneficiary contribution; excluded activities recorded (poultry/piggery/goatry, fresh fish/meat trading, repacking only, canteens/hotels/restaurants/tiffin).
- **Benefit verified:** 35% of eligible project cost up to Rs 10 lakh per unit; 35% up to Rs 3 crore for group infrastructure; SHG seed capital Rs 40,000 per member, maximum Rs 4 lakh per SHG.
- **Application:** PMFME portal through the District Resource Person and district nodal officer.
- **Open:** the extension order is hosted on a state PMU site, not on mofpi.gov.in.

### 3.13 Post-matric scholarships — `research-post-matric-scholarship`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`PARTIALLY_VERIFIED`. Active; DBT from A.Y. 2026-27.
- **Eligibility verified per department:** SC income up to Rs 2 lakh; BC Rs 1.5 lakh rural / Rs 2 lakh urban; minorities Rs 1.5 lakh rural / Rs 2 lakh urban; differently abled below Rs 1 lakh; 75% attendance.
- **Benefit:** RTF paid to the institution, MTF paid to the student. Rupee rates are not published in a government document that loaded.
- **Deliberately not recorded:** the portal's widely quoted Rs 2.5 lakh SC ceiling, because the ePASS eligibility page returns HTTP 404 and the last verifiable official figure is Rs 2 lakh.
- **Open:** RTF/MTF rates; the 2024 SC G.O. that may supersede the RTI manual.

### 3.14 Pre-matric scholarships — `research-pre-matric-scholarship`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`PARTIALLY_VERIFIED`. Active.
- **Eligibility verified:** SC Classes V–VIII in government, local-body or aided schools with income up to Rs 2 lakh; SC IX–X with income below Rs 2 lakh; BC IX–X at Rs 1.5 lakh rural / Rs 2 lakh urban; once per class and not with another centrally funded pre-matric scholarship.
- **Benefit verified:** Rs 100/month boys, Rs 150/month girls for 10 months (V–VIII); Rs 3,000/year for day scholars in IX–X.
- **Application:** ePASS registration, countersigned by the school head, verified by Aadhaar fingerprint at the Hostel Welfare Office.
- **Open:** Class I–IV support (the SC scheme starts at V); the current registration page 404s.

### 3.15 Tuition Fee Reimbursement — `research-tuition-fee-reimbursement`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `SOURCE_IDENTIFIED`/`PARTIALLY_VERIFIED`.
- **What is verified:** the definition and split — RTF is the compulsory non-refundable fee paid to the college and cannot be collected from the eligible student; MTF is paid to the student.
- **What is not:** any rupee rate. Only college reproductions of the ePASS table carry the group-wise range, and the official RTI manual gives none.

### 3.16 Ambedkar Overseas Vidya Nidhi (SC) — `research-overseas-sc`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`VERIFIED`. Active.
- **Eligibility verified:** family income (including applicant) below Rs 5 lakh (G.O.Ms.No.74, 2017, superseding the Rs 3 lakh in G.O.Ms.No.66); 60% in graduation plus GRE/GMAT and English test scores; one child per family; PG admission in a top university of ten named countries; merit selection by the State Level Screening Committee.
- **Benefit verified:** up to Rs 20 lakh or the admission letter, whichever is less (G.O.Ms.No.22, 2016), plus a one-way economy ticket and visa charges.
- **Open:** numeric test floors for the SC stream; the dead-linked guidelines PDF with the course list.

### 3.17 KGBV — `research-kgbv`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `OFFICIALLY_VERIFIED`/`PARTIALLY_VERIFIED`. Active: 495 schools in 31 districts.
- **Eligibility:** girls in Classes VI–XII from disadvantaged groups. The national age band (10–18) could not be re-read because the Samagra Shiksha page did not load, so it is not recorded as a condition.
- **Benefit verified:** free boarding, books, uniforms, bedding; diet charges Rs 1,330/month (VI–VII), Rs 1,540 (VIII–X), Rs 2,100 (Intermediate).
- **Open:** admission procedure, seat intake, document list — none published.

### 3.18 Mid Day Meal — `research-mid-day-meal`
- **Priority:** Tier 2. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`PARTIALLY_VERIFIED`. Active.
- **Eligibility verified:** children in government, local-body and government-aided schools on working days; one hot cooked meal.
- **Open:** the national rename to PM POSHAN, the per-child calorie/protein norms, and class coverage above VIII were not re-readable from a page that loaded during this check.

### 3.19 Chenetha Mitra — `research-chenetha-mithra`
- **Priority:** Tier 3. **Status:** `CATALOGUED` → `OUTDATED`/`PARTIALLY_VERIFIED`.
- **Verified as it stood:** 40% subsidy on yarn, dyes and chemicals; 5% to the yarn purchaser, 35% to weavers pro rata to wages; applies to weavers inside and outside the cooperative fold.
- **Why outdated:** the last official description is the 2022-23 annual report and the state outlook; the 2026 outlook lists the handloom schemes in force and Chenetha Mitra is absent. No closure or replacement order was found, so status is `UNKNOWN` and the record says so.
- **Not recorded:** the "Rs 3,000 a month" revision, which appears only in press reports.

### 3.20 BC margin money / corporation subsidy — `research-bc-margin-money`
- **Priority:** Tier 3. **Status:** `CATALOGUED` → `ELIGIBILITY_VERIFIED`/`VERIFIED`. Active.
- **Eligibility verified from G.O.Ms.No.7 (25.03.2025):** income Rs 1.5 lakh rural / Rs 2 lakh urban; age 21–55 non-agricultural, 21–60 agriculture; subsidy slabs 100% up to Rs 50,000, 90% to Rs 1 lakh, 80% to Rs 2 lakh, 70% to Rs 4 lakh.
- **Application verified:** OBMMS registration, printed application at the MPDO or municipal office, district collector sanction, DBT payment.
- **Documents verified:** Aadhaar, ration card or income certificate, caste certificate issued after Telangana formation, Pattadar passbook or SADAREM certificate as applicable, photograph.
- **Conflict preserved:** district pages still publish the older 80/70/60% slabs with a Rs 5 lakh maximum on Rs 10–12 lakh unit costs.

## 4. Evidence audit

- **Sources reviewed:** 30 URLs fetched on 2026-11-28, of which 17 were registered as new sources (78 → 95). One duplicate URL (G.O.Ms.No.7) was merged into the existing source instead of being registered twice.
- **Government orders and guidelines used:** G.O.Ms.No.7 (2025), G.O.Rt.No.298 (2015), G.O.Ms.No.74 and No.22 (overseas), the Labour Welfare Fund Act 1987, PM-KISAN revised guidelines, PMFME guidelines, AIF scheme overview, PM-KISAN portal, PMFBY portal, TGREDCO PM-KUSUM, PM Surya Ghar portal, CMRF portal and CMO note, BOCWWB registration page, ePASS RTI manual, ePASS overseas page, KGBV site, Telangana Socio Economic Outlook 2023 and 2026, PMMSY PIB release.
- **Rejected or unavailable:** the PMFBY 2023 operational guidelines (404), the PM Surya Ghar MNRE guidelines PDF (no response), the Samagra Shiksha KGBV page (no response), the PM POSHAN FAQ (no response), the 2022-23 Industries annual report (no response), the pre-matric registration page (404), the ePASS "Who is eligible" page (404), the Board's welfare pamphlet (403), the publication portal for Chenetha Mitra closure (none exists).
- **Historical documents kept:** the 2013 pre-matric G.O., the 2015 BC order, the 2016/2017 overseas G.O.s, the 1987 Act. Each is dated in the source register and, where a later order supersedes it, the later one is cited too.
- **Conflicting documents kept:** Aarogyasri FAQ vs scheme page (cover), PMFBY's two parliamentary replies (Telangana participation), BC 2025 order vs district pages (subsidy slabs), BOCWWB Board vs Khammam age band.
- **No amount was copied from a district page into `benefit.amountInr`.** Where only a district page printed a figure, it sits in `amountNote` with that caveat.

## 5. Citizen value

- **"I need help with a hospital bill."** Aarogyasri is now documented as automatic for white-card families with a Rs 10 lakh cover, and CMRF as the residual route with no published cap — including the official rule that CMRF does not cover what Aarogyasri already covers.
- **"I am a farmer."** PM-KISAN's full exclusion list is now recorded, which is what actually decides most rejections; AIF and PM-KUSUM now state who can apply and what the money is.
- **"I am a student from a low-income family."** The four income tests behind ePASS are recorded per department, with the Rs 2.5 lakh portal figure explicitly *not* used. The SC overseas scholarship now has its real Rs 5 lakh income limit and Rs 20 lakh grant.
- **"I am a registered construction worker."** The board's eight benefits, their amounts and their G.O. numbers are recorded under one registration, with the real registration test (18–60, 90 days).
- **"I am a woman starting a business."** PMFME and PMMSY now state the 35% / 40–60% splits and the ceilings.
- **"I have a disability."** Only the post-matric income test moved; the disability-specific schemes remain blocked at the department's unreachable site.
- **"My family lost its earning member."** BOCWWB (Rs 6 lakh fatal accident, Rs 1 lakh natural death) and the Labour Welfare Fund (Rs 30,000 accidental death) are now documented.

## 6. Remaining uncertainty

- **Amounts still unverified:** CMRF ceiling, Nethanna Bima cover, RTF/MTF rates, PM Surya Ghar figures, PMMSY activity rates, Labour Welfare Fund amounts (Board schedule unavailable).
- **Status uncertain:** PMFBY (Telangana participation), Chenetha Mitra (absent from the 2026 scheme list), PMMSY (reported only to September 2026), PM-KUSUM (scheme end date).
- **Eligibility only partly known:** KGBV admission, Mid Day Meal class coverage, Aarogyasri CMCO referral practice, Labour Welfare Fund benefit set.
- **Application routes unconfirmed:** BOCWWB claims ("available soon"), KGBV admissions, CMRF documents, PM-KUSUM application window.
- **Conflicts preserved:** four (listed in section 4).

## 7. Infrastructure

- **No validator change was needed.** The M9.1 rules caught two real problems during this pass: the duplicate source URL for G.O.Ms.No.7 and the attempt to mark a `CONFLICTING` record as verified.
- **New test:** every record with a verification date must have a source for each condition and each evidence reference, and every `ELIGIBILITY_VERIFIED` record must carry conditions and eligibility evidence.
- **Files:** `data/research/records.json` (20 records, 17 sources), `src/core/research-data.test.ts`, this report, `PLAN.md`.

## 8. Validation

| Command | Result |
| --- | --- |
| `npm run research -- validate` | ok: 88 records, 95 sources, 0 warnings |
| `npm run research -- coverage` | 88 records (41 researched, 47 discoveries), verified 12, partial 27, eligibility stage 29, import-ready 0 |
| `npm run research -- gaps` | 52 gaps |
| `npm run research -- list --conflicts` | 2 (Cheyutha, PMFBY) |
| `npm run research -- list --ready` | 0 |
| `npx tsc -b` | exit 0 |
| `npx vitest run` | 23 files, 554 tests passed |
| `npx oxlint src scripts` | 0 errors, 2 pre-existing warnings |
| `npm run build` | passed |

## 9. Integrity

`data/schemes.json` unchanged; eligibility engine, matcher and UI untouched; no import; no invented condition, amount or link; uncertainty preserved in `unresolvedQuestions` and in explicit conflicts; 0 import-ready records.

## 10. Recommendation

**M9.4 — close the verification blockers, not new discovery.** Three concrete jobs: (1) get the disability/transgender department's published schemes, which is the largest remaining hole for a vulnerable group; (2) obtain the CMRF ceiling and the ePASS RTF/MTF rate documents, the two most-cited missing numbers; (3) re-check the four preserved conflicts against a current G.O. — PMFBY participation first, because a farmer deciding whether to insure a crop is the highest-stakes question in the register. Not started.
