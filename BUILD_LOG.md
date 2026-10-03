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
