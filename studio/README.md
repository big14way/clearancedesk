# Clearance Desk — Sanity Studio

Studio and schema for the Clearance Desk dataset (project `cynv9mfk`, dataset `production`, public).

```bash
npm install
npm run dev                # http://localhost:3333
npx sanity schema deploy   # required after any schema change: Sanity Context reads the deployed schema
```

Schema lives in [`schemaTypes/`](schemaTypes); the desk structure in [`structure.ts`](structure.ts).
