# Clearance Desk

An AI agent that tells Nigerian university applicants whether their **UTME subjects, UTME score and O'level results** meet the published requirements for a specific course at a specific university — *before* they apply, so they don't get admitted and then rejected at clearance.

Built for the DEV × Sanity Challenge, Path One: "Ship an Agent That Queries Real Content".

**Core principle: the model finds and explains; deterministic code judges.**

> 🚧 Work in progress. See [`BUILD_SPEC.md`](BUILD_SPEC.md) for the plan and [`BUILD_LOG.md`](BUILD_LOG.md) for the build journal.

## Layout

| Path | What |
|---|---|
| `studio/` | Sanity Studio + schema (sources, subjects, institutions, programmes, requirements) |
| `data/` | `sources.yaml`, `catalog.yaml`, generated `seed.ndjson` |
| `scripts/` | NDJSON builder, MCP endpoint checks, eval runner |
| `web/` | Next.js app: form, `/api/check` agent route, deterministic eligibility evaluator |

## Data (Phase 2)

34 admission requirements for the **2026/2027** session across 5 universities: UNILAG, UI, OAU, UNN and LASU. The courses are Medicine, Nursing, Computer Science, Electrical/Electronic Engineering, Economics, Accounting, Law and Mass Communication, where the sources allow.

- Every rule traces to a saved official source. These are JAMB's brochure (the IBASS API plus its PDFs) and each university's own 2026 notices and requirement documents. They are listed in [`data/sources.yaml`](data/sources.yaml).
- 13 requirements are `verified`, meaning every field was checked against its sources by an independent pass. 21 are `conflicting`, meaning official sources disagree. For those, the stricter rule is encoded and `conflictNote` names both sources.
- Public dataset (no token needed): [`*[_type=="requirement"]{_id,session}`](https://cynv9mfk.api.sanity.io/v2026-09-01/data/query/production?query=*%5B_type%3D%3D%22requirement%22%5D%7B_id%2Csession%7D). Project ID `cynv9mfk`, dataset `production`.

Rebuild the dataset from source:

```bash
npm install
npm run fetch:jamb     # JAMB brochure → data/raw/jamb-ibass/ (data/raw is gitignored)
npm run build:seed     # data/catalog.yaml + data/sources.yaml → data/seed.ndjson (validates refs, grades, UTME = 4, citations)
cd studio && npx sanity dataset import ../data/seed.ndjson production --replace
```

Setup steps for the agent and web app are added as later phases land.
