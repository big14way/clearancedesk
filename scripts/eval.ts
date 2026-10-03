/**
 * Phase 8 eval: does structure matter?
 *
 *   npm run eval                       # all cases against production
 *   npm run eval -- --url http://localhost:3000 --only C01,C02
 *
 * Runs every case in eval/cases.json through
 *   1. Clearance Desk: POST {url}/api/check (the agent with both Context endpoints and the deterministic evaluator)
 *   2. Baseline: the same Claude model with no tools, asked for ELIGIBLE / AT_RISK / NOT_ELIGIBLE / NO_DATA
 * and writes eval/results.md (the table) and eval/results.json (verdicts, reasons, traces, timings).
 * ANTHROPIC_API_KEY and MODEL_ID come from web/.env.local or the environment and are never printed.
 */
import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {anthropic} from '@ai-sdk/anthropic'
import {generateText} from 'ai'

const ROOT = path.resolve(import.meta.dirname, '..')
const VERDICTS = ['ELIGIBLE', 'AT_RISK', 'NOT_ELIGIBLE', 'NO_DATA'] as const
type Verdict = (typeof VERDICTS)[number]

type Grade = string
type Request = {
  mode: 'check'
  target: {programmeId?: string; programmeName?: string; institutionIds?: string[]}
  candidate: {
    utme: {score: number; subjects: string[]}
    olevel: {sittings: Array<{exam: string; year: number; awaitingResult?: boolean; results: Array<{subjectId: string; grade: Grade}>}>}
  }
}
type Case = {id: string; title: string; tests: string; request: Request; expected: Verdict | null}
type Outcome = {verdict: Verdict | 'ERROR'; detail: string; seconds: number; extra?: Record<string, unknown>}

async function loadEnv() {
  try {
    const text = await readFile(path.join(ROOT, 'web/.env.local'), 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*([^#\s]*)/)
      if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch {
    // fall back to the process environment
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : undefined
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Runs `fn` over `items` with at most `limit` in flight, keeping order. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({length: Math.min(limit, items.length)}, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

// ------------------------------------------------------------------ names, from the public dataset

async function loadNames(): Promise<Map<string, string>> {
  const query = `*[_type in ["subject", "programme", "institution"]]{_id, "name": coalesce(name, title), "school": institution->name}`
  const url = `https://cynv9mfk.api.sanity.io/v2026-09-01/data/query/production?query=${encodeURIComponent(query)}`
  const {result} = (await (await fetch(url)).json()) as {result: Array<{_id: string; name: string; school?: string}>}
  return new Map(result.map((r) => [r._id, r.school ? `${r.name} at ${r.school}` : r.name]))
}

// ------------------------------------------------------------------ 1. Clearance Desk

async function runClearanceDesk(url: string, c: Case): Promise<Outcome> {
  let started = Date.now()
  for (let attempt = 0; attempt < 15; attempt++) {
    started = Date.now() // time the answered attempt only, not rate-limit waits
    const res = await fetch(`${url}/api/check`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(c.request),
      signal: AbortSignal.timeout(90_000),
    }).catch((e: Error) => ({ok: false, status: 0, json: async () => ({error: e.message})}) as const)
    if (res.status === 429) {
      // The deployed route allows about 10 checks per IP per 10 minutes; wait for the window to move.
      await sleep(60_000)
      continue
    }
    const body = (await res.json().catch(() => ({}))) as {
      error?: string
      results?: Array<{verdict: Verdict; headline: string; explanation: string | null}>
      noDataReason?: string | null
      explained?: boolean
      trace?: Array<{toolName: string}>
    }
    const seconds = Math.round((Date.now() - started) / 1000)
    if (!res.ok) return {verdict: 'ERROR', detail: `HTTP ${res.status}: ${body.error ?? ''}`, seconds}
    const first = body.results?.[0]
    const extra = {explained: body.explained, trace: body.trace?.map((t) => t.toolName)}
    if (!first) return {verdict: 'NO_DATA', detail: body.noDataReason ?? '', seconds, extra}
    return {verdict: first.verdict, detail: first.headline, seconds, extra: {...extra, explanation: first.explanation}}
  }
  return {verdict: 'ERROR', detail: 'still rate-limited after 15 minutes', seconds: Math.round((Date.now() - started) / 1000)}
}

// ------------------------------------------------------------------ 2. Baseline: same model, no tools

const BASELINE_SYSTEM = `You are an expert on Nigerian university admissions: JAMB UTME subject combinations, UTME minimum scores, and O'level (WAEC, NECO, NABTEB, GCE) credit and sitting requirements for each university and course.`

function baselinePrompt(c: Case, name: (id: string) => string): string {
  const {target, candidate} = c.request
  const course = target.programmeId ? name(target.programmeId) : `${target.programmeName} at ${target.institutionIds?.map(name).join(', ')}`
  const sittings = candidate.olevel.sittings.map(
    (s, i) =>
      `- Sitting ${i + 1}: ${s.exam} ${s.year}${s.awaitingResult ? ' (awaiting result; these are expected grades)' : ''}: ${s.results.map((r) => `${name(r.subjectId)} ${r.grade}`).join(', ')}`,
  )
  return `A candidate wants to know if they meet the published admission requirements for ${course} in the 2026/2027 session.

UTME score: ${candidate.utme.score}
UTME subjects: ${candidate.utme.subjects.map(name).join(', ')}
O'level results:
${sittings.join('\n')}

Answer with one verdict:
- ELIGIBLE: meets every published requirement that can be checked from these results.
- AT_RISK: may qualify, but something can't be confirmed (an awaited result, official sources that disagree, or a minimum that isn't published).
- NOT_ELIGIBLE: fails at least one published requirement.
- NO_DATA: you don't know this course's requirements well enough to judge.
Ignore conditions that can't be checked from the results (age, first choice, Post-UTME, deadlines).

Reply with only a JSON object: {"verdict": "...", "reasons": "two or three sentences"}`
}

async function runBaseline(modelId: string, c: Case, name: (id: string) => string): Promise<Outcome> {
  const started = Date.now()
  try {
    const {text} = await generateText({
      model: anthropic(modelId),
      system: BASELINE_SYSTEM,
      prompt: baselinePrompt(c, name),
      maxOutputTokens: 4000,
      // Generous on purpose: the baseline gets adaptive thinking, which the agent's between-tools setting doesn't.
      providerOptions: modelId.startsWith('claude-sonnet-5') ? {anthropic: {thinking: {type: 'adaptive'}, effort: 'medium'}} : {},
    })
    const seconds = Math.round((Date.now() - started) / 1000)
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    const parsed = json ? (JSON.parse(json) as {verdict?: string; reasons?: string}) : {}
    const verdict = VERDICTS.find((v) => v === parsed.verdict?.trim().toUpperCase())
    return verdict
      ? {verdict, detail: parsed.reasons ?? '', seconds}
      : {verdict: 'ERROR', detail: `unparseable answer: ${text.slice(0, 160)}`, seconds}
  } catch (e) {
    return {verdict: 'ERROR', detail: (e as Error).message.slice(0, 200), seconds: Math.round((Date.now() - started) / 1000)}
  }
}

// ------------------------------------------------------------------ report

const LABEL: Record<string, string> = {
  ELIGIBLE: 'Eligible',
  AT_RISK: 'At risk',
  NOT_ELIGIBLE: 'Not eligible',
  NO_DATA: 'No data',
  ERROR: 'Error',
}
const mark = (got: string, want: string) => (got === want ? '✓' : '✗')
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()

function report(rows: Array<{c: Case; desk: Outcome; base: Outcome}>, meta: {url: string; model: string; date: string}): string {
  const deskRight = rows.filter((r) => r.desk.verdict === r.c.expected).length
  const baseRight = rows.filter((r) => r.base.verdict === r.c.expected).length
  // The costly mistake: telling a candidate who would be rejected that they're fine.
  const falseGreen = (o: (r: (typeof rows)[number]) => Outcome) =>
    rows.filter((r) => r.c.expected === 'NOT_ELIGIBLE' && o(r).verdict === 'ELIGIBLE').length
  const declined = (o: (r: (typeof rows)[number]) => Outcome) =>
    rows.filter((r) => r.c.expected !== 'NO_DATA' && o(r).verdict === 'NO_DATA').length
  const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]

  const lines = [
    '# Eval results',
    '',
    `Run ${meta.date} · ${rows.length} cases · model \`${meta.model}\` · Clearance Desk at ${meta.url}`,
    '',
    'Expected verdicts come from `eval/cases.json`. See that file for who set them and the evidence for each.',
    '',
    '| Case | What it tests | Expected | Clearance Desk | | Baseline (no tools) | |',
    '|---|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.c.id} | ${cell(r.c.title)} | ${LABEL[r.c.expected!]} | ${LABEL[r.desk.verdict]} | ${mark(r.desk.verdict, r.c.expected!)} | ${LABEL[r.base.verdict]} | ${mark(r.base.verdict, r.c.expected!)} |`,
    ),
    '',
    '## Totals',
    '',
    '| | Clearance Desk | Baseline |',
    '|---|---|---|',
    `| Correct | **${deskRight} / ${rows.length}** | **${baseRight} / ${rows.length}** |`,
    `| Said "Eligible" to a candidate who fails a rule | ${falseGreen((r) => r.desk)} | ${falseGreen((r) => r.base)} |`,
    `| Declined ("no data") instead of answering | ${declined((r) => r.desk)} | ${declined((r) => r.base)} |`,
    `| Median time | ${median(rows.map((r) => r.desk.seconds))} s | ${median(rows.map((r) => r.base.seconds))} s |`,
    '',
    '## Every answer',
    '',
    ...rows.flatMap((r) => [
      `**${r.c.id}: ${r.c.title}.** Expected: ${LABEL[r.c.expected!]}.`,
      '',
      `- Clearance Desk (${LABEL[r.desk.verdict]} ${mark(r.desk.verdict, r.c.expected!)}): ${cell(r.desk.detail)}`,
      `- Baseline (${LABEL[r.base.verdict]} ${mark(r.base.verdict, r.c.expected!)}): ${cell(r.base.detail)}`,
      '',
    ]),
  ]
  return lines.join('\n')
}

async function main() {
  await loadEnv()
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set (web/.env.local or the environment)')
  const url = (arg('url') ?? 'https://clearancedesk.vercel.app').replace(/\/$/, '')
  const model = process.env.MODEL_ID || 'claude-sonnet-5-5'
  const only = arg('only')?.split(',')

  const {cases} = JSON.parse(await readFile(path.join(ROOT, 'eval/cases.json'), 'utf8')) as {cases: Case[]}
  const selected = cases.filter((c) => !only || only.includes(c.id))
  const missing = selected.filter((c) => !c.expected)
  if (missing.length) throw new Error(`No expected verdict yet for ${missing.map((c) => c.id).join(', ')}`)

  const names = await loadNames()
  const name = (id: string) => names.get(id) ?? id
  console.log(`Running ${selected.length} cases against ${url} and the no-tools baseline (${model})…`)

  const [desk, base] = await Promise.all([
    pool(selected, 3, async (c) => {
      const o = await runClearanceDesk(url, c)
      console.log(`  desk ${c.id} ${o.verdict.padEnd(12)} ${mark(o.verdict, c.expected!)} ${o.seconds}s`)
      return o
    }),
    pool(selected, 4, async (c) => {
      const o = await runBaseline(model, c, name)
      console.log(`  base ${c.id} ${o.verdict.padEnd(12)} ${mark(o.verdict, c.expected!)} ${o.seconds}s`)
      return o
    }),
  ])

  const rows = selected.map((c, i) => ({c, desk: desk[i], base: base[i]}))
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  await writeFile(path.join(ROOT, 'eval/results.md'), report(rows, {url, model, date}) + '\n')
  await writeFile(
    path.join(ROOT, 'eval/results.json'),
    JSON.stringify({date, url, model, rows: rows.map((r) => ({id: r.c.id, expected: r.c.expected, clearanceDesk: r.desk, baseline: r.base}))}, null, 2) + '\n',
  )
  const right = (k: 'desk' | 'base') => rows.filter((r) => r[k].verdict === r.c.expected).length
  console.log(`\nClearance Desk ${right('desk')}/${rows.length} · baseline ${right('base')}/${rows.length} → eval/results.md`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
