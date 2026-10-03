# BUILD_LOG.md — Clearance Desk

Honest build journal: what was tried, what broke, how it was fixed. Times are WAT.

## 2026-10-03 — Phase 1: scaffold, Studio, schema

- Initialised the repo; renamed the spec file to `BUILD_SPEC.md` to match the planned layout.
- `.gitignore` covers `node_modules`, `.env*` (except `.env.example`), `data/raw/`, `.vercel`, `.next`, `dist`, `.sanity`.
- Installed the Sanity Context skills (`create-agent-with-sanity-context`, `dial-your-context`, `shape-your-agent`) into `.claude/skills/`. Used `--skill '*' --agent claude-code -y` instead of the spec's `--all`: `--all` means *all agents*, which would have written skill folders for every supported AI editor into the repo.
- `create-next-app@latest` gave Next.js 16.3.8 / React 19.2.8 / Tailwind 4. Its `npm install` took ~5 min on this connection. It also writes `AGENTS.md` warning that Next 16 APIs differ from older docs — read `node_modules/next/dist/docs/` before writing route code in Phase 5.
- `web/.gitignore` (from create-next-app) ignores `.env*`, which would have hidden `.env.example`; added `!.env.example`.
- `web` production build passes on the stock scaffold.
- Sanity: project **`cynv9mfk`** ("clearance desk", org `oq5re65ki`) already existed with a **public** `production` dataset, so it was reused rather than creating a second project.
- `sanity login` in unattended mode failed with *"Multiple login providers available: google, github, sanity. Use `--provider`"*. Read the account's provider from `api.sanity.io/…/users/me` in the signed-in browser (GitHub) and re-ran `sanity login --provider github --no-open`, then approved the printed URL in Chrome.
- Labs: enabled **Context** for the organisation. The Labs page shows no separate "Knowledge Bases" toggle (the spec expected two); the KB docs still say "enable from Labs", so this gets confirmed in the Context app in Phase 3.
- Studio scaffolded with `npm create sanity@latest -- -y --project cynv9mfk --dataset production --template clean --typescript --output-path studio --no-git --no-mcp --no-skills`. `--no-git` stops a nested repo; `--no-mcp`/`--no-skills` stop it editing global AI-editor config. Got **`sanity@^6.17.0`** (spec needs ≥ 5.1.0 ✓) and Sanity CLI 8.13.1.
- Schema: 5 document types (`requirement`, `programme`, `institution`, `subject`, `source`) + 3 objects (`citation`, `gradedSubject`, `subjectChoice`), every field described. Document-level validation on `requirement` (UTME compulsory + Σ choice picks = 4; `conflictNote` required when `conflicting`). Extra checks: `pick ≤ from.length`, `lastCutoff` needs both score and session, unique subject refs.
- Bug: `tsc` rejected `value.from.length` in the `subjectChoice` custom validator (`value` is typed `{}`); typed the validator argument explicitly.
- Bug (found by opening the form in Chrome): `utme` was the default field group, which hid `programme` and `session` until you clicked "All fields". Removed `default: true` so the form opens on All fields.
- `sanity schema validate`: 0 errors / 0 warnings. `sanity schema deploy`: deployed `_.schemas.default` containing all 8 types (checked via `sanity schema list --json`).
- Studio dev server ran on :3333 and rendered the structure (Requirements → All / Verified / Unverified / Conflicting, then Programmes, Institutions, Subjects, Sources).
- Public query endpoint works with no token: `count(*[!(_id in path("_.**"))])` → `0` (dataset still empty, as expected before Phase 2).
- `web/.env.local` created from `.env.example` with project/org IDs and endpoint URLs filled in; token and API key left blank for the human.
- **Near-miss, secret:** the pre-commit grep (rule 2) caught a real `SANITY_ORGANIZATION_TOKEN` in `web/.env.example`, the one env file that *is* committed. It had been pasted there instead of `.env.local`. Moved it to the gitignored `web/.env.local`, blanked it in the example, and re-ran the scan clean before committing. The pre-commit grep earned its place.
- `.claude/skills/` is gitignored: the `create-agent-with-sanity-context` skill ships a whole example e-commerce Next.js app under `references/`, which would clutter the repo. `skills-lock.json` is committed so the skills can be restored.

## 2026-10-03 — Phase 2: data

**Human step delegated.** The human asked Claude to do the 🧍 source-collection and verification steps (via terminal + Chrome). Everything below was gathered by Claude and research subagents; nothing comes from model memory.

- **Found JAMB's brochure is an API.** `ibass.jamb.gov.ng/brochure` is a React app. Its bundle exposed `https://ibass-api.jamb.gov.ng/api` with `POST /ibass/institutions` and `POST /ibass/institution/programmes/{id}`. Each programme returns `subjects` (UTME), `utme_requirements` (O'level), `remarks` and `updated_at`. `scripts/fetch-jamb-brochure.ts` saves the full brochure for each institution to `data/raw/jamb-ibass/` (597 programmes across 5 universities). This is far more reliable than parsing the two-column brochure PDFs, whose text extraction interleaves columns.
- The bundle also links the brochure PDFs by subject area (created 2025-01-27). The **"Specific Entry Requirements"** PDF holds university-wide rules: UNILAG and UI five credits *at one sitting*, UNN at most two, and each university's **approved Arts / Science / Social Science subject lists**. Those lists turned "any three Arts or Social Science subjects" from guesswork into data. Extracted it column by column with pdfplumber.
- JAMB's `remarks` field is the same course-level text for every institution ("BENIN, IBADAN … require … one (1) sitting", "UNN requirements should be at one (1) sitting"). It has to be searched for each institution's name; it isn't per-institution.
- Some JAMB entries (OAU, UNN) list only three UTME subjects because Use of English is compulsory for everyone. That needs its own citation.
- Research fan-out: one subagent per university, restricted to official domains (+ jamb.gov.ng), saving every page to `data/raw/<inst>/` and returning verbatim quotes with locators. The harness allows only 2 concurrent subagents, so they ran in pairs. Claude re-checked each key quote against the saved HTML/PDF before using it.
- **Cut-offs are aggregates, not UTME scores.** UNILAG (83.425 for Medicine) and UI (80.00) publish departmental cut-offs on an unstated aggregate scale. Putting them in `lastCutoff` would make the evaluator compare a UTME score of 250 with 83.4. They go into `specialConditions` as information instead, and `lastCutoff` stays `null`.
- **Schema addition, a deliberate deviation:** `olevelMinCreditsCombined`. UI's rule "5 credits at one sitting or 6 at two sittings" can't be expressed with `olevelMinCredits` + `olevelMaxSittings`. Every alternative either wrongly rejects 6-credit two-sitting candidates or wrongly passes 5-credit ones, which is exactly the clearance failure this app exists to catch. One optional field fixes it deterministically.
- **Conflicts found so far** (marked `conflicting`, stricter rule encoded, both sources named):
  - UNILAG Law: JAMB accepts Principles of Accounts; UNILAG's 2025/26 requirements do not.
  - UNILAG Economics: JAMB gives a fixed list; UNILAG says "any other subjects".
  - UNILAG Accounting: UNILAG adds Literature and Further Maths.
  - UNILAG Mass Communication: JAMB adds Maths and Civic Education.
  - UI Law: JAMB's UI-wide rule requires Maths; UI's 2026 regulation omits it.
- **Scoped out, not guessed:** courses defined as "any Arts/Social Science subject" at universities that publish no approved list.
- Wording fix: the schema said `verified` = "checked by a human". Verification here is done by Claude (delegated), so the description now says what is actually checked: every field against the cited sources.
- **UNN:** the 2026/27 advert sets UTME ≥ **160**. Department pages date from 2015–2018, and two of the university's old posts contain injected spam links, so the site may have been compromised at some point. The policy text itself reads as genuine. UNN publishes no departmental cut-offs and disowns unofficial lists; blogs publish "merit" cut-offs anyway (good KB conflict material). UNN suspended its 2026 online Post-UTME on 21 Aug for "technical issues", with no new date found.
  - **Three versions of UNN Computer Science's O'level options.** JAMB, the department page and the faculty table each list different subjects. Only Chemistry and Biology appear in all three, so both are required (`conflicting`).
- **OAU:** the 2026 notice sets UTME ≥ **200**. The real 2026 eligibility guidelines live at `eportal2.oauife.edu.ng/ug/admission-guidelines`. curl and WebFetch get a "Loading…" shell, and **even a real Chrome tab renders it blank**: no data request, nothing in the JS bundle. Gave up after three attempts rather than rabbit-hole; that's recorded in the source notes and shown to candidates as a manual check.
  - OAU's own central requirements PDF (2023) names explicit subjects where JAMB says "any Social Science subject". That made OAU Accounting and Economics encodable. OAU Law still depends on an "Arts" list OAU never publishes, so it is left out.
  - **Nursing sittings conflict inside OAU.** The faculty handbook says "not more than two sittings"; the department handbook says "in one sitting". One sitting is encoded.
  - The agent's quote for Medicine ("provided all the subjects are taken and passed at a single sitting") wasn't found by a single-page search because it spans the PDF page break between pp. 51 and 52. Reading both pages confirmed it. Lesson: search across page boundaries before declaring a quote missing.
  - Fix: I had written `publishedAt: 2020-01-01` for a handbook whose PDF date is only "January 2020". Removed it: an invented day is still invented data.
- **Verification (spec 6.4, delegated).** Each university's requirements went to a separate **verifier subagent** that hadn't drafted them. It re-opened every cited file at its locator and returned MATCH / MISMATCH / UNCERTAIN per requirement. Only exact matches became `verified`; `conflicting` entries were checked for an accurate note and a genuinely stricter encoding.
  - UNILAG + UI: 11 MATCH, 4 MISMATCH. Real bugs it caught:
    - UNILAG Mass Communication: "History/Government" and "CRS/IRS" are each *one* option, not two.
    - UI Computer Science: `olevelOtherSubjectsCount: true` had no source support ("relevant subjects").
    - UI Accounting: an undeclared JAMB-vs-UI conflict, plus my claim that UI "publishes no list" was wrong.
    - UI Law: Further Mathematics was missing from the UTME options.
    - Wording: I'd called UNILAG's cut-offs "aggregate"; the page says "UTME merit cut-off mark" and never says aggregate.
    - UNILAG also names Cambridge O'Level, which the schema's exam list can't hold, so it's now a manual note.
  - UI never names O'level exam bodies for UTME entry. The only mention is "only WAEC, NECO" in its Direct Entry paragraph. Encoded `[WAEC, NECO]` (stricter) with a visible note for GCE/NABTEB holders, instead of assuming GCE.
  - UNN + OAU: 11 MATCH, 3 MISMATCH.
    - UNN's 25-subject approved Science list had been silently cut to 7 for Law and Mass Communication.
    - OAU Economics had an undeclared third source with a different list.
    - OAU Electrical dropped Economics as "not a science" but kept Geography, which OAU itself groups with Social Sciences.
    - Several stated facts were uncited: UNN's PUTME suspension, OAU's new screening date, UNN's 2017 cut-off disclaimer.
    - Locators said "Entry updated 2019-11-03" for JAMB records whose `updated_at` is null. They now say "created 2019-11-03, never updated".
  - Also found: JAMB's `remarks` field is cut off at exactly 65,535 characters (a DB TEXT limit) for some long course entries. Exceptions that fall after the cut can't be read from JAMB at all.
  - **Evaluator requirement surfaced by verification (for Phase 4):** with `olevelMinCreditsCombined`, the credit total must count *every* qualifying credit in a choice group, not just `pick` of them. Otherwise "5 at one sitting or 6 at two" can never be met at two sittings.
- Result after fixes: 29 requirements = 14 `verified` + 15 `conflicting`, all with `lastVerified: 2026-10-03`.
- **LASU:** the 2026/27 announcement sets UTME ≥ **195**. Five credits are allowed over at most two sittings, but Medicine needs one, and Engineering needs six credits when two sittings are used. LASU's admissions portal has a **course requirements checker** (POST `course=<code>`); its per-course results were saved as sources. LASU publishes no list of what counts as "Science" or "Arts/Social Science", so rules that depend on one are manual checks.
- **Use of English citation:** no 2026 JAMB document says it outright. The citable sentence is in JAMB's 2024 UTME Manual for Officials, §1.2(ii): "The Use of English is compulsory". It's cited on every OAU/UNN entry where JAMB lists only three subjects.
- **Biggest discovery of the phase: IBASS `remarks` is truncated at 65,535 chars.** The LASU verifier found JAMB's per-faculty brochure PDFs still hold the *full* remarks. I re-scanned every course section, column-cropped, for clauses naming our five universities, and rendered pages to PNG where I needed to see which course a clause belonged to. That surfaced 8 more corrections:
  - LASU Computer Science: JAMB requires Chemistry at both UTME and O'level.
  - LASU Electronics & Computer Engineering: JAMB requires six credits regardless of sittings.
  - LASU Economics: JAMB also accepts Commerce or Principles of Account.
  - OAU Accounting: "OAU requires Principles of Accounts not Commerce".
  - UI Economics: JAMB says Arts/Social Science only for the extra credits.
  - UI Nursing: JAMB's brochure says "IBADAN - No admission through UTME", contradicting UI's own 2026 regulation and cut-off list.
  - UNN Law: JAMB says "Literature plus any two subjects".
  - A fourth version of UNN Computer Science's O'level options.
  Each became `conflicting` with both sources named and the stricter rule encoded. Lesson: when an API field length is exactly 65,535, assume truncation and find the full document.
- Also fixed after the LASU verifier: I had stated "there is no separate Post-UTME test" as fact, but it was my inference. Replaced it with what LASU actually says: online screening is mandatory, closed 14 July, and O'level results must be on CAPS.
- **Scoped out (not guessed):**
  - OAU Law, LASU Law, LASU Accounting, LASU Mass Communication: these need an "Arts/Social Science" list the university doesn't publish.
  - OAU Mass Communication: JAMB's entry is empty.
  - UI Mass Communication: not offered.
- **Import:** `sanity dataset import ../data/seed.ndjson production --replace` imported 165 docs (57 sources, 35 subjects, 5 institutions, 34 programmes, 34 requirements).
- **Acceptance (public API, no token):**
  - `count(*[_type=="requirement"])` = 34 = YAML.
  - `*[_type=="requirement" && count(citations)==0]` = `[]`.
  - Unresolved programme refs = 0.
  - The spec's `{_id,session}` URL returns 34 rows.
- **Final status:** 13 `verified` + 21 `conflicting`, all with `lastVerified: 2026-10-03`. The high conflict count is real: JAMB's 2019–2024 entries, its 2025 brochure PDFs and each university's own pages disagree often, which is exactly how candidates get caught out at clearance.

## 2026-10-03 — Phase 3: Knowledge Base + Context endpoints

- Read the current Sanity Context docs (`.md` versions) first: create KB, source types, resolve issues, configure MCP, MCP reference/tools.
- **KB source files.** The source pages are full of navigation clutter, so `scripts/build-kb-files.ts` + `data/kb-manifest.yaml` turn 32 chosen sources into clean upload files in `data/raw/kb/`.
  - HTML pages become Markdown with a header (title, URL, publisher, authority, dates), so every KB entry can cite the original.
  - PDFs are uploaded as-is, except two that are reduced to their relevant pages: JAMB's 116-page officials' manual (only §1.2 matters: "Use of English is compulsory") and the 2026 policy bulletin.
  - Sources: 26 official (JAMB + all five universities) + 6 blogs.
- **Upload gotchas.**
  - The Dashboard embeds Context in a cross-origin iframe (`context.sanity.io`), so the page's file input is unreachable from the parent.
  - Opening `context.sanity.io` directly works after a GitHub login, but the Chrome extension has no screenshot or keyboard permission there. Clicks, DOM reading and JS do work.
  - Tabs ignore plain `.click()`; they needed real pointer events. React inputs needed the native value setter + `input` events.
  - A detour that didn't work: serving the files from a localhost server for the page to fetch is blocked by the page's CSP.
  - What worked: the hidden `<input type=file multiple>` inside the standalone app. All 32 files uploaded and processed with 0 failures.
- **Security slip.** While probing the iframe I printed its `src`, which carries a Sanity dashboard session token in the URL hash. It's now in this transcript, so it must be redacted before the session is shared, and the user should sign out of Sanity to invalidate it.
- **Endpoints.**
  - `clearance-rules`: source `cynv9mfk.production`, GROQ filter `_type in ["requirement","programme","institution","subject","source"]`, plus instructions (spec text + subject-id, choice-group and conflict semantics).
  - `clearance-policy`: Knowledge Base only.
  - **Gotcha:** `clearance-rules` showed "Not ready — No Studio application found for this project/dataset". A deployed *schema* isn't enough; Context's GROQ mode needs a **deployed Studio**. Ran `sanity deploy --url clearance-desk` → https://clearance-desk.sanity.studio, and saved `appId` in `sanity.cli.ts`. The status then read "Ready to connect · Studio: Clearance Desk (default) · Schema: 5 content types".
- **Token gotcha.** `npm run list-tools` got `-32007 … requires an organization API token with Context access ('sanity.knowledge-base.read')`. The token in `.env.local` is a *project* token. The human must create an **organization** token with Context Viewer (Manage → Organization → API → Tokens).

## 2026-10-03 — Phase 4: deterministic eligibility evaluator

- `web/lib/eligibility/`: `types.ts` (zod candidate schema + requirement/result types), `grades.ts`, `normalize.ts` (stored or GROQ-projected requirement → plain ids), `evaluate.ts`. No model anywhere in this path.
- **Choice groups use maximum bipartite matching** (Kuhn's algorithm), not the spec's "satisfy each group in order and consume". Greedy in-order assignment can wrongly fail a candidate. Example: group 1 = {Chemistry, Biology}, group 2 = {Chemistry}; a candidate with both satisfies both, but greedy gives Chemistry to group 1. Matching still guarantees a subject never fills two slots. There's a unit test for exactly this case.
- **Credit total counts every qualifying credit inside a choice group, not only `pick` of them.** The verifier flagged this in Phase 2: "5 at one sitting or 6 at two sittings" (UI) can otherwise never be met at two sittings. With `olevelMinCreditsCombined` it works deterministically. Tested.
- O'level: non-accepted exams are dropped with a WARN. Awaiting-result sittings are still used, but WARN. All sitting combinations are evaluated; the passing one with the fewest sittings is chosen, otherwise the one with the fewest failures. "This course allows 1 sitting; you need 2 sittings to meet it" is shown when only a larger combination passes.
- Verdict: any FAIL → NOT_ELIGIBLE, else any WARN → AT_RISK, else ELIGIBLE. `manual` checks always show and never change the verdict. A null institution minimum is a WARN, so UI (which publishes no UTME minimum) can never come out plain ELIGIBLE. That's deliberate honesty.
- **Tests: 30 passing** (vitest 5). They cover all 12 cases from the spec, plus:
  - the matching case
  - `olevelMinCreditsCombined`
  - choice-group credit counting
  - candidate validation
  - a smoke test that normalises and evaluates **all 34 real requirements** from `data/seed.ndjson`, with real-data assertions (UNILAG Medicine one sitting, UNILAG CS needs Further Maths, UI Medicine AT_RISK because there's no published minimum, UNN minimum 160)
- **Mutation check:** made `meets()` strict (C6 no longer meets C6) → 3 tests failed; stopped counting choice-group credits → 3 tests failed. Both restored.
- Dependency snag: `vitest@5` requires `@types/node` ≥ 22, but create-next-app pinned `^20`. Bumped to `^24` (an LTS line Vercel runs). `vitest.config.mts` avoids Vite's "ESM in CJS" warning.

## 2026-10-03 — Phase 5: the agent

- **Versions checked before writing code** (from the installed packages' `.d.ts` files and bundled docs):
  - `ai@6.0.300`, `@ai-sdk/mcp@1.0.90` and `@ai-sdk/anthropic@3.0.127`, all on `@ai-sdk/provider@3`.
  - `generateText` takes `stopWhen: [stepCountIs(12), hasToolCall('submit_verdict')]`.
  - A tool without `execute` ends the loop.
  - `system` accepts a message object with `providerOptions.anthropic.cacheControl`.
- **Initial context inlined.** I followed Sanity's own Next.js reference: `GET <endpoint>/initial-context` with the org token returns the Markdown (rules about 3.8 KB, policy about 3.8 KB).
  - Both are inlined in the system prompt, cached for 10 minutes per instance.
  - `initial_context` is not given as a tool, which saves one round-trip per endpoint.
  - `array_field_reader` is left out too. No requirement array is long enough to be cropped, and its schema is the largest of all the tools.
- **Guards in code, not just the prompt:**
  - The candidate lives in the tool's closure, so the model can't edit what it is judged on.
  - In check mode with a `programmeId`, `evaluate_eligibility` refuses any other programme's requirements.
  - A policy note survives only if its `kbPath` was read by `policy_knowledge_base_read` in that same run.
  - Over-long headlines and explanations are trimmed in code rather than rejected by the schema. A schema failure would cost the agent a step.
  - If the model never calls `submit_verdict`, the evaluator's verdicts are still returned, with plain fallback headlines and `explained: false`.
- **Snag:** annotating the provider options as `AnthropicLanguageModelOptions` failed `tsc`, because the type includes non-JSON fields and `providerOptions` wants a `JSONObject`. Fixed with `satisfies`, which is the pattern in the provider docs.
- **Acceptance (local `curl`, `next dev`):**
  - UNILAG Medicine, two sittings, Physics D7 in WAEC → NOT_ELIGIBLE. Trace: `rules_groq_query → evaluate_eligibility → policy_knowledge_base_read → submit_verdict`.
  - Explore mode (Maths/Economics/Government, UNILAG + LASU) → 4 requirements, same 4-step trace. 3 are AT_RISK only because their data is `conflicting` (the Phase 4 rule); UNILAG Law is NOT_ELIGIBLE because Maths doesn't count toward its UTME combination.
  - "Petroleum Engineering" at UNILAG → `noDataReason` naming the 8 UNILAG courses we do hold. Nothing was evaluated.
  - Invalid bodies → 400 with field-level issues. Non-JSON → 400. No raw errors or tokens reach the client.
- **Wrong turns caught by reading the outputs:**
  - **The model added "next steps" from memory.** It said "UTME subjects can't be changed after sitting", which no entry it read says. The prompt now bans procedures from memory and requires the next step to come from the checks or the entries read. It still happened once after the first tweak. After the second, one of two runs still said the combination "cannot be changed in this data": softer, but the same habit. This is only reduced, not solved. Because the rule lives only in the prompt, the Phase 8 eval should keep checking for it.
  - **Headlines were vague** ("at risk, but your results fit"). They now have to name the verdict's main reason.
  - **The no-data message echoed the prompt** ("I won't use another course in its place"). Reworded the rule.
- **Latency:**
  - At `effort: 'medium'` (with `thinking: between_tools`, Sonnet 5.5's lightest setting), the explore case took 26–52 s. That is too close to the 60 s function limit.
  - At `effort: 'low'` it took 24–32 s, with text of similar quality, so low is the setting now.
  - Check mode takes 13–36 s.
- **Observation, not a bug:**
  - The KB entry `cut_off_marks/unilag/sciences` calls UNILAG's 83.425 an "aggregate cut-off mark", and the model repeated that faithfully.
  - Our dataset's manual check is more cautious: the UNILAG release itself doesn't name the scale.
  - The KB's own overview entry describes UNILAG's aggregate system, so the claim has a source in the KB. I'm noting the difference rather than editing either side.
- **Unfixed warning:** `next dev`/`next build` warn about two lockfiles (repo root for `scripts/`, plus `web/`). It's harmless locally; I'll revisit at deploy (Phase 7) if Vercel complains.

## 2026-10-03 — Phase 6: UI

- **Pages:**
  - `/` loads its form options (subjects, plus the institutions and programmes that have a requirement) with GROQ on the server. It's ISR, refreshed every 10 minutes.
  - `/about` shows live coverage, refreshed every minute.
  - The Next 16 docs say `cacheComponents` is opt-in. It isn't enabled here, so plain `export const revalidate` is used.
- **Samples are built from data and tested, not hand-waved.** `lib/samples.ts` has three fictional candidates against verified requirements:
  - UNILAG CS → ELIGIBLE
  - LASU Nursing with an awaited NECO Chemistry → AT_RISK, and the test asserts the only warning is `olevel-awaiting`
  - UNILAG Medicine with Physics from a second sitting → NOT_ELIGIBLE, and the test asserts UTME passes and the sittings check fails
  - `samples.test.ts` runs the real evaluator on `data/seed.ndjson`. `components/form-state.test.ts` checks that sample → form → request is lossless and passes the API schema.
- **Bug found through the UI: an intermittent missing explanation.**
  - The first sample run in the browser showed "the written explanation didn't finish".
  - Across 14 runs that day, 3 lost the explanation. I captured the raw `submit_verdict` input of one: Sonnet had sent `results` as a **JSON string**, with `policyNotes` placed beside `results` instead of inside it.
  - `hasToolCall('submit_verdict')` stopped the loop on that invalid call, so the model never got to retry.
  - Fix, part 1: `readVerdict()` repairs exactly those shapes. Stray notes are kept only when there is one result; otherwise they're dropped rather than guessed. It is unit-tested on the captured shape.
  - Fix, part 2: the loop now stops only on a *usable* verdict. A malformed one goes back to the model as a validation error, and the model can retry.
- **Bug: source titles were file names.**
  - A KB policy note cited `lasu-2026-screening-reopening.md`, the upload file name, as its source title. The KB cites its upload files.
  - `build-kb-files.ts` names each file after its source id, so `getSourceLookup()` maps either a URL or a KB file name back to our `source` document: real title, URL and official/secondary badge.
  - Tested live against the dataset, including the `.pdf § overview` variant.
- **Payload:**
  - The explore response was 155 KB, because every check carried a full copy of the requirement's citations.
  - Checks now go out without citations; the card shows the requirement's citations once. That's about 90% smaller.
- **360px layout bugs, found by measuring `scrollWidth` in a 360px same-origin iframe** (the Chrome window couldn't be resized):
  1. A shared field class had `w-full`, which beat `w-20` on the grade select. Tailwind applies conflicting utilities in stylesheet order, not class order. The shared class now has no width.
  2. Fieldsets default to `min-width: min-content`, so long subject names stretched them. Added `min-w-0`.
  3. Long KB paths didn't wrap. Added `break-all`.
  4. The About table's always-zero "Unverified" column fell off-screen. It now shows only when non-zero, and full university names are hidden on small screens.
  - After the fixes, page width is 360 for the eligible, at-risk, rejected, explore and no-data responses, with every `<details>` open.
- **Blocked:** Anthropic returned "credit balance is too low" for the key copied from the vouch project, part-way through testing. The UI was then checked against responses recorded earlier in this session, served as local mocks that were never committed.
  - The two agent fixes above are covered by unit tests and a live Sanity check.
  - They have **not** been re-run end-to-end against Claude. That needs credit.

## 2026-10-03 — Phase 7: deploy

- Used the Vercel CLI (60.1.3, logged in as big14way) instead of the dashboard.
  - `vercel project add clearance-desk`, then `project update --root-directory web --framework nextjs --node-version 24.x`.
  - `vercel link` and `vercel git connect` link it to big14way/clearancedesk, so every push to `main` deploys to production.
- **Env vars:** all 10 keys from `web/.env.local` were added to Production and Preview by a small script.
  - It pipes each value through stdin, so no secret appears in a process list or in this log.
  - `SANITY_ORGANIZATION_TOKEN` and `ANTHROPIC_API_KEY` are stored as Sensitive.
- **Fixed before deploying:** the two-lockfile warning from Phase 5. `next.config.ts` now pins `turbopack.root` and `outputFileTracingRoot` to `web/`. The app imports nothing outside it, and the warning is gone.
- **Build:** 34 s, first try.
  - Vercel's default alias was `clearance-desk-six.vercel.app`, because `clearance-desk.vercel.app` is taken.
  - At the human's request I added the shorter `clearancedesk.vercel.app` as a project domain. I first checked it was unclaimed: it returned `DEPLOYMENT_NOT_FOUND`.
- **Checks on production:**
  - `/` and `/about` return 200 with no login redirect.
  - `/about` shows the live count (34 requirements).
  - `/api/check` validates input (400 with field issues).
- **The schema is unchanged since Phase 2.** The rules endpoint already lists `olevelMinCreditsCombined`, so no redeploy was needed.
- **Blocked:** a real check returns the generic 502. The runtime log shows the cause: `AI_APICallError: Your credit balance is too low`.
  - That error comes from the last step (the model call), after the Sanity token, both Context endpoints and the initial-context fetch have worked in production.
  - The three sample candidates can't be tested on production until the Anthropic account has credit.
- **After the human added credit, ran 5 live checks against https://clearancedesk.vercel.app/api/check**, the same requests the sample buttons send:
  - Ada (UNILAG CS) → ELIGIBLE.
  - Tunde (LASU Nursing) → AT_RISK, because his NECO 2026 result is awaited.
  - Chioma (UNILAG Medicine) → NOT_ELIGIBLE.
  - Explore (Maths/Economics/Government at UNILAG + LASU) → 3 AT_RISK + UNILAG Law NOT_ELIGIBLE.
  - Petroleum Engineering at UNILAG → `noDataReason`.
  - All 5 have `explained: true`, and every trace is `rules_groq_query → evaluate_eligibility → policy_knowledge_base_read → submit_verdict`. The no-data case is two GROQ queries and then `submit_verdict`.
  - Policy notes now carry real source titles and badges: for example "LASU — 2026/2027 screening portal reopening…" (Official), and a LASU cut-off blog (Secondary).
  - Times: 17–40 s with all five running at once.
  - This also confirms both Phase 6 agent fixes end-to-end.
- **Not done by me:** a tap-through of the production UI. The Chrome extension couldn't drive a background tab while the human's Sanity tab had focus, so I stopped after two failed attempts. The UI was checked locally at 360px in Phase 6, and the API calls behind each button pass on production. The spec's "test from a phone" step is left for the human.
