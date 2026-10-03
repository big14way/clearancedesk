# Eval results

Run 2026-10-03 23:31 UTC · 15 cases · model `claude-sonnet-5-5` · Clearance Desk at https://clearancedesk.vercel.app

Expected verdicts come from `eval/cases.json`. See that file for who set them and the evidence for each.

> Merged run: desk re-run for C02, C09, C10, C11, C12, C13 on 2026-10-03 23:31 UTC; every other answer is from the previous run. Those six had never been answered: the first attempts were all refused by the site's rate limiter, which was counting its own refusals (a bug the eval exposed, since fixed).

- **Clearance Desk:** the agent, with both Sanity Context endpoints and the deterministic evaluator.
- **Same model + Knowledge Base search:** the keyword-search baseline. It gets the same prompt, plus `knowledge_base_search`/`knowledge_base_read` on the same Knowledge Base and its outline, but no structured rules and no evaluator.
- **Same model, no tools:** memory only.

| Case | What it tests | Expected | Clearance Desk | + KB search | No tools |
|---|---|---|---|---|---|
| C01 | UNILAG Computer Science, one WAEC sitting with Further Maths | Eligible | Eligible ✓ | Eligible ✓ | Eligible ✓ |
| C02 | UNILAG Computer Science, Further Maths E8 | Not eligible | Not eligible ✓ | Eligible ✗ | Eligible ✗ |
| C03 | UNILAG Medicine, Physics credit only in a second sitting | Not eligible | Not eligible ✓ | Eligible ✗ | Eligible ✗ |
| C04 | UNN Nursing, Physics credit only in a second sitting | Eligible | Eligible ✓ | At risk ✗ | At risk ✗ |
| C05 | LASU Nursing, Chemistry credit from an awaited NECO result | At risk | At risk ✓ | At risk ✓ | At risk ✓ |
| C06 | UI Medicine, strong single sitting, UTME 290 | At risk | At risk ✓ | Eligible ✗ | Eligible ✗ |
| C07 | OAU Medicine, UTME 196 | Not eligible | Not eligible ✓ | Not eligible ✓ | Not eligible ✓ |
| C08 | LASU Medicine, UTME 196 | Eligible | Eligible ✓ | At risk ✗ | Not eligible ✗ |
| C09 | UI Computer Science, 5 credits across two sittings | Not eligible | Not eligible ✓ | Eligible ✗ | Eligible ✗ |
| C10 | UNILAG Law with Mathematics as a UTME subject | Not eligible | Not eligible ✓ | Not eligible ✓ | Not eligible ✓ |
| C11 | LASU Medicine with a NABTEB result | Eligible | Eligible ✓ | At risk ✗ | At risk ✗ |
| C12 | UNILAG Nursing, English D7 | Not eligible | Not eligible ✓ | Not eligible ✓ | Not eligible ✓ |
| C13 | UNILAG Economics, clean candidate | Eligible | At risk ✗ | Eligible ✓ | Eligible ✓ |
| C14 | UNILAG Petroleum Engineering | Not eligible | No data ✗ | Eligible ✗ | At risk ✗ |
| C15 | UNN Medicine, UTME 165 | Eligible | Eligible ✓ | Not eligible ✗ | At risk ✗ |

## Totals

| | Clearance Desk | Same model + Knowledge Base search | Same model, no tools |
|---|---|---|---|
| Correct | **13 / 15** | **6 / 15** | **6 / 15** |
| Said "Eligible" to a candidate who fails a rule | 0 | 4 | 3 |
| Declined ("no data") instead of answering | 1 | 0 | 0 |
| Median time | 14 s | 12 s | 6 s |

## Across runs

| Run | Clearance Desk | + KB search | No tools | False "Eligible" (desk / KB / none) |
|---|---|---|---|---|
| [Run 3](results-run3.md) | 13 / 15 | 4 / 15 | 8 / 15 | 0 / 2 / 4 |
| Run 4 (this page) | 13 / 15 | 6 / 15 | 6 / 15 | 0 / 4 / 3 |

Runs 1 and 2 had only two systems. [Run 1](results-run1.md) was before the LASU exam-list fix that it exposed.

Clearance Desk's two misses are deliberate behaviour:
- **C13:** conflicting official sources always make the verdict At risk.
- **C14:** a course outside the data gets "no data".

## Every answer

**C01: UNILAG Computer Science, one WAEC sitting with Further Maths.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You are eligible for UNILAG Computer Science (2026/2027) on subjects, score and O'level results.
- Same model + Knowledge Base search (Eligible ✓): UNILAG's general UTME cut-off for 2026/2027 is 200 for every course (`cut_off_marks/unilag/overview`), and 268 is above it. UNILAG lists Computer Science as Use of English, Mathematics, Physics and Chemistry or Biology (`utme_subject_combinations/unilag`), and the candidate's subjects fit. That entry is dated 2025/2026, and I found no 2026/2027 combination to compare it against. O'level meets UNILAG's rule of five credits at one sitting including English and Mathematics (`olevel_requirements/credit_passes_and_sittings`): the WAEC 2025 result has English C5, Mathematics B2, Further Mathematics B3, Physics C4, Chemistry B3 and Civic Education B2, plus Economics C5, all at one sitting. The Computer Science aggregate cut-offs (Merit 82.050, with Catchment cut-offs of 73.225 to 79.875 by state) combine UTME, O'level and Post-UTME scores, so they can't be checked from these results.
- Same model, no tools (Eligible ✓): The UTME combination of English, Mathematics, Physics and Chemistry matches UNILAG's Computer Science requirement. The score of 268 is above UNILAG's published minimum of about 200 for screening. In a single WAEC sitting the candidate has credits in English (C5), Mathematics (B2), Physics (C4), Chemistry (B3) and more, which covers the required five credits including those core subjects. This is based on UNILAG's recent published requirements, as I have not seen a 2026/2027 listing; the actual admission cut-off is competitive and set separately each year.

**C02: UNILAG Computer Science, Further Maths E8.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: Further Mathematics E8 is below the C6 needed for UNILAG Computer Science 2026/2027.
- Same model + Knowledge Base search (Eligible ✗): UNILAG Computer Science needs Mathematics, Physics and one of Chemistry or Biology, plus Use of English. The candidate's UTME subjects (English, Mathematics, Physics, Chemistry) match. Their 268 is above UNILAG's 2026/2027 general cut-off of 200. The O'level result is one WAEC sitting with credits in English (C5), Mathematics (B2), Physics, Chemistry, Biology, Civic Education and Economics. That is more than five credits including English and Mathematics, which satisfies UNILAG's one-sitting rule. Two caveats: the subject-combination entry is labelled UNILAG 2025/2026, and the departmental cut-offs (Computer Science merit 82.050) are aggregate scores that include Post-UTME, so they can't be compared with the raw 268.
- Same model, no tools (Eligible ✗): The UTME combination (English, Mathematics, Physics, Chemistry) matches what UNILAG requires for Computer Science, and 268 is well above the 200 minimum UTME score. In a single WAEC sitting the candidate has credits in English (C5), Mathematics (B2), Physics (C4) and Chemistry (B3), plus further credits in Biology (C6) and Economics (C5). The Further Mathematics E8 is not a credit, but it isn't needed because the other required subjects are covered.

**C03: UNILAG Medicine, Physics credit only in a second sitting.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Medicine and Surgery (2026/2027): your O'level results fall short.
- Same model + Knowledge Base search (Eligible ✗): The UTME subjects (English plus Biology, Chemistry and Physics) match UNILAG's Medicine & Surgery combination, and 301 is above UNILAG's 200 general cut-off for 2026/2027. UNILAG requires five credits at one sitting including English and Mathematics, and the WAEC 2025 sitting alone has six credits (English B2, Maths A1, Biology B2, Chemistry B3, Civic Education A1, Yoruba B3). The Physics D7 isn't a credit, and the NECO Physics B3 can't be combined because UNILAG allows only one sitting. The knowledge base lists no Medicine-specific O'level Physics credit requirement, so none could be checked. The aggregate merit cut-off (83.425) also can't be checked, because it depends on Post-UTME and O'level scores that aren't given.
- Same model, no tools (Eligible ✗): UTME subjects (English, Biology, Chemistry, Physics) match the requirement and the 301 score is comfortably high for Medicine. Across two sittings (WAEC and NECO 2025) the candidate has credits in English (B2), Mathematics (A1), Biology (B2), Chemistry (B3) and Physics (B3 from NECO, offsetting the D7 in WAEC). The two-sitting limit is respected.

**C04: UNN Nursing, Physics credit only in a second sitting.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNN Nursing Science's 2026/2027 requirements, with a few things left to confirm yourself.
- Same model + Knowledge Base search (At risk ✗): The O'level results meet UNN's published rule. There are five credits across two sittings (English C4, Maths C5, Biology B3, Chemistry C6, and Civic Education B3 in the WAEC sitting; Physics C5 in the NECO sitting). UNN allows no more than two sittings and requires an English credit and a science credit. However, the knowledge base gives no UNN Nursing Science UTME subject combination (the UNN entry covers only Mass Communication). The published 2026/2027 Nursing cut-offs (Merit 279; Enugu 256; Abia 255; Anambra 267) are aggregate scores of (UTME + Post-UTME) ÷ 2, and the candidate's Post-UTME score is unknown. The aggregate therefore can't be confirmed, so the candidate may qualify but this can't be verified.
- Same model, no tools (At risk ✗): The UTME subject combination is correct and the O'level credits in English (C4), Mathematics (C5), Biology (B3), Chemistry (C6) and Physics (NECO C5, since the WAEC Physics E8 is a fail) are met across two sittings. However, I can't confirm UNN's 2026/2027 Nursing Science UTME minimum, and the score of 214 may or may not clear it. Whether the combined Physics credit from the NECO sitting is accepted is also not certain.

**C05: LASU Nursing, Chemistry credit from an awaited NECO result.** Expected: At risk.

- Clearance Desk (At risk ✓): At risk: you meet LASU Nursing Science, but your NECO 2026 result is still awaited.
- Same model + Knowledge Base search (At risk ✓): The score of 231 is above LASU's published institutional cut-off of 195 for 2026/2027. That cut-off comes from a blog source, and no Nursing-specific cut-off is published. The knowledge base has no LASU Nursing subject combination or Nursing-specific O'level rules, and it does not state LASU's sittings rule. The Chemistry credit depends on the NECO 2026 result, which is still awaited. The WAEC Chemistry grade is D7, so it counts only if the expected NECO C5 is confirmed and LASU accepts two sittings.
- Same model, no tools (At risk ✓): The UTME subject combination is correct and 231 is above the general minimum, and the two sittings (WAEC 2025 and NECO 2026) are within the limit. However, the WAEC Chemistry grade of D7 is not a credit, so the Chemistry requirement depends on the NECO 2026 result (expected C5), which is still awaited. The Nursing-specific cut-off is also not firmly confirmed.

**C06: UI Medicine, strong single sitting, UTME 290.** Expected: At risk.

- Clearance Desk (At risk ✓): At risk: your subjects and O'levels fit, but UI's minimum UTME score for Medicine isn't confirmed.
- Same model + Knowledge Base search (Eligible ✗): For 2026/2027, UI's Medicine & Surgery UTME combination is English Language, Physics, Chemistry and Biology (entry utme_subject_combinations/ui), and the candidate has exactly that. UI's minimum UTME score for Medicine is 220 (entry cut_off_marks/ui, which cites a blog source for this figure), and the candidate's 290 clears it. The O'level results are WAEC 2025, at one sitting, with six credits including English Language B2 and Mathematics A1. That meets UI's rule of five credits at one sitting with English and Mathematics (entry olevel_requirements/credit_passes_and_sittings). I found no conflicting figures for UI.
- Same model, no tools (Eligible ✗): The UTME combination (English, Physics, Chemistry, Biology) matches the Medicine and Surgery requirement, and a score of 290 is above the published minimum for the course. The single WAEC 2025 sitting has credits or better in English (B2), Mathematics (A1), Physics (B3), Chemistry (B2) and Biology (A1), satisfying the five-credit requirement in one sitting.

**C07: OAU Medicine, UTME 196.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: your UTME score of 196 is below OAU's 200 minimum for Medicine (2026/2027).
- Same model + Knowledge Base search (Not eligible ✓): The candidate's UTME score of 196 is below OAU's general cut-off of 200 for 2026/2027 (`cut_off_marks/oau`). Candidates scoring under 200 do not qualify for OAU Post-UTME screening. The other requirements are met: the UTME subjects are English, Physics, Chemistry and Biology, and the O'level has credits in English, Mathematics, Physics, Chemistry and Biology at one sitting. These match the published Medicine requirements (`utme_subject_combinations/oau/science_technology_health`), but they don't offset the score shortfall.
- Same model, no tools (Not eligible ✓): The UTME subject combination (English, Physics, Chemistry, Biology) is correct, and the single WAEC 2025 sitting has credits in English, Mathematics, Physics, Chemistry and Biology, so the O'level requirement is met. However, OAU's published minimum UTME score for admission screening is 200, and the candidate's 196 is below it. Actual Medicine and Surgery cut-offs are usually much higher still.

**C08: LASU Medicine, UTME 196.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet LASU's 2026/2027 Medicine and Surgery requirements on the checks that can be run.
- Same model + Knowledge Base search (At risk ✗): The score of 196 is above LASU's published 2026/2027 cut-off of 195. That figure comes from a blog source (cut_off_marks/lasu), and no programme-specific cut-off for Medicine and Surgery is published. The O'level results show five credits including English and Mathematics. However, the knowledge base has no LASU sittings rule and no LASU Medicine and Surgery UTME subject combination or O'level subject requirements, so I could not confirm that the Physics, Chemistry, Biology and English UTME combination or the O'level subjects satisfy LASU's rules.
- Same model, no tools (Not eligible ✗): The UTME subjects (English, Physics, Chemistry, Biology) and the single WAEC sitting with credits in English, Mathematics, Physics, Chemistry and Biology meet the O'level and subject requirements for Medicine and Surgery. However, the UTME score of 196 is below LASU's published minimum of 200 for screening, and well below the much higher score Medicine usually needs to be competitive. This is from my recollection of earlier sessions, since I could not check a published 2026/2027 figure.

**C09: UI Computer Science, 5 credits across two sittings.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UI Computer Science (2026/2027): only 5 of the 6 credits needed.
- Same model + Knowledge Base search (Eligible ✗): The UTME subjects (English, Mathematics, Chemistry, Physics) match UI's published Computer Science combination, and 255 is above UI's 200 general cut-off for 2026/2027 (`utme_subject_combinations/ui`, `cut_off_marks/ui`). UI requires five credits at one sitting, including English and Mathematics (`olevel_requirements/credit_passes_and_sittings`). The WAEC 2025 sitting alone has five credits: English C5, Mathematics B3, Physics C4, Geography C6 and Civic Education B2. The NECO sitting is not needed, and the Chemistry D7 in WAEC is not a credit. I found no published Chemistry O'level credit requirement for UI Computer Science, and I did not check whether Civic Education counts as a relevant subject.
- Same model, no tools (Eligible ✗): The UTME combination (English, Mathematics, Physics, Chemistry) fits the Computer Science requirement. The score of 255 is above the usual UI cut-off of about 200. Across two sittings, the candidate has credits in English (WAEC C5), Mathematics (B3), Physics (C4) and Chemistry (NECO C5), plus Geography and Civic Education, which gives at least five credits including the core subjects. This is within the two-sitting limit.

**C10: UNILAG Law with Mathematics as a UTME subject.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Law 2026/2027: your UTME subjects don't fit, though your score and O'levels do.
- Same model + Knowledge Base search (Not eligible ✓): UNILAG's published UTME subject combination for Law is Use of English plus any three Arts or Social Sciences subjects. This candidate offered Mathematics as one of the three, and Mathematics is not listed as accepted for Law. (Social Work and Sociology explicitly accept it, but Law does not.) The combination rests on that reading of the table, and the entry is dated 2025/2026, not 2026/2027. The other checks pass: the score of 271 is above UNILAG's 2026/2027 general cut-off of 200 and the 240+ advisory for Law, and the single WAEC sitting has five or more credits including English and Mathematics.
- Same model, no tools (Not eligible ✓): The published JAMB combination for Law at UNILAG is English Language, Literature in English, and two other Arts or Social Science subjects such as Government, Economics, CRS or History. This candidate's UTME combination uses Mathematics as the fourth subject, which is not an accepted Arts or Social Science subject, so the combination fails. The O'level results (WAEC 2025 with credits in English, Literature, Government and others) and the UTME score of 271 would otherwise be adequate.

**C11: LASU Medicine with a NABTEB result.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet LASU's Medicine and Surgery requirements for 2026/2027, with a few things to confirm yourself.
- Same model + Knowledge Base search (At risk ✗): Some LASU requirements are published and the candidate meets them. The UTME score of 262 is above LASU's 195 cut-off for 2026/2027. The O'level results show six credits (B3 or C4) in one NABTEB sitting, including English and Mathematics, and LASU's baseline is five credits including English and Mathematics in at most two sittings. However, the knowledge base has no LASU Medicine and Surgery subject combination and no programme-specific cut-off or O'level subjects. The 195 cut-off comes from a blog source, not an official LASU document. So the UTME subjects and the Medicine-specific requirements can't be confirmed.
- Same model, no tools (At risk ✗): The UTME subject combination is correct and 262 is above the usual published minimum for Medicine, and the candidate holds credits in English, Mathematics, Physics, Chemistry and Biology in one sitting. However, I can't confirm that LASU accepts NABTEB results for Medicine and Surgery, or that the 2026/2027 requirements are unchanged, so eligibility can't be fully confirmed.

**C12: UNILAG Nursing, English D7.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: your English D7 is below the credit needed for UNILAG Nursing Science (2026/2027).
- Same model + Knowledge Base search (Not eligible ✓): UNILAG requires five O'level credit passes at one sitting, and the KB lists an English Language credit as mandatory. The candidate's English Language grade is D7. The KB doesn't define the credit grades. D7 is below C6, the lowest credit grade, which I'm taking from general knowledge. The other points are fine. The UTME subjects (English, Biology, Chemistry, Physics) match the Nursing combination, which the KB lists only for 2025/2026. The score of 280 is above UNILAG's general UTME threshold of 200, and the candidate has five other credits at a single WAEC sitting. The missing English credit still fails the requirement.
- Same model, no tools (Not eligible ✓): Nursing Science at UNILAG requires credit passes (C6 or better) in English Language, Mathematics, Biology, Chemistry and Physics. The candidate's English Language grade is D7, which is not a credit, and there is no second sitting to make up for it. The UTME subject combination (English, Biology, Chemistry, Physics) is correct and the score of 280 is well above the usual cut-off, but the English result fails a core requirement.

**C13: UNILAG Economics, clean candidate.** Expected: Eligible.

- Clearance Desk (At risk ✗): At risk: you pass every check, but official sources disagree on the extra subjects.
- Same model + Knowledge Base search (Eligible ✓): The candidate's UTME score of 262 is above UNILAG's general 200 cut-off for 2026/2027. The subjects (Use of English, Mathematics, Economics, Government) match UNILAG's Economics combination of Mathematics, Economics and any other subject. The O'level has five or more credits (English C4, Mathematics B3, Economics B2, Government C5, Civic Education B3) in one WAEC sitting, which meets UNILAG's one-sitting rule. Two caveats: the subject combination I found is published for 2025/2026, not 2026/2027. The Economics cut-off of 73.625 merit is an aggregate score that also uses Post-UTME, so it can't be checked from these results.
- Same model, no tools (Eligible ✓): The UTME combination (English, Mathematics, Economics, Government) matches the Economics requirement of the three core subjects plus an accepted social-science subject, and a score of 262 is well above UNILAG's published minimum of about 200. In one WAEC sitting the candidate has six credits, including English (C4), Mathematics (B3), Economics (B2) and Government (C5), which satisfies the five-credit requirement. This is based on my recollection of UNILAG's published requirements, not a fresh check of the 2026/2027 brochure.

**C14: UNILAG Petroleum Engineering.** Expected: Not eligible.

- Clearance Desk (No data ✗): Petroleum Engineering is not in the data for UNILAG, so I can't check it. I only hold these UNILAG courses: Accounting, Computer Science, Economics, Electrical/Electronics Engineering, Law, Mass Communication, Medicine and Surgery, and Nursing Science. I won't guess or swap in another course.
- Same model + Knowledge Base search (Eligible ✗): UNILAG's 2026/2027 general UTME threshold is 200 (cut_off_marks/unilag/overview), so 250 clears it. The UTME subjects match Petroleum & Gas Engineering (Use of English plus Chemistry, Mathematics and Physics), though that combination is published for 2025/2026 and I found no 2026/2027 version (utme_subject_combinations/unilag). The O'level results are five credits at one WAEC sitting, including English C4 and Mathematics B3, which meets UNILAG's one-sitting rule (olevel_requirements/credit_passes_and_sittings). The departmental merit cut-off (75.025) is an aggregate score that also includes Post-UTME, so it can't be checked from these results.
- Same model, no tools (At risk ✗): The O'level results meet the usual requirement of five credits including English, Mathematics, Physics and Chemistry in a single sitting, and the UTME subject combination is correct. However, I can't confirm UNILAG's published 2026/2027 UTME minimum for Petroleum and Gas Engineering. Engineering courses there are highly competitive, so a score of 250 may or may not meet the cut-off.

**C15: UNN Medicine, UTME 165.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNN's Medicine and Surgery requirements for 2026/2027, with a few things to confirm yourself.
- Same model + Knowledge Base search (Not eligible ✗): For 2026/2027, `cut_off_marks/unn` (citing allschool.ng, a blog, not a UNN source) lists Medicine & Surgery at Merit 318, with catchment-state cut-offs from 281 to 316. A UTME score of 165 is far below every one of those figures, even though it clears UNN's general JAMB cut-off of 160. The entry calls the departmental figures 'aggregate' scores but does not clearly explain how they relate to a raw UTME score, so I'm not fully certain how to compare them. On any reading, 165 does not reach 318. The O'level results (WAEC, one sitting, English C4, Mathematics B3 and several science credits) meet UNN's general rule of five credits at no more than two sittings. The knowledge base does not give UNN's UTME subject combination for Medicine, so I could not check that.
- Same model, no tools (At risk ✗): The UTME subject combination (English, Physics, Chemistry, Biology) and the O'level credits in English, Mathematics, Physics, Chemistry and Biology in a single WAEC sitting satisfy the usual requirements. However, the 2026/2027 UTME minimum for Medicine at UNN can't be confirmed, and the commonly cited figure (around 200) is above the candidate's 165. The score is therefore a serious risk, though I can't verify it as a published failure.

