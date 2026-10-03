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
