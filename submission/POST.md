---
title: "Clearance Desk: an agent that catches the admission you'd lose at clearance"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
cover_image: https://raw.githubusercontent.com/big14way/clearancedesk/main/submission/screenshots/post/00-cover.png
---

*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

In Nigeria you can score well in JAMB's UTME, get offered admission, and still be turned away at **clearance**. Clearance is when the university checks your O'level results against the course's rules. The mistakes are small and specific:
- a Physics credit that came from a second sitting when the course allows only one
- no Further Maths credit for UNILAG Computer Science
- Mathematics counted as one of your UTME subjects for Law

One wrong subject costs a whole year.

**Clearance Desk** is an agent for applicants (and the parents and teachers helping them). It checks your UTME subjects, UTME score and O'level sittings against the *published* 2026/2027 requirements of UNILAG, UI, OAU, UNN and LASU, before you apply. For each course it tells you **Eligible**, **At risk** or **Not eligible**. It explains why in plain English, quotes the admission policy, and links every source.

![A "Not eligible" verdict: strong UTME, but UNILAG Medicine allows one sitting](https://raw.githubusercontent.com/big14way/clearancedesk/main/submission/screenshots/post/02-rejected-card-top.png)

The core design rule: **the model finds and explains; deterministic code judges.** Claude never decides a verdict. It finds the right rules through Sanity Context, a small TypeScript evaluator checks them, and Claude explains the result using the Knowledge Base.

## Demo

**Live: https://clearancedesk.vercel.app**. No login, and it works on a phone. Tap one of the three **sample candidates** at the top to see each verdict in one tap. Each takes 15–40 seconds while the agent works.

<!-- TODO before publishing: upload submission/demo/clearance-desk-demo.mp4 to YouTube (unlisted is fine) and paste its URL here. -->
{% embed https://www.youtube.com/watch?v=VIDEO_ID %}

In the 84-second video:
1. Chioma (UTME 301) checks Medicine at UNILAG and gets **Not eligible**: UNILAG allows one sitting, and her Physics credit is from a second one.
2. With the *same* results, UNN Nursing (two sittings allowed) gives **Eligible**.
3. Then "Show courses I qualify for" checks 10 courses at once.
4. Finally, the "How I got this answer" trace.

## Code

{% embed https://github.com/big14way/clearancedesk %}

The repo has:
- the Studio schema
- the source-traced data pipeline
- the evaluator, with 47 unit tests
- the agent and the Next.js app
- the eval
- an honest [build log](https://github.com/big14way/clearancedesk/blob/main/BUILD_LOG.md) of every wrong turn

## How I Used Sanity

### 1. Admission rules as structured content

Requirements live in a Sanity dataset as data a program can check, not as prose. There are five document types: `source`, `subject`, `institution`, `programme` and `requirement`. A `requirement` holds one programme's rules for one session:

| Field | Why it's data, not text |
|---|---|
| `utmeCompulsory`, `utmeChoices` (`{pick: 1, from: [subject refs]}`) | "English, Maths, Physics + Chemistry *or* Biology" becomes a set problem the code can solve, without guessing from a sentence |
| `olevelCompulsory` with a `minGrade` per subject, plus `olevelChoices` | Further Maths at UNILAG CS is just one more compulsory subject |
| `olevelMinCredits`, `olevelMinCreditsCombined`, `olevelMaxSittings`, `olevelAcceptedExams` | "Five credits at one sitting, or six at two" (UI) can only be checked if it's modelled |
| `utmeMinScore` (nullable) | UI publishes no 2026/27 minimum, so `null` says "unknown", not 0 |
| `citations[]` (a `source` reference plus a locator such as "p. 23, COMPUTER SCIENCE row") | Every rule traces to a page you can open |
| `verificationStatus` + `conflictNote` | When JAMB's brochure and the university disagree, I store the stricter rule and explain both |

Subjects are referenced by `_id`, with aliases, so "Use of English" vs "English Language" can't break a match.

The dataset has 34 requirements across 5 universities. 13 are verified field by field against their sources, and 21 are marked `conflicting` because official sources really do disagree, which is the whole problem. All of it is built from **57 saved sources (51 official)**: JAMB's IBASS brochure API, JAMB's brochure PDFs, and each university's 2026 notices.

### 2. Two Sanity Context endpoints, and why there are two

A Context MCP endpoint serves one kind of source: if you attach a dataset and a Knowledge Base together, the dataset wins and the KB is silently ignored. So the agent connects to two endpoints and prefixes their tools:

| Endpoint | Source | Tools the agent uses |
|---|---|---|
| `clearance-rules` | dataset `cynv9mfk.production`, with a GROQ filter to the 5 types | `rules_groq_query`, `rules_schema_explorer` |
| `clearance-policy` | the Knowledge Base | `policy_knowledge_base_read`, `policy_knowledge_base_search` |

Following Sanity's own pattern, both endpoints' `initial_context` is fetched over HTTP and put into the system prompt. The agent starts out knowing the schema and the KB outline without spending a tool call.

Each endpoint also has **Instructions**. For the rules endpoint, the instructions say to:
- match subjects by `_id`, never by name
- treat choice groups as "pick N"
- always return `verificationStatus`, `conflictNote` and citations
- never decide eligibility itself, and instead pass requirement `_id`s to the evaluator

### 3. What the agent actually does

One loop (Vercel AI SDK 6 + Claude Sonnet 5.5):

1. **`rules_groq_query`** finds the requirement documents. In check mode that's the programme's requirement. In explore mode the model writes GROQ like `count(utmeCompulsory[@._ref in [...your UTME subjects]]) == count(utmeCompulsory)`.
2. **`evaluate_eligibility`**, a local tool, loads those documents and runs the evaluator against your results, which the server holds so the model can never retype them. It checks:
   - UTME subjects, using bipartite matching for choice groups
   - the UTME score
   - every combination of your sittings up to the course's limit
   - credits, accepted exams and awaited results
3. **`policy_knowledge_base_read`** reads the KB entries behind each failed or uncertain check, in one call.
4. **`submit_verdict`** is a tool with no `execute`, so calling it ends the loop. The model's explanation is merged with the evaluator's verdicts.

Some guarantees are enforced in code, not just in the prompt:
- a policy note is dropped unless its KB path was actually read in that run
- check mode can't evaluate a different course
- if the model never finishes, you still get the exact verdicts

Every answer ships with its trace:

![The trace: GROQ via clearance-rules, deterministic checks, KB entries via clearance-policy](https://raw.githubusercontent.com/big14way/clearancedesk/main/submission/screenshots/post/03-trace-phone.png)

### 4. The Knowledge Base

The rules say *what*; the Knowledge Base says *why it matters and what to do*: cut-off marks, Post-UTME screening, awaiting-result windows, upload deadlines, sitting rules. I built it from **32 sources: 26 official** (JAMB, plus all five universities' notices and requirement PDFs) and **6 blogs**. The blogs are in deliberately, so Context would surface where they disagree with official sources.

Context found **7 conflicts**. I resolved 6 and dismissed 1 as a false conflict. Each resolution became a standing instruction. For example:

- **LASU's 195:** a blog called it a "cut-off mark"; LASU's own notices say "a minimum of 195 marks". Official wording won.
- **UNILAG sittings:** UNILAG requires five O'level credits *at one sitting only*. This is the rule behind the demo's "Not eligible".
- **UNILAG's O'level upload deadline:** the extension notice (Monday, 24 August 2026) beats the original date.
- **OAU English:** an OAU page says "a pass at O-Level … in English Language". I kept the stricter reading, a full credit, because a pass would get a candidate rejected if OAU means a credit pass.
- **UNILAG's lowest merit cut-off:** Education Economics (49.65), not Meteorology as an entry claimed.

![Context found 7 conflicts](https://raw.githubusercontent.com/big14way/clearancedesk/main/submission/screenshots/02-kb-issues-before.jpg)

![Conflict review: blog vs official LASU notice](https://raw.githubusercontent.com/big14way/clearancedesk/main/submission/screenshots/03-conflict1-lasu-195-before.jpg)

I wrote 4 instructions by hand:
1. Official JAMB sources outrank blogs.
2. A university's own published requirement is ground truth over summaries.
3. A rule for what an entry must do when JAMB's brochure and a university's own requirement disagree.
4. Always name the admission session.

![10 instructions: 4 manual, 6 from resolved issues](https://raw.githubusercontent.com/big14way/clearancedesk/main/submission/screenshots/19-kb-instructions-10-rules.jpg)

### 5. Does the structure actually matter? The eval

I wrote 15 cases full of traps: Further Maths, sittings, UI's "6 credits at two sittings", NABTEB, a UTME score of 196 against minimums of 195 and 200, a course outside the data. An **independent agent that could only read the original source files** set the expected verdict for each, with quoted evidence, and couldn't see my dataset or code. I ran every case through Clearance Desk on production and through **the same model with no tools**. The no-tools model got *more* thinking time.

| | Clearance Desk | Same model, no tools |
|---|---|---|
| Correct | **13 / 15** | 7 / 15 |
| Told a candidate who fails a published rule "Eligible" | **0** | 3 |
| Verdicts that changed between two identical runs | 1 (a fixed bug) | 5 |

The no-tools model told three candidates they were fine when they'd be rejected at clearance. It missed UNILAG CS's Further Maths, UNILAG Medicine's one-sitting rule, and UI's six-credit rule.

The eval also caught **my own data bug**. LASU's sources only ever say "SSCE (or equivalent)", but I had encoded that as WAEC/NECO, so a NABTEB candidate was wrongly rejected. Run 1 scored 12/15. I fixed the data, added a regression test, and re-ran.

The two remaining misses are deliberate:
- Clearance Desk marks every requirement with conflicting official sources as "At risk", even when the candidate meets both versions.
- It says "no data" for a course outside its data instead of guessing.

[Full results and every answer](https://github.com/big14way/clearancedesk/blob/main/eval/results.md)

## Sanity Project Details

- **Project ID:** `cynv9mfk` · **Dataset:** `production` (public)
- **Public dataset query (every requirement):** [`*[_type=="requirement"]{_id,session,verificationStatus}`](https://cynv9mfk.api.sanity.io/v2026-09-01/data/query/production?query=*%5B_type%3D%3D%22requirement%22%5D%7B_id%2Csession%2CverificationStatus%7D)
- Live coverage counts are on the [About page](https://clearancedesk.vercel.app/about).

![Architecture](https://raw.githubusercontent.com/big14way/clearancedesk/main/submission/screenshots/post/05-architecture.png)

## Agent Session

The whole thing was built with Claude Code, phase by phase. That covered:
- the schema and the source-traced data pipeline
- setting up the Knowledge Base and both Context endpoints, through the browser
- the evaluator and the agent
- the UI, the deploy and the eval

The most interesting slice is the eval run that caught my LASU data bug, plus the guard that stops the model's malformed final answers from losing the explanation.

<!-- TODO before publishing: upload submission/agent-session/clearance-desk-session.redacted.jsonl at https://dev.to/agent_sessions/new, click "Make Public", and paste the embed here. -->

## Limitations

- **Coverage:** 5 universities, 34 programmes, one session (2026/2027), UTME entry only. Direct Entry, Post-UTME scores, aggregate scores and catchment quotas aren't calculated, and meeting the minimum never guarantees admission.
- **Conflicts:** 21 of 34 requirements have official sources that disagree. Clearance Desk stores the stricter rule and says "At risk", which can be over-cautious, as eval case C13 shows.
- **Unpublished minimums:** UI publishes no 2026/27 UTME minimum, so a UI course can never come out plain "Eligible".
- **Unchecked conditions:** age, first choice and upload deadlines can't be checked from results. They're listed as "check these yourself". Cambridge O'Level isn't modelled.
- **Explanations:** the verdict comes from code, but the explanation comes from a model. It occasionally adds generic advice no source states, which the eval and the build log both note.
- **The Knowledge Base is in beta** (up to 150 documents). This one uses 32 sources.
