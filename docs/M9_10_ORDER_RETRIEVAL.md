# M9.10 — Order retrieval attempt (Cheyutha and Aasara)

Date: 28 November 2026. Scope: find the Cheyutha Government Order and a post-2019 Aasara order so the benefit rates and the old-age age limit can rest on an order rather than a summary. Nothing about eligibility, schemes or research scoring was changed.

## What was tried

| Target | Route | Result |
| --- | --- | --- |
| Cheyutha order | web search including the GO register domain | no order naming Cheyutha; only the state portal page, district pages and the 2026 MCR HRD summary |
| Telangana GO Issue Register | `https://goir.telangana.gov.in/` (HTTP 200) | reachable, but search is an ASP.NET form with no stable query URL; subject-only search, no full-text, and downloads are per-result. Not usable from a headless check without guessing form posts, so no order was retrieved. |
| Current Aasara rates (post-2019) | web search for enhancement orders | no post-2019 enhancement order found. The 2019 G.O.Ms.No.34 remains the newest amount source; the 2026 training summary shows a different disabled figure without citing an order. |
| Old-age age limit | official state publication | **found**: Telangana Socio Economic Outlook 2021 (`telangana.gov.in`, HTTP 200) states the pensionable age was reduced from 65 to 57 years |

## What the register now says

- New source `tg-seo-2021` (primary official, retrieved 2026-11-28).
- Aasara gains a condition: old age 57, with the note that the CAG table's 65 describes the 2018-21 rules, so the two are a change over time rather than a contradiction.
- The unresolved question is narrowed: the age is recorded as current policy **without an order number**, because the order itself was not found.
- Aasara rates stay at the 2019 order figures; the disabled ₹3,016 vs ₹4,016 disagreement is still open.
- Cheyutha stays `CONFLICTING` / `UNVERIFIED`; no order was found, so nothing was reconciled.

## Why this is a result, not a failure

The milestone's rule was that a conflict stays unless an order settles it. One of the three open Aasara questions (the age) now has a dated official source and is explained by time; the two rate questions and the Cheyutha question remain open, and the register says so. No source was recorded that could not be fetched.

## Files

Modified: `data/research/records.json` (one source, one condition, notes, one question rewritten). Created: this document. No code, scheme data or eligibility change.
