# Eval results

Run 2026-10-03 21:27 UTC · 15 cases · model `claude-sonnet-5-5` · Clearance Desk at https://clearancedesk.vercel.app

Expected verdicts come from `eval/cases.json`. See that file for who set them and the evidence for each.

| Case | What it tests | Expected | Clearance Desk | | Baseline (no tools) | |
|---|---|---|---|---|---|---|
| C01 | UNILAG Computer Science, one WAEC sitting with Further Maths | Eligible | Eligible | ✓ | Eligible | ✓ |
| C02 | UNILAG Computer Science, Further Maths E8 | Not eligible | Not eligible | ✓ | Eligible | ✗ |
| C03 | UNILAG Medicine, Physics credit only in a second sitting | Not eligible | Not eligible | ✓ | Eligible | ✗ |
| C04 | UNN Nursing, Physics credit only in a second sitting | Eligible | Eligible | ✓ | Eligible | ✓ |
| C05 | LASU Nursing, Chemistry credit from an awaited NECO result | At risk | At risk | ✓ | At risk | ✓ |
| C06 | UI Medicine, strong single sitting, UTME 290 | At risk | At risk | ✓ | Eligible | ✗ |
| C07 | OAU Medicine, UTME 196 | Not eligible | Not eligible | ✓ | Not eligible | ✓ |
| C08 | LASU Medicine, UTME 196 | Eligible | Eligible | ✓ | At risk | ✗ |
| C09 | UI Computer Science, 5 credits across two sittings | Not eligible | Not eligible | ✓ | Eligible | ✗ |
| C10 | UNILAG Law with Mathematics as a UTME subject | Not eligible | Not eligible | ✓ | Not eligible | ✓ |
| C11 | LASU Medicine with a NABTEB result | Eligible | Eligible | ✓ | At risk | ✗ |
| C12 | UNILAG Nursing, English D7 | Not eligible | Not eligible | ✓ | Not eligible | ✓ |
| C13 | UNILAG Economics, clean candidate | Eligible | At risk | ✗ | Eligible | ✓ |
| C14 | UNILAG Petroleum Engineering | Not eligible | No data | ✗ | At risk | ✗ |
| C15 | UNN Medicine, UTME 165 | Eligible | Eligible | ✓ | Not eligible | ✗ |

## Totals

| | Clearance Desk | Baseline |
|---|---|---|
| Correct | **13 / 15** | **7 / 15** |
| Said "Eligible" to a candidate who fails a rule | 0 | 3 |
| Declined ("no data") instead of answering | 1 | 0 |
| Median time | 14 s | 6 s |

## Across runs

- **Run 1** ([`results-run1.md`](results-run1.md)) was before the LASU exam-list fix that the eval itself exposed (C11): Clearance Desk 12/15, baseline 6/15.
- **Between the two runs:**
  - Clearance Desk changed only C11, the case that was fixed.
  - The baseline changed its verdict on 5 of 15 cases (C04, C08, C11, C14, C15) with identical inputs.
- **Clearance Desk's two remaining misses:**
  - **C13:** Clearance Desk deliberately marks every requirement with conflicting official sources as At risk. The answer key judged that this conflict doesn't affect this candidate.
  - **C14:** the course isn't in Clearance Desk's data, so it declines rather than guess.

## Every answer

**C01: UNILAG Computer Science, one WAEC sitting with Further Maths.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNILAG's 2026/2027 Computer Science requirements on subjects, score and O'level.
- Baseline (Eligible ✓): The UTME combination (English, Mathematics, Physics, Chemistry) matches UNILAG's Computer Science requirement. The score of 268 is above the 200 minimum I recall for UNILAG. The single WAEC 2025 sitting has credits in English (C5), Mathematics (B2), Physics (C4), Chemistry (B3) and Further Mathematics (B3), which covers the required five credits including the core subjects. I have not seen the 2026/2027 requirements themselves, so this assumes they are unchanged from earlier sessions.

**C02: UNILAG Computer Science, Further Maths E8.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: your Further Mathematics grade (E8) is below the C6 needed for UNILAG Computer Science.
- Baseline (Eligible ✗): The UTME combination of English, Mathematics, Physics and Chemistry fits UNILAG's Computer Science requirement. The score of 268 is above UNILAG's published minimum UTME score of 200 for screening. The single WAEC 2025 sitting has credits in English (C5), Mathematics (B2), Physics (C4) and Chemistry (B3), plus Biology, Civic Education and Economics, which meets the five-credit requirement including the core subjects. Note that I am applying the most recently published requirements, not any 2026/2027 update.

**C03: UNILAG Medicine, Physics credit only in a second sitting.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Medicine and Surgery 2026/2027: your O'level results fall short.
- Baseline (Eligible ✗): UTME subjects (English, Biology, Chemistry, Physics) match the requirement and 301 is well above the published minimum. Across the two sittings (WAEC 2025 and NECO 2025) the candidate has credits in English, Mathematics, Biology, Chemistry and Physics, with the Physics credit (B3) coming from the NECO sitting after a D7 in WAEC. Two sittings are within the permitted limit, so every checkable requirement is met.

**C04: UNN Nursing, Physics credit only in a second sitting.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNN Nursing Science's 2026/2027 subject, score and O'level rules, with items to confirm.
- Baseline (Eligible ✓): The UTME subject combination (English, Biology, Chemistry, Physics) is correct. O'level credits in English (C4), Mathematics (C5), Biology (B3) and Chemistry (C6) come from WAEC, and Physics credit (C5) comes from NECO, so all five required credits are met within two sittings. A UTME score of 214 is above the commonly published minimum of about 180 for UNN.

**C05: LASU Nursing, Chemistry credit from an awaited NECO result.** Expected: At risk.

- Clearance Desk (At risk ✓): At risk: you meet LASU Nursing Science 2026/2027 on paper, but your NECO result is still awaited.
- Baseline (At risk ✓): The WAEC 2025 sitting gives credits in English (C4), Mathematics (C6), Biology (B3) and Physics (C5), but Chemistry is D7, which is not a credit. The Chemistry credit depends on the NECO 2026 result, which is still awaited (expected C5). If that C5 is confirmed, the two sittings together satisfy the five-credit requirement (English, Mathematics, Biology, Chemistry, Physics). The UTME subject combination is correct, but I can't confirm that 231 clears LASU's Nursing cut-off for 2026/2027.

**C06: UI Medicine, strong single sitting, UTME 290.** Expected: At risk.

- Clearance Desk (At risk ✓): At risk: your subjects and O'levels fit, but we can't confirm your 290 UTME score for UI Medicine.
- Baseline (Eligible ✗): The UTME subjects (English, Physics, Chemistry, Biology) match the Medicine and Surgery requirement at UI. The single WAEC 2025 sitting has credits in English (B2), Mathematics (A1), Physics (B3), Chemistry (B2) and Biology (A1), so the five-credit, one-sitting O'level requirement is met. A UTME score of 290 is above the published minimum, though the actual admission cut-off for Medicine is competitive and can change each year.

**C07: OAU Medicine, UTME 196.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: your UTME score of 196 is below OAU's minimum of 200 for 2026/2027.
- Baseline (Not eligible ✓): The UTME subjects (English, Physics, Chemistry, Biology) and the O'level credits in English, Mathematics, Physics, Chemistry and Biology at a single WAEC sitting meet OAU's Medicine and Surgery requirements. However, OAU's published minimum UTME score for screening is 200, and the candidate's 196 is below it. This is from my recollection of earlier sessions' OAU screening notices, not a 2026/2027 notice, so it is worth confirming against OAU's current announcement.

**C08: LASU Medicine, UTME 196.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet LASU's 2026/2027 Medicine and Surgery requirements on subjects, score and O'level.
- Baseline (At risk ✗): The UTME subject combination (English, Physics, Chemistry, Biology) is correct. The WAEC 2025 sitting has credits in English, Mathematics, Physics, Chemistry and Biology, so the O'level requirement is met. However, the 196 UTME score is just below the 200 that I recall as LASU's usual Medicine and Surgery threshold, and I can't confirm the 2026/2027 minimum from official sources, so eligibility is uncertain.

**C09: UI Computer Science, 5 credits across two sittings.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: you have 5 O'level credits but UI Computer Science needs 6 across two sittings.
- Baseline (Eligible ✗): The UTME subjects (English, Mathematics, Physics, Chemistry) match the Computer Science requirement, and 255 is above the university's published minimum UTME score. Across the two sittings, which UI accepts, the candidate has credits in English (WAEC C5), Mathematics (B3), Physics (C4) and Chemistry (NECO C5, since the WAEC D7 is not a credit). Together with Geography and Civic Education, that gives at least five credits.

**C10: UNILAG Law with Mathematics as a UTME subject.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: your UTME has Mathematics, which doesn't count for UNILAG Law (2026/2027).
- Baseline (Not eligible ✓): The UTME score of 271 is high, and the O'level results (one WAEC sitting with credits in English, Literature, Government, CRS and Economics) would satisfy the credit requirements for Law. However, the UTME combination is the problem. Law requires Use of English, Literature in English and two other Arts or Social Science subjects. The candidate has only Government as a valid third subject, because Mathematics is not an accepted Law subject, so the combination is invalid. This rests on my recollection of the JAMB/UNILAG subject rules, so please check it against the current brochure.

**C11: LASU Medicine with a NABTEB result.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet LASU's 2026/2027 Medicine and Surgery requirements, with a few things to confirm yourself.
- Baseline (At risk ✗): The UTME subjects (English, Physics, Chemistry, Biology) and the O'level credits in English, Mathematics, Physics, Chemistry and Biology in one sitting fit the usual Medicine requirements. However, I can't confirm the 2026/2027 UTME minimum for LASU Medicine against the 262 score, and I can't confirm that NABTEB results are accepted for this course, so eligibility can't be fully confirmed.

**C12: UNILAG Nursing, English D7.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Nursing Science 2026/2027: English is D7, and you have only 4 credits.
- Baseline (Not eligible ✓): Nursing Science at UNILAG requires credit passes (C6 or better) in English Language, Mathematics, Biology, Chemistry and Physics at O'level. The candidate's English Language grade is D7, which is not a credit, so a required subject fails. The UTME subject combination (English, Biology, Chemistry, Physics) is correct, but the English result alone makes the candidate ineligible unless a later sitting gives an English credit.

**C13: UNILAG Economics, clean candidate.** Expected: Eligible.

- Clearance Desk (At risk ✗): At risk: you meet the rules, but official sources disagree on the extra subjects.
- Baseline (Eligible ✓): The UTME combination (English, Mathematics, Economics, Government) matches the Economics requirement at UNILAG, and 262 is above the published UTME minimum of 200. The single WAEC 2025 sitting has six credits, including English (C4), Mathematics (B3), Economics (B2) and Government (C5), which meets the five-credit requirement with the required subjects. This is based on UNILAG's usual published requirements, since I could not confirm the 2026/2027 brochure.

**C14: UNILAG Petroleum Engineering.** Expected: Not eligible.

- Clearance Desk (No data ✗): Petroleum Engineering isn't in the data for UNILAG, so I can't check it. I won't guess or use a similar course. The courses held for UNILAG are: Accounting, Computer Science, Economics, Electrical/Electronics Engineering, Law, Mass Communication, Medicine and Surgery, and Nursing Science. Check the official UNILAG admission page for Petroleum Engineering, or pick one of these courses.
- Baseline (At risk ✗): The O'level results meet the requirements: credits in English, Mathematics, Physics and Chemistry plus Biology as an additional science subject, all in a single sitting, and the UTME subject combination is correct. A UTME score of 250 clears the general 200 minimum, but UNILAG does not publish a fixed course-specific cut-off for Petroleum and Gas Engineering, and the competitive cut-off is usually higher, so admission can't be confirmed.

**C15: UNN Medicine, UTME 165.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNN's Medicine and Surgery requirements for 2026/2027, with some things to confirm yourself.
- Baseline (Not eligible ✗): The UTME subject combination (English, Physics, Chemistry, Biology) and the O'level credits in English, Mathematics, Physics, Chemistry and Biology in a single WAEC sitting all meet UNN's Medicine and Surgery requirements. However, the UTME score of 165 is below the 200 minimum UNN applies to Medicine and Surgery (and in practice competitive scores are much higher), so the candidate fails the published score requirement.

