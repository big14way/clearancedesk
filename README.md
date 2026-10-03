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

Setup steps and architecture will be filled in as phases land.
