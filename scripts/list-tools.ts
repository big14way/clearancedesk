/**
 * Smoke test for the two Sanity Context MCP endpoints (Phase 3).
 *
 *   npm run list-tools
 *
 * Reads CONTEXT_RULES_MCP_URL, CONTEXT_POLICY_MCP_URL and SANITY_ORGANIZATION_TOKEN from web/.env.local (or the
 * environment) and checks that:
 *   - clearance-rules (GROQ mode) lists initial_context, groq_query, schema_explorer, and a groq_query count works
 *   - clearance-policy (Knowledge Base mode) lists initial_context, knowledge_base_read, and one outline path reads
 * The token is never printed.
 */
import {readFile} from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

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

function need(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set (web/.env.local or environment)`)
  return v
}

let rpcId = 0
async function rpc(url: string, method: string, params?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${need('SANITY_ORGANIZATION_TOKEN')}`,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({jsonrpc: '2.0', id: ++rpcId, method, ...(params ? {params} : {})}),
    signal: AbortSignal.timeout(60_000),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status} ${body.slice(0, 300)}`)
  // Streamable HTTP may answer as SSE ("data: {...}") or plain JSON
  const json = body.trimStart().startsWith('{')
    ? JSON.parse(body)
    : JSON.parse(body.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5)).join(''))
  if (json.error) throw new Error(`${method}: ${json.error.code} ${json.error.message}`)
  return json.result
}

const textOf = (result: {content?: Array<{type: string; text?: string}>}) =>
  (result.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')

function expectTools(label: string, tools: string[], required: string[]) {
  const missing = required.filter((t) => !tools.includes(t))
  console.log(`  tools: ${tools.join(', ')}`)
  if (missing.length) throw new Error(`${label}: missing ${missing.join(', ')}`)
  console.log(`  ✔ has ${required.join(', ')}`)
}

async function main() {
  await loadEnv()

  const rulesUrl = need('CONTEXT_RULES_MCP_URL')
  console.log(`clearance-rules  ${rulesUrl}`)
  const rulesTools = (await rpc(rulesUrl, 'tools/list')).tools.map((t: {name: string}) => t.name)
  expectTools('clearance-rules', rulesTools, ['initial_context', 'groq_query', 'schema_explorer'])
  const count = await rpc(rulesUrl, 'tools/call', {name: 'groq_query', arguments: {query: 'count(*[_type == "requirement"])'}})
  console.log(`  ✔ groq_query count(*[_type == "requirement"]) → ${textOf(count).replace(/\s+/g, ' ').slice(0, 300)}`)

  const policyUrl = need('CONTEXT_POLICY_MCP_URL')
  console.log(`\nclearance-policy ${policyUrl}`)
  const policyTools = (await rpc(policyUrl, 'tools/list')).tools.map((t: {name: string}) => t.name)
  expectTools('clearance-policy', policyTools, ['initial_context', 'knowledge_base_read'])
  const outline = textOf(await rpc(policyUrl, 'tools/call', {name: 'initial_context', arguments: {}}))
  const kb = outline.match(/Knowledge base id:\s*`?(kb[A-Za-z0-9_-]+)`?/i)?.[1]
  if (!kb) throw new Error('clearance-policy: no "Knowledge base id: kb…" line in initial_context')
  // first outline path after the id line: lines such as "admission_policy [core]" or "cut_off_marks/lasu"
  const firstPath = outline
    .slice(outline.search(/Knowledge base id:/i))
    .split('\n')
    .map((l) => l.replace(/^[\s>*-]+/, '').replace(/\s+\[(core|peripheral)\]\s*$/, '').trim())
    .find((l) => /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/.test(l))
  if (!firstPath) throw new Error('clearance-policy: could not find an outline path in initial_context')
  console.log(`  ✔ initial_context → knowledge base ${kb}, first path "${firstPath}"`)
  const read = textOf(await rpc(policyUrl, 'tools/call', {name: 'knowledge_base_read', arguments: {knowledgeBase: kb, paths: [firstPath]}}))
  console.log(`  ✔ knowledge_base_read → ${read.replace(/\s+/g, ' ').slice(0, 300)}…`)
}

main().catch((err) => {
  console.error(`✖ ${(err as Error).message}`)
  process.exit(1)
})
