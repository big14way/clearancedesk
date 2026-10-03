# Eval results: run 1 (before the LASU exam-list fix)

Run 2026-10-03 21:14 UTC · 15 cases · model `claude-sonnet-5-5` · Clearance Desk at https://clearancedesk.vercel.app

Expected verdicts come from `eval/cases.json`. See that file for who set them and the evidence for each.

| Case | What it tests | Expected | Clearance Desk | | Baseline (no tools) | |
|---|---|---|---|---|---|---|
| C01 | UNILAG Computer Science, one WAEC sitting with Further Maths | Eligible | Eligible | ✓ | Eligible | ✓ |
| C02 | UNILAG Computer Science, Further Maths E8 | Not eligible | Not eligible | ✓ | Eligible | ✗ |
| C03 | UNILAG Medicine, Physics credit only in a second sitting | Not eligible | Not eligible | ✓ | Eligible | ✗ |
| C04 | UNN Nursing, Physics credit only in a second sitting | Eligible | Eligible | ✓ | At risk | ✗ |
| C05 | LASU Nursing, Chemistry credit from an awaited NECO result | At risk | At risk | ✓ | At risk | ✓ |
| C06 | UI Medicine, strong single sitting, UTME 290 | At risk | At risk | ✓ | Eligible | ✗ |
| C07 | OAU Medicine, UTME 196 | Not eligible | Not eligible | ✓ | Not eligible | ✓ |
| C08 | LASU Medicine, UTME 196 | Eligible | Eligible | ✓ | Not eligible | ✗ |
| C09 | UI Computer Science, 5 credits across two sittings | Not eligible | Not eligible | ✓ | Eligible | ✗ |
| C10 | UNILAG Law with Mathematics as a UTME subject | Not eligible | Not eligible | ✓ | Not eligible | ✓ |
| C11 | LASU Medicine with a NABTEB result | Eligible | Not eligible | ✗ | No data | ✗ |
| C12 | UNILAG Nursing, English D7 | Not eligible | Not eligible | ✓ | Not eligible | ✓ |
| C13 | UNILAG Economics, clean candidate | Eligible | At risk | ✗ | Eligible | ✓ |
| C14 | UNILAG Petroleum Engineering | Not eligible | No data | ✗ | Eligible | ✗ |
| C15 | UNN Medicine, UTME 165 | Eligible | Eligible | ✓ | At risk | ✗ |

## Totals

| | Clearance Desk | Baseline |
|---|---|---|
| Correct | **12 / 15** | **6 / 15** |
| Said "Eligible" to a candidate who fails a rule | 0 | 4 |
| Declined ("no data") instead of answering | 1 | 1 |
| Median time | 18 s (C13–C15 include ~5 min of rate-limit waiting; fixed in run 2) | 8 s |

## Every answer

**C01: UNILAG Computer Science, one WAEC sitting with Further Maths.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNILAG Computer Science's 2026/2027 subject, score and O'level rules.
- Baseline (Eligible ✓): The UTME combination of English, Mathematics, Physics and Chemistry matches the Computer Science requirement, and the score of 268 is well above UNILAG's published UTME minimum of about 200. The single WAEC 2025 sitting has credits in English (C5), Mathematics (B2), Physics (C4) and Chemistry (B3), which covers the required five credits including English, Mathematics and Physics. Departmental cut-offs and Post-UTME aggregates can change, but every requirement that can be checked from these results is met.

**C02: UNILAG Computer Science, Further Maths E8.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: Further Mathematics is E8 but UNILAG Computer Science needs C6 or better.
- Baseline (Eligible ✗): The UTME combination of English, Mathematics, Physics and Chemistry fits the Computer Science requirement, and 268 is above the UTME minimum of about 200 that UNILAG has used for screening. The single WAEC sitting has credits in English (C5), Mathematics (B2), Physics (C4) and Chemistry (B3), and with Biology, Civic Education and Economics there are well over five credits. The 2026/2027 requirements may differ slightly from earlier sessions, but nothing in these results conflicts with the published requirements.

**C03: UNILAG Medicine, Physics credit only in a second sitting.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Medicine and Surgery (2026/2027): O'level results don't meet the rules.
- Baseline (Eligible ✗): Medicine and Surgery at UNILAG requires UTME English, Biology, Chemistry and Physics, and the candidate registered exactly these. Across two sittings, which is the maximum allowed, the candidate has credits in English (WAEC B2), Mathematics (WAEC A1), Biology (WAEC B2), Chemistry (WAEC B3) and Physics (NECO B3). The WAEC Physics D7 does not matter because the NECO Physics B3 covers it, and the UTME score of 301 is well above any published minimum.

**C04: UNN Nursing, Physics credit only in a second sitting.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNN's Nursing Science requirements for 2026/2027, with a few things left to confirm.
- Baseline (At risk ✗): The UTME subject combination (English, Biology, Chemistry, Physics) is correct, and the O'level credits in English, Mathematics, Biology, Chemistry and Physics are met across two sittings (Physics C5 at NECO). However, I can't confirm UNN's published Nursing Science cut-off for 2026/2027, and 214 may fall below it given how competitive the course is, so eligibility can't be fully confirmed.

**C05: LASU Nursing, Chemistry credit from an awaited NECO result.** Expected: At risk.

- Clearance Desk (At risk ✓): At risk: your NECO 2026 result is still awaited, so LASU Nursing Science can't be confirmed yet.
- Baseline (At risk ✓): The usual requirement is credits in English, Mathematics, Biology, Chemistry and Physics in no more than two sittings, and the UTME subjects (English, Biology, Chemistry, Physics) and the score of 231 look sufficient. The WAEC 2025 Chemistry grade is D7, which is not a credit, so the Chemistry credit depends on the NECO 2026 result, which is still awaited (expected C5). English (C4), Mathematics (C6), Biology (B3) and Physics (C5) already have credits, so the candidate qualifies only if the NECO Chemistry credit is actually obtained.

**C06: UI Medicine, strong single sitting, UTME 290.** Expected: At risk.

- Clearance Desk (At risk ✓): At risk: your subjects and O'levels fit UI Medicine (2026/2027), but your 290 can't be confirmed.
- Baseline (Eligible ✗): The UTME subjects (English, Physics, Chemistry, Biology) match the Medicine and Surgery requirement at UI. The WAEC 2025 result, in a single sitting, has credits in English (B2), Mathematics (A1), Physics (B3), Chemistry (B2) and Biology (A1), which covers the required five credits. A UTME score of 290 is well above the published minimum for UI, though the final cut-off depends on competitiveness. I am relying on the stable earlier-session requirements, since I could not confirm anything specific to 2026/2027.

**C07: OAU Medicine, UTME 196.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: your UTME score of 196 is below OAU's 200 minimum for 2026/2027.
- Baseline (Not eligible ✓): The O'level results and UTME subjects satisfy the Medicine and Surgery requirements. WAEC 2025 shows credits in English, Mathematics, Physics, Chemistry and Biology in one sitting, and the UTME subjects are English, Physics, Chemistry and Biology. However, OAU's published minimum UTME score for admission screening is 200, and for Medicine the competitive cut-off is much higher, so 196 falls short. I could not confirm a separate 2026/2027 figure, so this rests on OAU's usual published minimum.

**C08: LASU Medicine, UTME 196.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet LASU's 2026/2027 Medicine and Surgery requirements on your UTME and O'level results.
- Baseline (Not eligible ✗): The UTME subjects (English, Physics, Chemistry, Biology) and the single WAEC sitting with credits in English, Mathematics, Physics, Chemistry and Biology meet LASU's Medicine and Surgery requirements. However, the score of 196 is below the 200 minimum UTME score I recall LASU requiring for Medicine, and the competitive cut-off is usually much higher. I could not confirm the 2026/2027 figure, so this verdict rests on that recalled 200 minimum.

**C09: UI Computer Science, 5 credits across two sittings.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UI Computer Science (2026/2027): you have 5 usable credits, but two sittings need 6.
- Baseline (Eligible ✗): The UTME combination (English, Mathematics, Physics, Chemistry) matches Computer Science at UI, and 255 is well above the usual minimum UTME score of about 200. Across the two 2025 sittings (WAEC and NECO, within the two-sitting limit) the candidate has credits in English (C5), Mathematics (B3), Physics (C4), Chemistry (NECO C5) and Civic Education (B2), which gives five credits including the core subjects. The WAEC Chemistry D7 is covered by the NECO Chemistry credit. This is based on my recollection of UI's published requirements, not a check against the 2026/2027 brochure.

**C10: UNILAG Law with Mathematics as a UTME subject.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Law 2026/2027: you need one more valid UTME subject.
- Baseline (Not eligible ✓): Law at UNILAG requires UTME English, Literature in English and two other Arts or Social Science subjects. Mathematics is not one of these, so the UTME combination (English, Mathematics, Literature, Government) does not fit. The O'level results (English B3, Literature B2, Government B3, plus other credits in one sitting) and the 271 UTME score would otherwise be fine.

**C11: LASU Medicine with a NABTEB result.** Expected: Eligible.

- Clearance Desk (Not eligible ✗): Not eligible: LASU Medicine (2026/2027) lists only WAEC and NECO, and your results are NABTEB.
- Baseline (No data ✗): The candidate's UTME subjects are correct and the NABTEB results show credits in English, Mathematics, Physics, Chemistry and Biology in one sitting. However, I cannot reliably confirm LASU's published 2026/2027 UTME minimum score for Medicine and Surgery, or whether NABTEB results are accepted for this course, so I cannot give a firm verdict.

**C12: UNILAG Nursing, English D7.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: your English D7 is below the C6 needed, leaving only 4 credits.
- Baseline (Not eligible ✓): Nursing Science at UNILAG requires credit passes (C6 or better) in English Language, Mathematics, Biology, Chemistry and Physics at O'level. The candidate's English Language grade is D7, which is only a pass and not a credit, so this requirement is not met even though the other four subjects are credits and the UTME subject combination and score of 280 are fine.

**C13: UNILAG Economics, clean candidate.** Expected: Eligible.

- Clearance Desk (At risk ✗): You're at risk: you pass every check, but official sources disagree on one rule.
- Baseline (Eligible ✓): The UTME combination of English, Mathematics, Economics and Government fits UNILAG's Economics requirement, and a score of 262 is above the 200 minimum for UNILAG admission. In one WAEC sitting, the candidate has credits in English (C4), Mathematics (B3), Economics (B2), Government (C5), Biology (C6) and Civic Education (B3). That covers the required core subjects plus the other credits needed, within a single sitting.

**C14: UNILAG Petroleum Engineering.** Expected: Not eligible.

- Clearance Desk (No data ✗): Petroleum Engineering is not in the data for UNILAG, so I can't check it. The UNILAG courses I hold are: Accounting, Computer Science, Economics, Electrical/Electronics Engineering, Law, Mass Communication, Medicine and Surgery, and Nursing Science. I have not checked any other course in its place.
- Baseline (Eligible ✗): The UTME subject combination (English, Mathematics, Physics, Chemistry) matches the requirement, and the single WAEC sitting has credits in English (C4), Mathematics (B3), Physics (C5) and Chemistry (B2), meeting the five-credit rule with Biology C6 as an additional credit. The UTME score of 250 is above UNILAG's usual published minimum of 200 for screening, though the 2026/2027 figure is not confirmed and competitive admission cut-offs may be higher.

**C15: UNN Medicine, UTME 165.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNN's Medicine and Surgery requirements for 2026/2027, with some things to confirm yourself.
- Baseline (At risk ✗): The O'level results meet the usual requirement: credits in English, Mathematics, Physics, Chemistry and Biology in a single WAEC sitting. The UTME subject combination (English, Physics, Chemistry, Biology) is also correct. However, I cannot confirm a published 2026/2027 UTME minimum for Medicine and Surgery. UNN's general cut-off is about 160, but Medicine's competitive cut-off has been reported much higher (around 200), so a score of 165 may not qualify.

