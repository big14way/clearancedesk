# Eval results: run 3 (first three-way run; one keyword-search answer lost to a parser bug, since fixed)

Run 2026-10-03 22:53 UTC · 15 cases · model `claude-sonnet-5-5` · Clearance Desk at https://clearancedesk.vercel.app

Expected verdicts come from `eval/cases.json`. See that file for who set them and the evidence for each.

- **Clearance Desk:** the agent, with both Sanity Context endpoints and the deterministic evaluator.
- **Same model + Knowledge Base search:** the keyword-search baseline. It gets the same prompt, plus `knowledge_base_search`/`knowledge_base_read` on the same Knowledge Base and its outline, but no structured rules and no evaluator.
- **Same model, no tools:** memory only.

| Case | What it tests | Expected | Clearance Desk | + KB search | No tools |
|---|---|---|---|---|---|
| C01 | UNILAG Computer Science, one WAEC sitting with Further Maths | Eligible | Eligible ✓ | At risk ✗ | Eligible ✓ |
| C02 | UNILAG Computer Science, Further Maths E8 | Not eligible | Not eligible ✓ | Eligible ✗ | Eligible ✗ |
| C03 | UNILAG Medicine, Physics credit only in a second sitting | Not eligible | Not eligible ✓ | At risk ✗ | Eligible ✗ |
| C04 | UNN Nursing, Physics credit only in a second sitting | Eligible | Eligible ✓ | At risk ✗ | Eligible ✓ |
| C05 | LASU Nursing, Chemistry credit from an awaited NECO result | At risk | At risk ✓ | At risk ✓ | At risk ✓ |
| C06 | UI Medicine, strong single sitting, UTME 290 | At risk | At risk ✓ | Eligible ✗ | Eligible ✗ |
| C07 | OAU Medicine, UTME 196 | Not eligible | Not eligible ✓ | Not eligible ✓ | Not eligible ✓ |
| C08 | LASU Medicine, UTME 196 | Eligible | Eligible ✓ | At risk ✗ | At risk ✗ |
| C09 | UI Computer Science, 5 credits across two sittings | Not eligible | Not eligible ✓ | At risk ✗ | Eligible ✗ |
| C10 | UNILAG Law with Mathematics as a UTME subject | Not eligible | Not eligible ✓ | Error ✗ | Not eligible ✓ |
| C11 | LASU Medicine with a NABTEB result | Eligible | Eligible ✓ | At risk ✗ | Eligible ✓ |
| C12 | UNILAG Nursing, English D7 | Not eligible | Not eligible ✓ | Not eligible ✓ | Not eligible ✓ |
| C13 | UNILAG Economics, clean candidate | Eligible | At risk ✗ | Eligible ✓ | Eligible ✓ |
| C14 | UNILAG Petroleum Engineering | Not eligible | No data ✗ | Eligible ✗ | Eligible ✗ |
| C15 | UNN Medicine, UTME 165 | Eligible | Eligible ✓ | Not eligible ✗ | At risk ✗ |

## Totals

| | Clearance Desk | Same model + Knowledge Base search | Same model, no tools |
|---|---|---|---|
| Correct | **13 / 15** | **4 / 15** | **8 / 15** |
| Said "Eligible" to a candidate who fails a rule | 0 | 2 | 4 |
| Declined ("no data") instead of answering | 1 | 0 | 0 |
| Median time | 14 s | 12 s | 6 s |

## Every answer

**C01: UNILAG Computer Science, one WAEC sitting with Further Maths.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNILAG's 2026/2027 Computer Science requirements on subjects, score and O'levels.
- Same model + Knowledge Base search (At risk ✗): The candidate meets everything that can be checked. The 268 UTME score is above UNILAG's 2026/2027 general cut-off of 200. The English, Mathematics, Physics and Chemistry subjects fit the listed Computer Science combination (Mathematics, Physics and Chemistry or Biology, plus English). The WAEC 2025 result is a single sitting with at least five credits, including English C5 and Mathematics B2. Two things can't be confirmed. The subject combination I found is from UNILAG's 2025/2026 document, not a 2026/2027 one. The 2026/2027 Computer Science cut-offs (Merit 82.050, catchment 73.225–79.875) are aggregate scores, not raw UTME scores, so 268 can't be compared with them.
- Same model, no tools (Eligible ✓): The UTME combination of English, Mathematics, Physics and Chemistry matches the Computer Science requirement. The single WAEC 2025 sitting has credits in English (C5), Mathematics (B2), Physics (C4) and Chemistry (B3), plus Further Mathematics (B3), which covers the required O'level subjects. The UTME score of 268 is above UNILAG's published minimum of about 200 for screening. Actual admission still depends on the competitive cut-off, which is not a published minimum.

**C02: UNILAG Computer Science, Further Maths E8.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for 2026/2027: Further Maths is E8, but UNILAG Computer Science needs C6 or better.
- Same model + Knowledge Base search (Eligible ✗): The UTME subjects (English, Mathematics, Physics, Chemistry) fit UNILAG's Computer Science combination of Mathematics, Physics and one of Chemistry or Biology. That combination comes from the UNILAG 2025/2026 document, and the 2026/2027 combination was not in the knowledge base. A score of 268 is above UNILAG's 2026/2027 general cut-off of 200. The O'level result is a single WAEC sitting with at least five credits (C5 or better) in English, Mathematics, Physics, Chemistry, Civic Education, Economics and Biology, which meets the one-sitting rule. The Computer Science aggregate cut-offs (Merit 82.050) depend on Post-UTME and O'level scoring, so they can't be checked from these results.
- Same model, no tools (Eligible ✗): The UTME combination (English, Mathematics, Physics, Chemistry) matches the Computer Science requirement. The WAEC 2025 single sitting has credits in English (C5), Mathematics (B2), Physics (C4) and Chemistry (B3), plus further credits in Biology, Civic Education and Economics, so the five-credit requirement is met. The UTME score of 268 is well above the published minimum. The E8 in Further Mathematics is not required.

**C03: UNILAG Medicine, Physics credit only in a second sitting.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Medicine and Surgery 2026/2027: your O'level results fall short.
- Same model + Knowledge Base search (At risk ✗): The UTME subjects (English, Biology, Chemistry, Physics) match UNILAG's published combination for Medicine & Surgery. UNILAG requires five O'level credits at one sitting, including English and Mathematics. The WAEC 2025 sitting alone has six credits (English B2, Maths A1, Biology B2, Chemistry B3, Civic Education A1, Yoruba B3). The Physics D7 can't be rescued by the NECO Physics B3, because UNILAG does not allow combining sittings. I found no UNILAG-specific O'level Physics requirement for Medicine in the knowledge base. UI and OAU list Physics for Medicine, but that does not confirm UNILAG's rule. UNILAG's 2026/2027 Medicine cut-off is published only as an aggregate (merit 83.425), so it can't be checked against a raw UTME score of 301.
- Same model, no tools (Eligible ✗): UTME subjects (English, Biology, Chemistry, Physics) match the Medicine and Surgery requirement and the score of 301 is well above the minimum. Across two sittings (WAEC and NECO 2025), the candidate has credits in English, Mathematics, Biology and Chemistry from WAEC and a Physics credit (B3) from NECO, which offsets the WAEC Physics D7. Two sittings is within the permitted limit.

**C04: UNN Nursing, Physics credit only in a second sitting.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNN's Nursing Science requirements for 2026/2027, with a few things to confirm yourself.
- Same model + Knowledge Base search (At risk ✗): The O'level results meet UNN's published rule. Across two sittings (the maximum allowed) the candidate has five credits: English C4, Mathematics C5, Biology B3, Chemistry C6 and Civic Education B3. That includes English and a science subject. The UTME score of 214 is above UNN's general JAMB minimum of 160 (2026/2027). However, the KB has no published UTME subject combination for Nursing Science at UNN. Its Nursing cut-offs (Merit 279; catchment 256–267) are aggregate scores from a blog (allschool.ng), not raw UTME scores, and they are above 214. Whether 214 reaches them depends on the Post-UTME result, which can't be checked here, so I can't confirm eligibility.
- Same model, no tools (Eligible ✓): UTME subjects (English, Biology, Chemistry, Physics) match the Nursing Science requirement, and 214 is above the published minimum of 200. Across two sittings the candidate has credits in English (C4), Mathematics (C5), Biology (B3), Chemistry (C6) and Physics (C5 in NECO, replacing the WAEC E8). Actual admission is competitive and the departmental cut-off may be higher, but that is not a published requirement that can be checked here.

**C05: LASU Nursing, Chemistry credit from an awaited NECO result.** Expected: At risk.

- Clearance Desk (At risk ✓): At risk: you meet LASU Nursing Science rules, but your NECO 2026 result is still awaited.
- Same model + Knowledge Base search (At risk ✓): The score of 231 is above LASU's published 2026/2027 cut-off of 195, which comes from a blog source. The WAEC sitting alone has five or more credits, including English C4 and Maths C6. Chemistry is D7 in WAEC, and the credit C5 exists only as an expected NECO 2026 result that is still awaited. The knowledge base has no LASU Nursing Science subject combination, no LASU sittings rule and no programme-specific O'level requirements, so I can't confirm these.
- Same model, no tools (At risk ✓): The UTME subject combination is correct and 231 is above the usual LASU Nursing Science cut-off. The WAEC 2025 sitting has credits in English, Mathematics, Biology and Physics, but Chemistry is D7, so the Chemistry credit depends on the NECO 2026 result, which is still awaited (expected C5). If that C5 is confirmed, the two sittings together would meet the credit requirements, but until then it cannot be confirmed.

**C06: UI Medicine, strong single sitting, UTME 290.** Expected: At risk.

- Clearance Desk (At risk ✓): At risk: your subjects and O'levels fit, but UI's minimum UTME score isn't confirmed in our data.
- Same model + Knowledge Base search (Eligible ✗): For 2026/2027, UI Medicine & Surgery needs English Language, Physics, Chemistry and Biology in UTME (utme_subject_combinations/ui). The candidate has all four. Their UTME score of 290 is above UI's 220 minimum for Medicine (cut_off_marks/ui). The O'level rule is five credits including English and Mathematics at one sitting (olevel_requirements/credit_passes_and_sittings). The candidate has six credits (B2, A1, B3, B2, A1, B2) from a single WAEC 2025 sitting, which includes English, Mathematics, Physics, Chemistry and Biology.
- Same model, no tools (Eligible ✗): The UTME combination (English, Physics, Chemistry, Biology) matches the Medicine and Surgery requirement, and a score of 290 is above UI's published departmental cut-off (about 280). The single WAEC 2025 sitting has credits in English, Mathematics, Physics, Chemistry and Biology, meeting the five-credit O'level requirement in one sitting.

**C07: OAU Medicine, UTME 196.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible: your UTME score of 196 is below OAU's minimum of 200 for 2026/2027.
- Same model + Knowledge Base search (Not eligible ✓): For the 2026/2027 session, the OAU cut-off entry (`cut_off_marks/oau`) gives a general UTME cut-off of 200, and candidates below it can't take Post-UTME screening. This candidate scored 196. That 200 figure comes from a blog source, not an official OAU publication, so it is worth confirming on the OAU portal. The other requirements are met: the UTME subjects (English, Physics, Chemistry, Biology) match the Medicine combination, and the single WAEC sitting has credits in English, Mathematics, Physics, Chemistry and Biology.
- Same model, no tools (Not eligible ✓): The UTME subjects (English, Physics, Chemistry, Biology) and the single WAEC sitting with credits in English, Mathematics, Physics, Chemistry and Biology meet the O'level and subject requirements. However, the UTME score of 196 is below the published minimum of 200 that OAU has set for Medicine and Surgery in recent sessions. The 2026/2027 figure was not confirmed, so this rests on prior sessions' published minimum.

**C08: LASU Medicine, UTME 196.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet LASU Medicine and Surgery's 2026/2027 requirements on subjects, score and O'levels.
- Same model + Knowledge Base search (At risk ✗): The score of 196 meets LASU's published institutional cut-off of 195 for 2026/2027 (cut_off_marks/lasu). That figure comes from a blog source, and LASU has published no Medicine-specific cut-off. The O'level results show five credits including English and Mathematics in one sitting, but the knowledge base has no LASU Medicine and Surgery subject combination and no LASU sittings or programme credit rule (olevel_requirements/credit_passes_and_sittings), so those can't be confirmed.
- Same model, no tools (At risk ✗): The candidate meets the subject combination (English, Physics, Chemistry, Biology) and the O'level requirement. All five core subjects, including English and Mathematics, are credits at a single WAEC 2025 sitting. However, the UTME minimum for Medicine and Surgery at LASU for 2026/2027 is not clearly published, and sources disagree. Competitive Medicine cut-offs at LASU are often around 200 or higher, so a score of 196 may fall short, and this can't be confirmed.

**C09: UI Computer Science, 5 credits across two sittings.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UI Computer Science (2026/2027): only 5 of the 6 O'level credits needed.
- Same model + Knowledge Base search (At risk ✗): The UTME subjects (English, Mathematics, Chemistry, Physics) match UI's Computer Science combination, and 255 is above UI's 200 general cut-off for 2026/2027 (`utme_subject_combinations/ui`, `cut_off_marks/ui`). The sittings rule is the problem. `olevel_requirements/credit_passes_and_sittings` says UI needs five credits at one sitting. The UI Direct Entry entries (`direct_entry/ui/applied`, `direct_entry/overview`) say five credits at one sitting or six at two, and require Chemistry and Physics credits plus one other science. The Chemistry credit (NECO C5) is only in the second sitting, because the WAEC Chemistry grade is D7. Under the stricter one-sitting rule this fails, and I can't confirm which rule applies, so the stricter rule is the safe one to plan around.
- Same model, no tools (Eligible ✗): The UTME subjects (English, Mathematics, Physics, Chemistry) match the Computer Science combination, and 255 is above the University of Ibadan's usual cut-off of about 200. Across the two sittings, the candidate has credits in English (C5), Mathematics (B3), Physics (C4) and Chemistry (NECO C5, which replaces the WAEC D7), plus Geography and Civic Education, which meets the five-credit requirement. Two sittings are accepted, so the requirements are met. This relies on the 2026/2027 requirements being unchanged from the earlier published ones.

**C10: UNILAG Law with Mathematics as a UTME subject.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Law 2026/2027: your UTME subjects are one short.
- Same model + Knowledge Base search (Error ✗): Unexpected non-whitespace character after JSON at position 882 (line 3 column 1)
- Same model, no tools (Not eligible ✓): JAMB's UTME combination for Law is Use of English and Literature in English plus two other arts or social science subjects (e.g. Government, CRS, Economics), but this candidate registered Mathematics as one of the four subjects, so only Government counts as the second extra subject. The O'level results (English B3, Literature B2, Government B3, plus other credits in a single sitting) and the 271 UTME score would otherwise be sufficient.

**C11: LASU Medicine with a NABTEB result.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet LASU's Medicine and Surgery requirements for 2026/2027, with a few things to confirm.
- Same model + Knowledge Base search (At risk ✗): The score of 262 is above LASU's published 2026/2027 cut-off of 195 (cut_off_marks/lasu). That cut-off comes from a blog source, and no Medicine-specific cut-off is published. The O'level results show five credits including English and Mathematics at one sitting (NABTEB). That fits LASU's general rule of five credits including English and Mathematics at no more than two sittings (direct_entry/lasu). However, I found no LASU-specific UTME subject combination for Medicine and Surgery and no programme-specific O'level subject requirements, so those can't be confirmed.
- Same model, no tools (Eligible ✓): UTME subjects (English, Physics, Chemistry, Biology) match the Medicine and Surgery requirement, and the O'level shows credits in English, Mathematics, Physics, Chemistry and Biology in a single NABTEB sitting. The UTME score of 262 is above the published minimum for the course. The competitive cut-off may be higher in practice, but that is not a published requirement.

**C12: UNILAG Nursing, English D7.** Expected: Not eligible.

- Clearance Desk (Not eligible ✓): Not eligible for UNILAG Nursing Science 2026/2027: English is D7 and you have only 4 credits.
- Same model + Knowledge Base search (Not eligible ✓): UNILAG requires five O'level credits at one sitting, and these must include English Language and Mathematics (olevel_requirements/credit_passes_and_sittings). The candidate has D7 in English Language, which is not a credit, so the English requirement fails. The UTME score of 280 is above UNILAG's general 200 threshold, and the subjects (English, Biology, Chemistry, Physics) match the Nursing combination listed in utme_subject_combinations/unilag, which is dated 2025/2026. Neither of those can offset the English failure for the 2026/2027 session.
- Same model, no tools (Not eligible ✓): Nursing Science at UNILAG requires O'level credits (C6 or better) in English Language, Mathematics, Biology, Chemistry and Physics in no more than two sittings. The candidate's English Language grade is D7, which is not a credit, and no second sitting is shown to cover it. The UTME subject combination (English, Biology, Chemistry, Physics) is correct, but the English failure means a published requirement is not met.

**C13: UNILAG Economics, clean candidate.** Expected: Eligible.

- Clearance Desk (At risk ✗): UNILAG Economics 2026/2027: you pass every check, but official sources disagree, so it's at risk.
- Same model + Knowledge Base search (Eligible ✓): The UTME score of 262 is above UNILAG's general 2026/2027 cut-off of 200 (cut_off_marks/unilag/overview). The subjects English, Mathematics, Economics and Government satisfy the Economics combination of Mathematics, Economics and any other subject (utme_subject_combinations/unilag). That entry is labelled 2025/2026, and I found no 2026/2027 version. The O'level result is one WAEC sitting with six credits (English C4, Mathematics B3, Economics B2, Government C5, Civic Education B3, plus Biology C6). That meets UNILAG's rule of five credits at one sitting including English and Mathematics (olevel_requirements/credit_passes_and_sittings). The Economics merit cut-off of 73.625 is an aggregate that also includes the O'level and Post-UTME scores, so it can't be checked against the raw UTME score.
- Same model, no tools (Eligible ✓): The UTME combination (English, Mathematics, Economics, Government) matches the Economics requirement of English, Mathematics, Economics and one other social science subject. The O'level result is a single WAEC sitting with six credits, including English (C4), Mathematics (B3), Economics (B2) and Government (C5), so the five-credit requirement is met. The UTME score of 262 is above the published minimum of 200 and is well above the usual UNILAG cut-off range, though I could not verify the current cut-off figure.

**C14: UNILAG Petroleum Engineering.** Expected: Not eligible.

- Clearance Desk (No data ✗): Petroleum Engineering isn't in the data for UNILAG, so I can't check it. The courses held for UNILAG are: Accounting, Computer Science, Economics, Electrical/Electronics Engineering, Law, Mass Communication, Medicine and Surgery, and Nursing Science. I did not check a substitute course. Please confirm the requirements for Petroleum Engineering on UNILAG's official admission page.
- Same model + Knowledge Base search (Eligible ✗): The UTME subjects match UNILAG's Petroleum & Gas Engineering combination (Use of English plus Chemistry, Mathematics and Physics). The UTME score of 250 is above UNILAG's general 200 cut-off for 2026/2027. The O'level result is five credits (C6 or better) at one WAEC sitting, including English C4 and Mathematics B3, which meets UNILAG's one-sitting, five-credit rule. The departmental merit cut-off (75.025) is an aggregate that includes Post-UTME, so it can't be checked from these results. Also, the subject combination entry is labelled 2025/2026, not 2026/2027.
- Same model, no tools (Eligible ✗): The UTME combination (English, Mathematics, Physics, Chemistry) matches what Petroleum Engineering at UNILAG requires, and a score of 250 is above the usual 200 minimum. The single WAEC 2025 sitting has credits (C6 or better) in English, Mathematics, Physics and Chemistry, plus a fifth credit in Biology. Competitive aggregate cut-offs and the 2026/2027 specifics may vary, but every checkable published requirement is met.

**C15: UNN Medicine, UTME 165.** Expected: Eligible.

- Clearance Desk (Eligible ✓): You meet UNN Medicine and Surgery's 2026/2027 requirements, but some checks are yours to confirm.
- Same model + Knowledge Base search (Not eligible ✗): The UNN 2026/2027 cut-off for Medicine & Surgery is listed as 318 for Merit, and 316 or lower for the catchment states. The candidate's UTME score of 165 is far below all of these. It only clears the general UNN JAMB minimum of 160 (cut_off_marks/unn). The O'level results (5+ credits at one sitting, with English Language and a science subject) meet UNN's general rule (olevel_requirements/credit_passes_and_sittings). The knowledge base doesn't give UNN's Medicine-specific subject combination, so I couldn't check that. The cut-off table is from a blog (allschool.ng), not an official UNN source, and it is labelled as aggregate scores, so the 318 figure is not fully clear. Even so, 165 doesn't come close.
- Same model, no tools (At risk ✗): The UTME subjects (English, Physics, Chemistry, Biology) and the O'level credits in English, Mathematics, Physics, Chemistry and Biology in a single sitting match what UNN has required for Medicine and Surgery. However, the 2026/2027 published minimum UTME score for this course can't be confirmed, and 165 is very likely below UNN's effective Medicine cut-off, which has historically been far higher. The candidate may qualify on paper but is at serious risk on score.

