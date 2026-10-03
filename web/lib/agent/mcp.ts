import {createMCPClient, type MCPClient} from '@ai-sdk/mcp'

type McpTools = Awaited<ReturnType<MCPClient['tools']>>

/**
 * Tools the agent may use from each endpoint. initial_context is left out because its text is fetched
 * over HTTP and inlined in the system prompt; array_field_reader is left out because no requirement
 * array is long enough to be cropped, and its schema is large.
 */
const ALLOWED = {
  rules: ['groq_query', 'schema_explorer'],
  policy: ['knowledge_base_read', 'knowledge_base_search'],
} as const

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

const auth = () => ({Authorization: `Bearer ${env('SANITY_ORGANIZATION_TOKEN')}`})

function connect(url: string) {
  return createMCPClient({transport: {type: 'http', url, headers: auth()}})
}

const prefix = (tools: McpTools, p: keyof typeof ALLOWED): McpTools =>
  Object.fromEntries(
    Object.entries(tools)
      .filter(([name]) => (ALLOWED[p] as readonly string[]).includes(name))
      .map(([name, t]) => [`${p}_${name}`, t]),
  )

/**
 * Opens both Context endpoints (rules = dataset, policy = Knowledge Base), hands `fn` their tools
 * prefixed `rules_` / `policy_`, and always closes both clients.
 */
export async function withContextTools<T>(fn: (tools: McpTools) => Promise<T>): Promise<T> {
  const clients = await Promise.allSettled([
    connect(env('CONTEXT_RULES_MCP_URL')),
    connect(env('CONTEXT_POLICY_MCP_URL')),
  ])
  try {
    const [rules, policy] = clients.map((c) => {
      if (c.status === 'rejected') throw c.reason
      return c.value
    })
    const [rulesTools, policyTools] = await Promise.all([rules.tools(), policy.tools()])
    return await fn({...prefix(rulesTools, 'rules'), ...prefix(policyTools, 'policy')})
  } finally {
    await Promise.allSettled(clients.map((c) => (c.status === 'fulfilled' ? c.value.close() : undefined)))
  }
}

const initialContextCache = new Map<string, {at: number; text: string}>()

/**
 * The endpoint's initial_context (instructions, schema or KB outline) as Markdown, cached for 10 minutes.
 * Sanity's recommended pattern: inline it in the system prompt instead of spending a tool call on it.
 */
async function fetchInitialContext(mcpUrl: string): Promise<string> {
  const cached = initialContextCache.get(mcpUrl)
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.text
  const url = new URL(mcpUrl)
  url.pathname = `${url.pathname.replace(/\/$/, '')}/initial-context`
  const res = await fetch(url, {headers: auth()})
  if (!res.ok) {
    if (cached) return cached.text
    throw new Error(`initial-context ${url.pathname} returned ${res.status}`)
  }
  const text = await res.text()
  initialContextCache.set(mcpUrl, {at: Date.now(), text})
  return text
}

export async function getInitialContexts(): Promise<{rules: string; policy: string}> {
  const [rules, policy] = await Promise.all([
    fetchInitialContext(env('CONTEXT_RULES_MCP_URL')),
    fetchInitialContext(env('CONTEXT_POLICY_MCP_URL')),
  ])
  return {rules, policy}
}
