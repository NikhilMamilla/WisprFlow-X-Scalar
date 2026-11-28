# Telangana discovery register

A department-by-department map of discovery, so the next pass starts where the last one stopped instead of repeating searches. Status is about **discovery**, not verification: `FOUND` means at least one record exists with an official source, `BLOCKED` means the department publishes programmes but no usable page could be fetched, `UNTOUCHED` means no search has been run.

Last updated: 28 November 2026.

## Departments with records

| Department / agency | Records | Discovery source used |
| --- | --- | --- |
| Agriculture Department | Rythu Bharosa, Rythu Bandhu, subsidised seed (T-SEED), farm mechanisation, crop loan interest support, PM-KISAN, PMFBY | department and district agriculture pages, OSSDS portal |
| Horticulture Department | micro-irrigation, MIDH, polyhouse/shade net | Sangareddy and Suryapet horticulture pages |
| Sericulture Department | Silk Samagra-2 / sericulture assistance | Warangal sericulture page |
| Fisheries Department | PMMSY, fish seed subsidy | Warangal fisheries page |
| Animal Husbandry | sheep distribution (existing record only) | state outlook |
| Handlooms and Textiles | Chenetha Mithra, Nethannaku Cheyutha, Nethanna Bima | Gadwal, Siddipet and Wanaparthy pages, state outlook |
| Labour Department | BOCWWB benefits, Labour Welfare Fund benefits | BOCWWB and Sangareddy labour pages |
| Labour, Employment and Training | employment portal, TOMCOM, German language programme | employment.telangana.gov.in |
| Social Welfare / SC Development | Dalit Bandhu, SC land purchase, Best Available Schools, overseas SC scholarship, hostels | OBMMS, Mahabubabad and Suryapet pages, ePASS |
| Tribal Welfare | TGTWREIS, Best Available Schools, Indira Soura Giri Jala Vikasam | TGTWREIS site, Suryapet, CMO release |
| BC Welfare | margin money, Rajiv Abhyudaya, BC study circles, BC hostels, federation assistance, MJP overseas | BC Welfare department page, Kamareddy, Narayanpet, OBMMS |
| Minorities Welfare | TMREIS, TSMFC subsidy, CM overseas scholarship | Jagtial page, ePASS |
| Women, Children, Disabled and Senior Citizens | Arogya Lakshmi, KCR Kit, supplementary nutrition, Mahalakshmi | Kothagudem WCD page, state portal |
| Rajiv Aarogyasri Health Care Trust | Aarogyasri, journalists health scheme | Trust portal, JHS portal |
| Health and Family Welfare | Kanti Velugu, free dialysis (unrecorded) | district pages |
| School Education | Mid Day Meal, KGBV | MDM page, KGBV site |
| Higher Education / ePASS | pre-matric, post-matric, RTF, MTF, four overseas schemes | ePASS portal |
| Rural Development / SERP | Indira Mahila Shakti, SHG bank linkage, Gruha Jyothi (existing) | SERP, Wanaparthy DRDA |
| Municipal Administration / MEPMA | urban livelihood, street vendor support | Kamareddy MEPMA page |
| Industries and Commerce | T-IDEA, TIHCL, T-FAP, WE Hub, T-Spark/T-Fund, T-Works, TASK | TGFPS, TIHCL, startup, WE Hub, T-Works, TASK |
| IT and Electronics | TASK, WE Hub, T-Spark | as above |
| Energy / TGREDCO | PM-KUSUM, PM Surya Ghar | TGREDCO pages |
| Transport / TGSRTC | concessional bus passes | TGSRTC page |
| Chief Minister's Office | CMRF, Indira Soura Giri Jala Vikasam | state portal, CMO release |
| Information and Public Relations | Working Journalists Welfare Fund | Media Academy G.O. |
| Ministry of Health and Family Welfare (central) | Tele-MANAS | Tele-MANAS site |
| Ministry of Agriculture (central) | PMFBY, PM-KISAN, AIF | scheme portals |
| Ministry of New and Renewable Energy (central) | PM-KUSUM, PM Surya Ghar | TGREDCO |
| Ministry of Food Processing (central) | PMFME | TGFPS |
| Ministry of Fisheries (central) | PMMSY | Warangal fisheries |
| Ministry of Labour and Employment (central) | e-Shram, PM-SYM | official FAQs |
| Department of Financial Services (central) | PMSBY, PMJJBY, PMJDY | official FAQs |
| Ministry of Housing and Urban Affairs (central) | PM SVANidhi | guidelines |

## Blocked — programmes exist, source not usable

| Area | What failed | Next step |
| --- | --- | --- |
| Disability, senior citizens, transgender welfare | `wdsc.telangana.gov.in` did not respond (all pages) | Retry from another network, or use the department's annual report |
| Horticulture micro-irrigation | department micro-irrigation page did not respond | district horticulture pages only |
| Minority Finance Corporation | `tgmfc.com` returned HTTP 406 | try the departmental minorities page |
| SC/ST residential societies | `tgswreis.telangana.gov.in` returned 404 | find the current society domain |
| Child protection (Mission Vatsalya, child rights commission) | `wcd.gov.in` and `tgscpcr.telangana.gov.in` unreachable | use the state WCD department site |
| Skill development corporation | `rdsdetelangana.dgt.gov.in` unreachable; TSSDC is not on a gov.in domain | check the employment portal for the current route |
| Advocates welfare fund | only an Act PDF with an encoded URL | locate the fund's own page |

## Untouched — no search run yet

Civil Supplies (ration and food security), Animal Husbandry (dairy, poultry, fodder), Environment and Forests, Youth Affairs and Sports, Law, Co-operation, Panchayat Raj (other than SERP), Housing (TGHCL weaker-section housing), Women's safety beyond SHE Teams, Home Department victim compensation, BC/SC/ST corporation loan melas, and every central scheme in section 4 of the M9.2 report.

## How to use this register

1. Pick a department from `UNTOUCHED` or `BLOCKED`.
2. Search that department's own site first, then its district pages.
3. Record only programmes with a page that loads and describes them.
4. Add the department here with the source used, or move it to `BLOCKED` with the failure.
5. Never move an entry to `FOUND` on the strength of a search snippet.
