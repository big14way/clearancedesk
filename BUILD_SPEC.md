# BUILD_SPEC.md — Clearance Desk

> **Claude Code: read this whole file before doing anything.**
> Work phase by phase. At every **🧍 HUMAN STEP**, stop and wait for the human to confirm.
> After each phase: run the acceptance checks, commit, and append notes to `BUILD_LOG.md`.

---

## 0. Context

**What we're building:** *Clearance Desk*, an AI agent that tells Nigerian university applicants whether their **UTME subjects, UTME score and O'level results** meet the published requirements for a specific course at a specific university. It answers *before* they apply, so they don't get admitted and then rejected at clearance.

**Contest:** DEV × Sanity Challenge, **Path One: "Ship an Agent That Queries Real Content."**

- **Hard deadline:** Oct 4, 2026, 11:59 PM PDT, which is **Mon Oct 5, 07:59 WAT**.
- **Target publish time:** **Sun Oct 4, ~22:00 WAT.**

**Judging criteria (optimise for these):**
1. Meaningful use of Sanity Context and structured content
2. Technical implementation and code quality
3. Use of Knowledge Bases
4. Usability

The organisers' key line: *the agent should only work because the content is structured. If keyword search would get the same answer, aim higher.*

**Core design principle: the model finds and explains; deterministic code judges.**

---

## 1. Rules for Claude Code

1. **Never invent admission data.** No requirement, cut-off, subject combination or policy may come from model memory.
   - Every data field must trace to a file in `data/raw/` or a URL in `data/sources.yaml`.
   - If a source doesn't state something, set it to `null` and mark the requirement `unverified`.
2. **Never commit secrets.**
   - `.env*` is gitignored except `.env.example`.
   - Before each commit, grep the staged diff for `sk-`, `token`, `Bearer`.
3. **Verify current APIs before writing code.** Versions move fast.
   - Sanity docs have a Markdown version of every page: append `.md` to any `https://www.sanity.io/docs/...` URL. The full index is at `https://www.sanity.io/docs/llms.txt`.
   - Check the installed Vercel AI SDK version's docs, and npm peer dependencies.
4. **Keep it simple.** Pick boring, working solutions. Don't add features not in this spec until every phase passes.
5. **Commit after every phase** with clear messages. Judges may read the git history.
6. **Log honestly.** For every failure, wrong turn or fix, append a dated entry to `BUILD_LOG.md`: what you tried, what broke, how you fixed it. This feeds the submission writeup.
7. **Install the Sanity Context skills early:** `npx skills add sanity-io/context --all`.
   - Use `shape-your-agent` (system prompt) and `dial-your-context` (MCP Instructions) where helpful.
   - Follow **this spec's architecture** (two endpoints) even if a skill suggests something else.

---

## 2. Architecture

```
Browser (Next.js, mobile-first form)
   │  POST /api/check  { candidate, target?, mode: "check" | "explore" }
   ▼
Next.js route handler (server) ── Vercel AI SDK agent loop (Claude)
   ├─ MCP client A → Sanity Context MCP "clearance-rules"   (GROQ mode, dataset source)
   │     tools (prefixed): rules_initial_context, rules_groq_query,
   │                       rules_schema_explorer, rules_array_field_reader
   ├─ MCP client B → Sanity Context MCP "clearance-policy"  (Knowledge Base mode)
   │     tools (prefixed): policy_initial_context, policy_knowledge_base_read
   ├─ local tool: evaluate_eligibility({ requirementIds })
   │     → fetches requirement docs by _id with @sanity/client (public dataset)
   │     → runs deterministic rule checks (no LLM) against the candidate,
   │       which the server injects (the model never re-types candidate data)
   └─ final tool: submit_verdict({ ...explanations, policy notes })
   ▼
Response: evaluator verdicts (authoritative) + model explanation + citations + tool trace
```

**Why two endpoints:** a Context MCP endpoint serves **one source type**. If you attach both a dataset and a Knowledge Base to one endpoint, the dataset wins and the Knowledge Base is **silently ignored**. So we use two endpoints, one per source type.

**Why prefixing:** both endpoints expose a tool named `initial_context`, so merged tool names would collide. Prefix them with `rules_` and `policy_`.

---

## 3. Repo layout

```
clearance-desk/
├─ BUILD_SPEC.md            # this file
├─ BUILD_LOG.md             # honest build journal (Claude appends)
├─ README.md
├─ .gitignore
├─ studio/                  # Sanity Studio (v5.1.0+)
│  ├─ schemaTypes/
│  │  ├─ constants.ts
│  │  ├─ objects/ (citation.ts, gradedSubject.ts, subjectChoice.ts)
│  │  ├─ source.ts  subject.ts  institution.ts  programme.ts  requirement.ts
│  │  └─ index.ts
│  ├─ structure.ts
│  └─ sanity.config.ts / sanity.cli.ts
├─ data/
│  ├─ raw/                  # downloaded PDFs / saved pages (GITIGNORED – third-party content)
│  ├─ sources.yaml          # list of every source (committed)
│  ├─ catalog.yaml          # subjects, institutions, programmes, requirements (committed)
│  └─ seed.ndjson           # generated, committed
├─ scripts/
│  ├─ build-ndjson.ts       # catalog.yaml + sources.yaml → seed.ndjson
│  ├─ list-tools.ts         # verifies both MCP endpoints
│  └─ eval.ts               # runs eval cases, writes eval/results.md
├─ eval/
│  ├─ cases.json
│  └─ results.md
└─ web/                     # Next.js app (App Router, TS, Tailwind)
   ├─ app/
   │  ├─ page.tsx            # form + results
   │  ├─ about/page.tsx      # architecture, data coverage, limitations
   │  └─ api/check/route.ts
   ├─ components/ (CandidateForm.tsx, VerdictCard.tsx, TracePanel.tsx, Disclaimer.tsx)
   └─ lib/
      ├─ sanity/client.ts    # read-only @sanity/client (public dataset, no token)
      ├─ eligibility/
      │  ├─ types.ts  grades.ts  evaluate.ts
      │  └─ evaluate.test.ts  # vitest
      └─ agent/
         ├─ mcp.ts            # two MCP clients + prefixing
         ├─ tools.ts          # evaluate_eligibility, submit_verdict
         ├─ prompt.ts         # system prompt
         └─ run.ts            # agent loop
```

---

## 4. Phase 0 — 🧍 HUMAN STEP: accounts and access (start now)

- [ ] **Node** 20.19+ or 22.12+ (`node -v`).
- [ ] **Git** installed. Create an **empty public GitHub repo** named `clearance-desk` with no README.
  - Optional: install the GitHub CLI and run `gh auth login`.
- [ ] **Sanity account** at sanity.io. In a terminal, run `npx sanity login`.
- [ ] **Create the Sanity project** at sanity.io/manage:
  - Project name: "Clearance Desk".
  - Dataset: `production`, **visibility: public**. Judges need to query it.
  - Note the **Project ID**.
- [ ] **Turn on Labs features.** In Manage → your **organization** → **Labs**, enable **Sanity Context** and **Knowledge Bases**.
  - You must be the org admin.
  - ⚠️ If either is unavailable on your plan, **ask in the Sanity Discord `#mcp-server` channel immediately**.
- [ ] **Note your Organization ID** (Manage → organization settings).
- [ ] **Create an organization-level API token** under Manage → **Organization** → API → Tokens, with **Context Viewer** permission.
  - This is *not* a project token.
  - Save it as `SANITY_ORGANIZATION_TOKEN`.
- [ ] **Model API key** (Anthropic console). **Set a monthly spend limit**, because judges will use your public demo.
- [ ] **Vercel account** connected to GitHub.
- [ ] **Start collecting sources now** (see Phase 2). This is the slowest part of the whole build.

Tell Claude: Project ID, Organization ID, and the GitHub repo URL. Put secrets into `web/.env.local` yourself; never paste them into chat.

---

## 5. Phase 1 — Scaffold, Studio, schema

### 5.1 Repo init (Claude)
- `git init`, then create `.gitignore` with:
  - `node_modules`, `.env*`, `!.env.example`
  - `data/raw/`, `.vercel`, `.next`, `dist`, `.sanity`
- Create `BUILD_LOG.md` and `README.md` (stub).

### 5.2 Studio (Claude, with human fallback)
- From the repo root, scaffold into the existing project:
  `npm create sanity@latest -- --project <PROJECT_ID> --dataset production --template clean --typescript --output-path studio`
- If flags fail or prompts block, **🧍 the human runs `npm create sanity@latest` interactively** with the same choices.
- Confirm `sanity` in `studio/package.json` is **≥ 5.1.0**. Upgrade if not. Context's GROQ mode needs a schema deployed from Studio 5.1.0+.

### 5.3 Schema (Claude)

`studio/schemaTypes/constants.ts`
```ts
export const GRADES = ['A1','B2','B3','C4','C5','C6','D7','E8','F9'] as const // WAEC/NECO scale; credit = C6 or better
export const EXAMS = ['WAEC','NECO','NABTEB','GCE'] as const
export const VERIFICATION = ['verified','unverified','conflicting'] as const
```

**Object types**
- `citation`:
  - `source`: reference → `source`, required
  - `locator`: string, required. Where in the source, e.g. "p. 22, Faculty of Physical Sciences table".
- `gradedSubject`:
  - `subject`: reference → `subject`, required
  - `minGrade`: string, from `GRADES`, default `C6`
- `subjectChoice`:
  - `pick`: number ≥ 1, required
  - `from`: array of references → `subject`, at least 1
  - `minGrade`: string, from `GRADES`. Optional; only used for O'level.

**Document types**
- `source`:
  - `title`, required
  - `url` (url), required
  - `publisher`: list `JAMB | University | NUC | Exam body | News/Blog | Other`
  - `authority`: list `official | secondary`, required
  - `publishedAt` (date), `retrievedAt` (date, required), `notes` (text)
- `subject`:
  - `name`, required
  - `slug`, required
  - `aliases`: string[], e.g. "Maths", "General Mathematics"
- `institution`:
  - `name`, `shortName` (e.g. "EXSU"), `slug`
  - `ownership`: `federal | state | private`
  - `state` (string), `website` (url)
- `programme`:
  - `title`, `slug`
  - `institution`: reference, required
  - `faculty` (string), `durationYears` (number)
- `requirement`: one per programme per session. **This is the heart of the schema.**
  - `programme`: reference → `programme`, required
  - `session`: string, regex `^\d{4}/\d{4}$`, e.g. `2026/2027`
  - `utmeCompulsory`: subject refs, including Use of English
  - `utmeChoices`: `subjectChoice[]`
  - `utmeMinScore`: number or null. The institution's minimum for this session.
  - `lastCutoff`: object `{ score: number, session: string }` or null. Last published departmental cut-off.
  - `olevelMinCredits`: number, default 5
  - `olevelCompulsory`: `gradedSubject[]`
  - `olevelChoices`: `subjectChoice[]`
  - `olevelOtherSubjectsCount`: boolean, default false. "Any other credit counts toward the minimum."
  - `olevelMaxSittings`: number, 1 or 2
  - `olevelAcceptedExams`: string[] from `EXAMS`
  - `specialConditions`: string[]. Things code can't check (e.g. "Post-UTME screening required"). Shown as *manual checks*.
  - `citations`: `citation[]`, **at least 1, required**
  - `verificationStatus`: from `VERIFICATION`, default `unverified`
  - `conflictNote`: text. Required when `conflicting`.
  - `lastVerified`: date
  - **Document-level validation:**
    - `utmeCompulsory.length + sum(utmeChoices.pick)` must equal 4.
    - `conflictNote` is required if the status is `conflicting`.
  - **Preview:**
    - title: `programme.title`
    - subtitle: `programme.institution.shortName · session · verificationStatus`

Give every field a short `description`. Judges look at the schema.

`studio/structure.ts` should list: Requirements (sub-lists by verificationStatus), Programmes, Institutions, Subjects, Sources.

### 5.4 Deploy schema (Claude)
- In `studio/`, run `npx sanity schema deploy`. This is **required**: Context reads the schema from the server, not from your machine.
- Optional: `npx sanity deploy` to host the Studio. 🧍 The human picks the hostname.

### 5.5 Web scaffold (Claude)
- `npx create-next-app@latest web --ts --tailwind --eslint --app --import-alias "@/*" --use-npm`
- Create `web/.env.example`:
```
SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_API_VERSION=2026-09-01
SANITY_ORG_ID=
SANITY_ORGANIZATION_TOKEN=          # org-level, Context Viewer. Server only.
CONTEXT_RULES_MCP_URL=https://api.sanity.io/v1/context/organizations/<ORG_ID>/mcp/clearance-rules
CONTEXT_POLICY_MCP_URL=https://api.sanity.io/v1/context/organizations/<ORG_ID>/mcp/clearance-policy
ANTHROPIC_API_KEY=
MODEL_ID=claude-sonnet-5-5           # or claude-haiku-4-5-20251001 to cut cost
DAILY_REQUEST_CAP=300
```

**Acceptance for Phase 1:**
- The Studio runs locally (`npm run dev` in `studio/`).
- `sanity schema deploy` succeeds.
- `web` builds.

Commit: `phase 1: studio, schema, web scaffold`. 🧍 The human adds the remote and pushes, or Claude runs `gh repo create clearance-desk --public --source=. --push` if `gh` is set up.

---

## 6. Phase 2 — Data (the long pole)

**Scope:**
- 4–6 institutions × the most popular programmes, giving **30–50 requirement docs**.
- Use the latest session with published requirements, ideally 2026/2027.
- Small and correct beats big and wrong.

### 6.1 🧍 HUMAN STEP: collect sources
Save files into `data/raw/` and list every one in `data/sources.yaml`. Verify every link yourself.

Where to look:
- **JAMB official** (`jamb.gov.ng`): the institution/course requirements brochure (search JAMB's e-facility portal), plus **JAMBulletin PDFs**, e.g. under `jamb.gov.ng/Bulletin/...`.
- **Each university's own** admission requirements pages and admission brochures.
- **1–2 popular admission blogs or news posts.** These are **only** for the Knowledge Base to surface conflicts. Never use them as ground truth in the dataset.

Format for `data/sources.yaml`:
```yaml
- id: src-jamb-bulletin-2026-xx-xx
  title: "JAMBulletin, <date>"
  url: https://www.jamb.gov.ng/...
  publisher: JAMB
  authority: official
  retrievedAt: 2026-10-03
  file: data/raw/jambulletin-2026-xx-xx.pdf
```

### 6.2 Claude: draft `data/catalog.yaml` from the raw sources only
- Read the files in `data/raw/`. Claude Code can read PDFs.
- Extract requirements into the format below.
- **Every requirement needs ≥1 citation with a precise locator.**
- Anything not stated in a source gets `null`, and the requirement stays `unverified`.
- If two official sources disagree:
  - set `verificationStatus: conflicting`
  - describe the difference in `conflictNote`
  - encode the **stricter** rule, so it's safe for candidates.

**⚠️ FICTIONAL EXAMPLE, for format only. Do not import.**
```yaml
subjects:
  - { id: english, name: "Use of English / English Language", aliases: ["English", "English Language", "Use of English"] }
  - { id: mathematics, name: "Mathematics", aliases: ["Maths", "General Mathematics"] }
institutions:
  - { id: exsu, name: "Example State University", shortName: EXSU, ownership: state, state: "Example", website: "https://example.edu.ng" }
programmes:
  - { id: exsu-computer-science, institution: exsu, title: "Computer Science", faculty: "Physical Sciences" }
requirements:
  - id: exsu-computer-science-2026-2027
    programme: exsu-computer-science
    session: "2026/2027"
    utmeCompulsory: [english, mathematics, physics]
    utmeChoices: [{ pick: 1, from: [chemistry, biology, economics] }]
    utmeMinScore: null
    lastCutoff: null
    olevelMinCredits: 5
    olevelCompulsory: [{ subject: english, minGrade: C6 }, { subject: mathematics, minGrade: C6 }, { subject: physics, minGrade: C6 }]
    olevelChoices: [{ pick: 2, from: [chemistry, biology, economics, geography], minGrade: C6 }]
    olevelOtherSubjectsCount: false
    olevelMaxSittings: 2
    olevelAcceptedExams: [WAEC, NECO, NABTEB, GCE]
    specialConditions: ["Post-UTME screening required"]
    citations: [{ source: src-exsu-brochure-2026, locator: "p. 22, Physical Sciences table" }]
    verificationStatus: unverified
    conflictNote: null
```

### 6.3 Claude: `scripts/build-ndjson.ts` → `data/seed.ndjson`
- **Use hyphens in document IDs, never dots.** In Sanity, IDs containing `.` are path-scoped and **not publicly readable**, which would break the public dataset and the evaluator.
  - `subject-english`
  - `institution-exsu`
  - `programme-exsu-computer-science`
  - `requirement-exsu-computer-science-2026-2027`
  - `source-src-exsu-brochure-2026`
- Generate `_type`, `_id`, `_ref`s, and `_key`s for array items.
- Validate before writing:
  - every `_ref` resolves
  - grades are in `GRADES`
  - the UTME subject count adds up to 4
  - every requirement has ≥1 citation

### 6.4 🧍 HUMAN STEP: verify
- Open each requirement next to its source.
- Only when it matches exactly, set `verificationStatus: verified` and `lastVerified` in `catalog.yaml`.
- Rebuild the NDJSON.

### 6.5 Claude: import
- From `studio/`: `npx sanity dataset import ../data/seed.ndjson production --replace`

**Acceptance for Phase 2:**
- GROQ `count(*[_type=="requirement"])` matches the YAML.
- `*[_type=="requirement" && count(citations)==0]` returns `[]`.
- The public query URL works without a token:
  `https://<PROJECT_ID>.api.sanity.io/v2026-09-01/data/query/production?query=*[_type=="requirement"]{_id,session}` (URL-encode the query).

Commit: `phase 2: verified catalog + seed`.

---

## 7. Phase 3 — Knowledge Base and MCP endpoints

### 7.1 🧍 HUMAN STEP: build the Knowledge Base (Sanity Dashboard → Context app)
**Start this as early as possible.** Builds take time and you'll iterate. Guide: `https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base`

1. Create a Knowledge Base named **"Clearance Desk — Admission Policy"**.
2. **Purpose** (paste):
   > Helps Nigerian university applicants check whether their UTME subjects, UTME score and O'level results meet admission requirements for specific courses at [LIST YOUR SCHOOLS], using official JAMB and university sources. Core topics: UTME subject combinations, O'level credits and number of sittings, cut-off marks, post-UTME screening, awaiting-result rules, and common reasons candidates are rejected at clearance.
3. **Sources:**
   - Specific JAMB and university page URLs (not whole domains)
   - Uploaded PDFs (bulletins, brochures)
   - The 1–2 blog posts
   - **Stay under the 150-document beta limit.**
4. **Build**, then review the outline.
5. Open **Issues** and resolve each conflict by picking ground truth. **📸 Screenshot every conflict before and after.** This is your best material for the post.
6. Add **Instructions** (paste each as its own rule, anchored to the relevant sources):
   - Official JAMB sources (jamb.gov.ng pages and JAMBulletin) are ground truth over news sites and blogs.
   - A university's own published requirement is ground truth for that university over third-party summaries.
   - When JAMB's brochure and a university's own page disagree, keep both claims, name both sources, and state that the stricter requirement is the safe one for candidates.
   - Always state which admission session (e.g. 2026/2027) a requirement or cut-off applies to.
7. Rebuild, and confirm the issues are cleared.

### 7.2 🧍 HUMAN STEP: create two Context MCP endpoints (Context app)
- **`clearance-rules`**: source = dataset, written exactly as `<PROJECT_ID>.production`.
  - A malformed ID is skipped, and the endpoint silently flips to Knowledge Base mode.
  - If offered, add a GROQ filter limiting it to `_type in ["requirement","programme","institution","subject","source"]`.
  - **Instructions** field:
    > `requirement` documents hold the rules for one programme at one institution for one admission session; join via programme->institution. Subjects are documents with aliases; match subjects by _id. When reading requirements, always return _id, session, verificationStatus, conflictNote and citations[]{locator, "source": source->{title,url,authority}}.
- **`clearance-policy`**: source = **the Knowledge Base only**. Do not add the dataset here.
- Copy both endpoint URLs into `web/.env.local`.

### 7.3 Claude: `scripts/list-tools.ts` + curl smoke test
Verify each endpoint:
```bash
curl -X POST "$CONTEXT_RULES_MCP_URL" \
  -H "Authorization: Bearer $SANITY_ORGANIZATION_TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Acceptance for Phase 3:**
- The rules endpoint lists `initial_context`, `groq_query` and `schema_explorer`.
- The policy endpoint lists `initial_context` and `knowledge_base_read`.
- A `groq_query` returning the requirement count works.
- A `knowledge_base_read` of one outline path works. The KB id is the `kb…` value on the "Knowledge base id:" line in `initial_context`.

Commit: `phase 3: context endpoints verified`.

---

## 8. Phase 4 — Deterministic eligibility evaluator (no LLM)

`web/lib/eligibility/`. Pure TypeScript, fully unit-tested with **vitest**.

**Candidate input** (zod):
```ts
candidate = {
  utme: { score: number /* 0–400 */, subjects: string[] /* 4 subject _ids, distinct */ },
  olevel: { sittings: Array<{
    exam: 'WAEC'|'NECO'|'NABTEB'|'GCE', year: number, awaitingResult?: boolean,
    results: Array<{ subjectId: string, grade: Grade }>
  }> /* 1–3 */ }
}
```

**Grade helpers:**
- Rank A1=1 … F9=9.
- `meets(g, min)` means `rank(g) <= rank(min)`.
- A credit is `meets(g, 'C6')`.

**`evaluate(requirement, candidate)` → `{ requirementId, verdict, checks[], usedSittings[] }`**

Each check has the shape `{ id, label, status: 'pass'|'fail'|'warn'|'manual', detail, citations }`.

1. **UTME subjects**
   - There must be exactly 4 distinct subjects.
   - Every `utmeCompulsory` subject must be present; otherwise FAIL, naming the missing subject.
   - Then, with the **remaining** subjects only, satisfy each `utmeChoices` group in order. Count matches, need ≥ `pick`, and consume the matched subjects. A shortfall is a FAIL.
   - A subject can never satisfy two rules.
2. **UTME score**
   - If `utmeMinScore` is not null and the score is below it: FAIL.
   - If `utmeMinScore` is null: WARN ("institution minimum not in our verified data").
   - If `lastCutoff` exists and the score is below it: WARN ("below last published departmental cut-off of N for session S").
3. **O'level**
   - Drop sittings whose exam isn't in `olevelAcceptedExams`, with a WARN naming them.
   - Any `awaitingResult` sitting gives a WARN: "cannot confirm until results are out".
   - Enumerate combinations of the remaining sittings, of size 1..`olevelMaxSittings`. For each combination, take the best grade per subject, then evaluate:
     - every `olevelCompulsory` subject meets its `minGrade`
     - each `olevelChoices` group finds ≥ `pick` distinct, unused subjects meeting `minGrade ?? 'C6'`
     - the credit total is at least `olevelMinCredits`. The total is compulsory passes + choice passes, plus any other credits if `olevelOtherSubjectsCount`.
   - Choose a passing combination with the fewest sittings. If none passes, report the combination with the fewest failures, and make its failures FAIL checks.
   - If the result only passes by combining more sittings than allowed, FAIL with a clear message, e.g. "This course allows 1 sitting; you need 2 to meet it."
4. **Special conditions:** each one becomes a `manual` check.
5. **Data trust**
   - `unverified` gives a WARN.
   - `conflicting` gives a WARN that includes the `conflictNote`.
6. **Verdict:**
   - any FAIL → `NOT_ELIGIBLE`
   - else any WARN → `AT_RISK`
   - else `ELIGIBLE`
   - `manual` checks never change the verdict, but always display.

**Tests (minimum):**
- D7 in a compulsory subject fails; C6 passes.
- Three sittings with max 2: the best pair is chosen.
- Max 1 sitting fails when credits are split across two sittings.
- A non-accepted exam is excluded with a WARN.
- A missing UTME compulsory subject fails.
- The same subject can't satisfy a compulsory rule and a choice rule.
- A choice group with `pick: 2` needs two distinct subjects.
- Score below the minimum fails.
- Score between the minimum and the last cut-off gives AT_RISK.
- An `unverified` requirement gives AT_RISK.
- An awaiting result gives AT_RISK.
- An `olevelOtherSubjectsCount` true/false pair.

Commit: `phase 4: eligibility evaluator + tests`.

---

## 9. Phase 5 — The agent

**Packages:**
- `ai@^6`
- `@ai-sdk/mcp@^1`. Its major must match `ai@6`; a bare install pulls a newer major and causes confusing type errors on `model` and `tools`.
- `@ai-sdk/anthropic` (a version compatible with `ai@6`; check its peer dependencies)
- `@sanity/client`, `zod`

### `lib/agent/mcp.ts`
```ts
import { createMCPClient } from '@ai-sdk/mcp'
async function connect(url: string) {
  return createMCPClient({
    transport: { type: 'http', url, headers: { Authorization: `Bearer ${process.env.SANITY_ORGANIZATION_TOKEN}` } },
  })
}
const prefix = (tools: Record<string, any>, p: string) =>
  Object.fromEntries(Object.entries(tools).map(([k, v]) => [`${p}_${k}`, v]))
// open both clients, merge prefix(await rules.tools(),'rules') + prefix(await policy.tools(),'policy')
// ALWAYS close both clients in finally{}
```

### `lib/agent/tools.ts`
- **`evaluate_eligibility`**
  - Input: `{ requirementIds: string[] /* max 10 */ }`.
  - It fetches the docs with `@sanity/client`. Use the query below, but **verify every field name against the deployed schema**:
    ```groq
    *[_type=="requirement" && _id in $ids]{ ..., "programme": programme->{_id,title,"institution": institution->{_id,name,shortName}}, "citations": citations[]{locator, "source": source->{_id,title,url,publisher,authority}} }
    ```
  - It runs `evaluate()` against the **server-held candidate**, which is bound in a closure.
  - It caches results by requirement ID for the response.
- **`submit_verdict`** is the final tool. Use a tool without `execute`, or the SDK's structured-output feature; check the installed version's docs.
  - Input:
    ```ts
    { mode: 'check'|'explore',
      results: Array<{ requirementId: string, headline: string /*≤120 chars*/, explanation: string /*≤600*/,
                       policyNotes: Array<{ text: string, kbPath: string, sourceTitle?: string, sourceUrl?: string }> }>,
      noDataReason?: string }
    ```

### `lib/agent/prompt.ts` — system prompt (refine with the `shape-your-agent` skill)
```
You are Clearance Desk, an admission-requirements checker for Nigerian universities.
You tell a candidate whether their UTME subjects, UTME score and O'level results meet the
published requirements for a programme — before they apply or reach clearance — and why.

HARD RULES
- Never state a requirement, cut-off or policy from memory. Requirements come only from
  rules_groq_query results. Policy statements come only from policy_knowledge_base_read entries.
- The verdict comes ONLY from evaluate_eligibility. Never override or soften it.
- If no requirement exists for the requested programme/session, say so plainly. Do not guess.
- Always name the admission session a requirement applies to.
- Cite everything: requirement citations as returned; policy notes with the Knowledge Base
  entry path and its original source.
- Write for a 17-year-old on a phone: short sentences, plain English. Explain "sitting",
  "credit" and "cut-off" the first time you use them.

WORKFLOW
1. Call rules_initial_context and policy_initial_context once each.
2. Find requirement documents with rules_groq_query (write literal values; no $params).
   - check mode: match the given programme _id; prefer the latest session.
   - explore mode: narrow with GROQ, e.g. requirements whose utmeCompulsory subjects are all
     among the candidate's UTME subjects, optionally limited to chosen institutions. Max 10.
3. Call evaluate_eligibility with those _ids (one call, batch them).
4. For every fail or warn check, read the relevant Knowledge Base entries in ONE
   policy_knowledge_base_read call (up to 20 paths, copied verbatim from the outline).
5. Call submit_verdict. Keep explanations specific: name the exact subject, grade,
   sitting or score that decided the result, and what the candidate can do next.
```

### `lib/agent/run.ts`
- Use `generateText` with the merged tools plus local tools and the system prompt.
- Limit the loop to about 12 steps (`stopWhen: stepCountIs(12)` or the installed equivalent).
- Collect a **trace** from `steps`: `{toolName, input}`. Show GROQ query text and the KB paths read.
- Final response merges:
  1. **evaluator results**, which are the authoritative verdicts and checks
  2. the model's `submit_verdict` text
  3. the trace

### `app/api/check/route.ts`
- `export const maxDuration = 60`
- Validate the body with zod.
- Best-effort per-IP rate limit plus `DAILY_REQUEST_CAP`.
- Never return tokens or raw errors to the client.

**Acceptance for Phase 5:**
- A local `curl` against `/api/check` with a sample candidate returns verdicts.
- The trace shows `rules_groq_query`, `evaluate_eligibility`, `policy_knowledge_base_read` and `submit_verdict`.
- Asking about a programme not in the data returns `noDataReason`, not a guess.

Commit: `phase 5: agent with two Context endpoints`.

---

## 10. Phase 6 — UI (mobile-first; usability is judged)

**`/` (home)**
- One-line pitch.
- **Three "Try a sample candidate" buttons** (✅ eligible, ⚠️ at risk, ❌ "would be rejected at clearance"). These are built from real verified requirements so judges can test in one tap.
- **CandidateForm**
  - **UTME:** score field (0–400), plus 4 subject selects. Use of English is pre-selected and locked. Options come from `subject` docs.
  - **O'level:** 1 sitting by default, "Add sitting" up to 3. Each sitting has:
    - exam select and year
    - an "awaiting result" toggle
    - subject + grade rows (start with 5, max 9)
  - **Target:** institution select → programme select, both loaded server-side via GROQ. Plus a toggle: **"Check this course" / "Show courses I qualify for."**
- **VerdictCard** (one per result)
  - A big status chip: green Eligible / amber At risk / red Not eligible.
  - Programme · institution · session.
  - A check list with icons and details.
  - The model's explanation.
  - **Policy notes** with source links, plus `official`/`secondary` badges.
  - "Data status: verified / unverified / conflicting".
- **TracePanel** (collapsible, "How I got this answer"): the ordered tool calls, with GROQ queries and KB paths shown.
- **Disclaimer** on every result: "Requirements can change. Always confirm with the university and JAMB before you apply."

**`/about`**
- An architecture diagram (from section 2).
- Why there are two endpoints.
- **Data coverage**, live from GROQ: institutions, programmes, sessions, and verified/unverified/conflicting counts.
- Limitations, honestly stated.
- Links: GitHub repo, public dataset query URL.

**Accessibility:** labels on every input, keyboard-usable, sufficient contrast, works at 360px width.

Commit: `phase 6: UI`.

---

## 11. Phase 7 — Deploy

1. 🧍 Import the GitHub repo in Vercel, set **Root Directory = `web`**, and add every env var from `.env.example`.
2. Deploy, then test the 3 sample candidates on the production URL from a phone.
3. Run `npx sanity schema deploy` again if the schema changed.
4. Confirm there's **no login** required anywhere.

Commit: `phase 7: deployed`.

---

## 12. Phase 8 — Eval: prove structure matters

- **`eval/cases.json`**: 12–15 cases.
  - 🧍 The **human sets each expected verdict by hand from the sources.**
  - Mix ✅/⚠️/❌, sittings edge cases, choice-group traps, and one programme not in the data.
- **`scripts/eval.ts`** runs each case through:
  1. **Clearance Desk** (`/api/check`)
  2. **Baseline:** the same model with **no tools**, asked to answer ELIGIBLE / AT_RISK / NOT_ELIGIBLE with reasons
- It writes `eval/results.md`: a table of case, expected, Clearance Desk, baseline, ✓/✗, plus totals.
- **Report the real numbers, including failures.** Fix bugs found and note them in `BUILD_LOG.md`.

Commit: `phase 8: eval`.

---

## 13. Phase 9 — 🧍 Submission post (human writes it; Claude drafts from BUILD_LOG.md + eval)

Use the **Path One submission template** from the challenge page. It pre-fills the tags `devchallenge, sanitychallenge, sanity, ai`.

**Title idea:** *Clearance Desk: an agent that catches the admission you'd lose at clearance*

| Section | What goes in it |
|---|---|
| What I Built | The problem in 3 sentences (admitted, then rejected at clearance; one wrong subject costs a year). Who it's for. One screenshot of a verdict card. |
| Demo | Live URL, plus a **≤2-min video** embedded with `{% embed <youtube-url> %}`. Show: sample ❌ → why → fix → ✅; then explore mode; then the trace panel. Tell judges to tap the sample buttons. |
| Code | Public GitHub repo link. |
| How I Used Sanity | Schema walkthrough (why requirements cite sources, why choice groups and sittings are modelled as data). **Two Context endpoints and why.** Which tools the agent calls and what it does with them. **Knowledge Base:** purpose, sources, **conflict screenshots** and how you resolved them, your Instructions. "The model finds, the code judges." **The eval table** vs the no-tools baseline. |
| Sanity Project Details | **Project ID** plus a **clickable public dataset query URL**. Required. |
| Agent Session | Upload your Claude Code transcript at `dev.to/agent_sessions/new` (Claude Code usually stores transcripts under `~/.claude/projects/`). **Remove secrets first. Click "Make Public".** Embed the most interesting slice. |
| Limitations (add) | Coverage, sessions, beta KB limits, what's unverified. Honesty helps. |

**After publishing:** share the post (X, LinkedIn, WhatsApp dev groups). Reactions are the tie-breaker.

---

## 14. Final checklist (before ~22:00 WAT Sunday)

- [ ] The post is **published** (not draft), in English, with the `#sanitychallenge` tag and the Path One template.
- [ ] The Sanity **Project ID** and a public dataset URL are in the post.
- [ ] The live demo works on mobile with no login; the 3 sample buttons work.
- [ ] The GitHub repo is public, and the README has setup steps plus the architecture.
- [ ] No secrets in the repo or the agent session. The session is set to **Public**.
- [ ] The Knowledge Base is built, its issues resolved, and screenshots are in the post.
- [ ] The eval table is in the post.
- [ ] An API spend limit is set.
- [ ] Only **one** Path One post from you.

---

## 15. Verified gotchas (from Sanity docs)

- **Dataset + Knowledge Base on one endpoint:** the dataset wins and the KB is silently ignored. Use two endpoints.
- **Dataset source ID must be exactly `<projectId>.<dataset>`.** A malformed ID is skipped and the endpoint flips to KB mode, or is refused.
- **Empty schema or no results:** run `sanity schema deploy` (Studio ≥5.1.0). Then check that the GROQ filter isn't excluding everything.
- **401** means the token is missing or malformed. **403 `contextGrantRequired`** means it's not an *organization* token with Context Viewer.
- **`ai@6` requires `@ai-sdk/mcp@^1`.**
- **`knowledge_base_read`:** up to 20 paths per call. Copy paths verbatim from the outline. The KB id is the `kb…` value in `initial_context`.
- **Context MCP is read-only.** It can't write to the dataset; that's fine for this project.
- **Large arrays in `groq_query` results are cropped.** Use `array_field_reader` to read the rest.
- **Document IDs containing `.` aren't publicly readable.** Use hyphens.

---

## 16. Suggested timeline (WAT)

| When | Phase |
|---|---|
| Sat 16:30–18:00 | Phase 0 (human). Start collecting sources in parallel. |
| Sat 18:00–19:30 | Phase 1 |
| Sat 19:30–00:30 | Phase 2 (start the KB build in 7.1 as soon as sources exist) |
| Sun 08:00–10:00 | Phase 3 + Phase 4 |
| Sun 10:00–14:00 | Phase 5 + Phase 6 |
| Sun 14:00–16:00 | Phase 7 + Phase 8 |
| Sun 16:00–22:00 | Phase 9: video, screenshots, post, publish, share |
| Mon 07:59 | **Hard deadline**. Don't plan to use this buffer. |
