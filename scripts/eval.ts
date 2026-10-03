/**
 * Phase 8 eval: does structure matter?
 *
 *   npm run eval                       # all cases against production
 *   npm run eval -- --url http://localhost:3000 --only C01,C02
 *
 * Runs every case in eval/cases.json through
 *   1. Clearance Desk: POST {url}/api/check (the agent with both Context endpoints and the deterministic evaluator)
 *   2. Keyword-search baseline: the same model and prompt, plus knowledge_base_search/read on the same Knowledge Base
 *   3. Baseline: the same Claude model with no tools, asked for ELIGIBLE / AT_RISK / NOT_ELIGIBLE / NO_DATA
 * and writes eval/results.md (the table) and eval/results.json (verdicts, reasons, traces, timings).
 * ANTHROPIC_API_KEY and MODEL_ID come from web/.env.local or the environment and are never printed.
 */
import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {anthropic} from '@ai-sdk/anthropic'
import {createMCPClient} from '@ai-sdk/mcp'
import {generateText, stepCountIs} from 'ai'

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

// ------------------------------------------------------------------ 3. Keyword-search baseline: same model + Knowledge Base search

const env = (k: string) => {
  const v = process.env[k]
  if (!v) throw new Error(`${k} is not set (web/.env.local or the environment)`)
  return v
}

async function policyInitialContext(): Promise<string> {
  const url = new URL(env('CONTEXT_POLICY_MCP_URL'))
  url.pathname = `${url.pathname.replace(/\/$/, '')}/initial-context`
  const res = await fetch(url, {headers: {Authorization: `Bearer ${env('SANITY_ORGANIZATION_TOKEN')}`}})
  if (!res.ok) throw new Error(`initial-context returned ${res.status}`)
  return res.text()
}

const KB_SYSTEM = (outline: string) => `${BASELINE_SYSTEM}

You can search and read a Knowledge Base built from JAMB's and the universities' own 2026/2027 admission documents. Look up the requirements there before you answer (knowledge_base_search finds entries by keyword; knowledge_base_read reads them), and answer from what you read.

${outline.trim()}`

/** Same model and prompt as the baseline; with tools=KB it can search and read the Knowledge Base. */
async function runModel(
  modelId: string,
  c: Case,
  name: (id: string) => string,
  kb?: {outline: string},
): Promise<Outcome> {
  const started = Date.now()
  const client = kb
    ? await createMCPClient({
        transport: {type: 'http', url: env('CONTEXT_POLICY_MCP_URL'), headers: {Authorization: `Bearer ${env('SANITY_ORGANIZATION_TOKEN')}`}},
      })
    : null
  try {
    const all = client ? await client.tools() : {}
    const tools = Object.fromEntries(Object.entries(all).filter(([k]) => k === 'knowledge_base_search' || k === 'knowledge_base_read'))
    const {text, steps} = await generateText({
      model: anthropic(modelId),
      system: kb ? KB_SYSTEM(kb.outline) : BASELINE_SYSTEM,
      prompt: baselinePrompt(c, name),
      ...(client ? {tools, stopWhen: stepCountIs(10)} : {}),
      maxOutputTokens: 4000,
      // Generous on purpose: adaptive thinking, which the agent's between-tools setting doesn't get.
      providerOptions: modelId.startsWith('claude-sonnet-5') ? {anthropic: {thinking: {type: 'adaptive'}, effort: 'medium'}} : {},
    })
    const seconds = Math.round((Date.now() - started) / 1000)
    const parsed = firstVerdictObject(text)
    const verdict = VERDICTS.find((v) => v === parsed.verdict?.trim().toUpperCase())
    const extra = client ? {kbCalls: steps.flatMap((s) => s.toolCalls.map((t) => t.toolName))} : undefined
    return verdict
      ? {verdict, detail: parsed.reasons ?? '', seconds, extra}
      : {verdict: 'ERROR', detail: `unparseable answer: ${text.slice(0, 160)}`, seconds, extra}
  } catch (e) {
    return {verdict: 'ERROR', detail: (e as Error).message.slice(0, 200), seconds: Math.round((Date.now() - started) / 1000)}
  } finally {
    await client?.close()
  }
}

/** The first balanced {...} in the text that parses as JSON and has a verdict (models sometimes add text after it). */
function firstVerdictObject(text: string): {verdict?: string; reasons?: string} {
  for (let i = text.indexOf('{'); i >= 0; i = text.indexOf('{', i + 1)) {
    let depth = 0
    let inString = false
    for (let j = i; j < text.length; j++) {
      const ch = text[j]
      if (inString) {
        if (ch === '\\') j++
        else if (ch === '"') inString = false
      } else if (ch === '"') inString = true
      else if (ch === '{') depth++
      else if (ch === '}' && --depth === 0) {
        try {
          const obj = JSON.parse(text.slice(i, j + 1))
          if (obj && typeof obj.verdict === 'string') return obj
        } catch {
          // not JSON; keep looking
        }
        break
      }
    }
  }
  return {}
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

type Row = {c: Case; desk: Outcome; kb: Outcome; base: Outcome}
const SYSTEMS = [
  ['desk', 'Clearance Desk'],
  ['kb', 'Same model + Knowledge Base search'],
  ['base', 'Same model, no tools'],
] as const

function report(rows: Row[], meta: {url: string; model: string; date: string; notes?: string[]}): string {
  const right = (k: (typeof SYSTEMS)[number][0]) => rows.filter((r) => r[k].verdict === r.c.expected).length
  // The costly mistake: telling a candidate who would be rejected that they're fine.
  const falseGreen = (k: (typeof SYSTEMS)[number][0]) =>
    rows.filter((r) => r.c.expected === 'NOT_ELIGIBLE' && r[k].verdict === 'ELIGIBLE').length
  const declined = (k: (typeof SYSTEMS)[number][0]) =>
    rows.filter((r) => r.c.expected !== 'NO_DATA' && r[k].verdict === 'NO_DATA').length
  const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]
  const v = (o: Outcome, want: string) => `${LABEL[o.verdict]} ${mark(o.verdict, want)}`

  return [
    '# Eval results',
    '',
    `Run ${meta.date} · ${rows.length} cases · model \`${meta.model}\` · Clearance Desk at ${meta.url}`,
    '',
    'Expected verdicts come from `eval/cases.json`. See that file for who set them and the evidence for each.',
    '',
    ...(meta.notes?.length ? [...meta.notes.map((n) => `> ${n}`), ''] : []),
    '- **Clearance Desk:** the agent, with both Sanity Context endpoints and the deterministic evaluator.',
    '- **Same model + Knowledge Base search:** the keyword-search baseline. It gets the same prompt, plus `knowledge_base_search`/`knowledge_base_read` on the same Knowledge Base and its outline, but no structured rules and no evaluator.',
    '- **Same model, no tools:** memory only.',
    '',
    '| Case | What it tests | Expected | Clearance Desk | + KB search | No tools |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.c.id} | ${cell(r.c.title)} | ${LABEL[r.c.expected!]} | ${v(r.desk, r.c.expected!)} | ${v(r.kb, r.c.expected!)} | ${v(r.base, r.c.expected!)} |`),
    '',
    '## Totals',
    '',
    `| | ${SYSTEMS.map(([, n]) => n).join(' | ')} |`,
    '|---|---|---|---|',
    `| Correct | ${SYSTEMS.map(([k]) => `**${right(k)} / ${rows.length}**`).join(' | ')} |`,
    `| Said "Eligible" to a candidate who fails a rule | ${SYSTEMS.map(([k]) => falseGreen(k)).join(' | ')} |`,
    `| Declined ("no data") instead of answering | ${SYSTEMS.map(([k]) => declined(k)).join(' | ')} |`,
    `| Median time | ${SYSTEMS.map(([k]) => `${median(rows.map((r) => r[k].seconds))} s`).join(' | ')} |`,
    '',
    '## Every answer',
    '',
    ...rows.flatMap((r) => [
      `**${r.c.id}: ${r.c.title}.** Expected: ${LABEL[r.c.expected!]}.`,
      '',
      ...SYSTEMS.map(([k, n]) => `- ${n} (${v(r[k], r.c.expected!)}): ${cell(r[k].detail)}`),
      '',
    ]),
  ].join('\n')
}

type Key = 'desk' | 'kb' | 'base'
const JSON_KEY: Record<Key, 'clearanceDesk' | 'kbSearch' | 'baseline'> = {desk: 'clearanceDesk', kb: 'kbSearch', base: 'baseline'}

async function main() {
  await loadEnv()
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set (web/.env.local or the environment)')
  const url = (arg('url') ?? 'https://clearancedesk.vercel.app').replace(/\/$/, '')
  const model = process.env.MODEL_ID || 'claude-sonnet-5-5'
  const only = arg('only')?.split(',')
  const systems = (arg('systems') ?? 'desk,kb,base').split(',') as Key[]
  // --merge: re-run only the selected cases/systems and keep every other answer from eval/results.json.
  const merge = process.argv.includes('--merge')

  const {cases} = JSON.parse(await readFile(path.join(ROOT, 'eval/cases.json'), 'utf8')) as {cases: Case[]}
  const selected = cases.filter((c) => !only || only.includes(c.id))
  const missing = selected.filter((c) => !c.expected)
  if (missing.length) throw new Error(`No expected verdict yet for ${missing.map((c) => c.id).join(', ')}`)
  if (!merge && systems.length < 3) throw new Error('Running only some systems needs --merge')

  const [names, outline] = await Promise.all([loadNames(), policyInitialContext()])
  const name = (id: string) => names.get(id) ?? id
  console.log(`Running ${selected.length} cases (${systems.join(', ')}): Clearance Desk at ${url}, model ${model}…`)

  const log = (who: string) => (c: Case, o: Outcome) => console.log(`  ${who} ${c.id} ${o.verdict.padEnd(12)} ${mark(o.verdict, c.expected!)} ${o.seconds}s`)
  const runners: Record<Key, (c: Case) => Promise<Outcome>> = {
    desk: (c) => runClearanceDesk(url, c),
    kb: (c) => runModel(model, c, name, {outline}),
    base: (c) => runModel(model, c, name),
  }
  const limits: Record<Key, number> = {desk: 3, kb: 3, base: 4}
  const fresh = Object.fromEntries(
    await Promise.all(
      systems.map(async (k) => [k, await pool(selected, limits[k], async (c) => {
        const o = await runners[k](c)
        log(k.padEnd(4))(c, o)
        return o
      })] as const),
    ),
  ) as Partial<Record<Key, Outcome[]>>

  const previous = merge
    ? new Map(
        (JSON.parse(await readFile(path.join(ROOT, 'eval/results.json'), 'utf8')) as {rows: Array<Record<string, unknown> & {id: string}>}).rows.map((r) => [r.id, r]),
      )
    : new Map()
  const rows: Row[] = (merge ? cases : selected).map((c) => {
    const i = selected.indexOf(c)
    const pick = (k: Key): Outcome => {
      const got = i >= 0 ? fresh[k]?.[i] : undefined
      if (got) return got
      const old = previous.get(c.id)?.[JSON_KEY[k]] as Outcome | undefined
      if (!old) throw new Error(`No previous ${k} answer for ${c.id} to merge with`)
      return old
    }
    return {c, desk: pick('desk'), kb: pick('kb'), base: pick('base')}
  })

  const date = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  const notes = merge ? [`Merged run: ${systems.join(', ')} re-run for ${selected.map((c) => c.id).join(', ')} on ${date}; every other answer is from the previous run.`] : []
  await writeFile(path.join(ROOT, 'eval/results.md'), report(rows, {url, model, date, notes}) + '\n')
  await writeFile(
    path.join(ROOT, 'eval/results.json'),
    JSON.stringify({date, url, model, notes, rows: rows.map((r) => ({id: r.c.id, expected: r.c.expected, clearanceDesk: r.desk, kbSearch: r.kb, baseline: r.base}))}, null, 2) + '\n',
  )
  const right = (k: Key) => rows.filter((r) => r[k].verdict === r.c.expected).length
  console.log(`\nClearance Desk ${right('desk')}/${rows.length} · + KB search ${right('kb')}/${rows.length} · no tools ${right('base')}/${rows.length} → eval/results.md`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
