import {anthropic, type AnthropicLanguageModelOptions} from '@ai-sdk/anthropic'
import {generateText, stepCountIs, type StopCondition, type ToolSet} from 'ai'
import {z} from 'zod'
import {
  candidateSchema,
  type Check,
  type Citation,
  type Verdict,
  type VerificationStatus,
} from '@/lib/eligibility/types'
import {getSourceLookup, getSubjectNames} from '@/lib/sanity/client'
import {getInitialContexts, withContextTools} from './mcp'
import {buildSystemPrompt, buildUserPrompt} from './prompt'
import {createLocalTools, readVerdict, type Evaluated, type VerdictInput} from './tools'

export const checkRequestSchema = z
  .object({
    mode: z.enum(['check', 'explore']),
    candidate: candidateSchema,
    target: z
      .object({
        programmeId: z.string().max(120).regex(/^programme-[a-z0-9-]+$/, 'Not a programme _id').optional(),
        programmeName: z.string().trim().min(2).max(80).optional(),
        institutionIds: z
          .array(z.string().max(80).regex(/^institution-[a-z0-9-]+$/, 'Not an institution _id'))
          .max(5)
          .optional(),
      })
      .optional(),
  })
  .refine((r) => r.mode === 'explore' || r.target?.programmeId || r.target?.programmeName, {
    message: 'Check mode needs target.programmeId or target.programmeName',
    path: ['target'],
  })

export type CheckRequest = z.infer<typeof checkRequestSchema>

export type PolicyNote = {
  text: string
  kbPath: string
  sourceTitle?: string
  sourceUrl?: string
  /** Looked up from the source documents by URL; absent when the URL isn't one of ours. */
  authority?: 'official' | 'secondary'
}

export type TraceStep = {toolName: string; input: unknown; error?: true}

export type CheckResult = {
  requirementId: string
  programme: {_id?: string; title?: string}
  institution: {_id?: string; name?: string; shortName?: string}
  session: string
  /** From the deterministic evaluator; the model never sets it. */
  verdict: Verdict
  /** Every check cites the requirement's sources, so those are sent once, in `citations`. */
  checks: Array<Omit<Check, 'citations'>>
  dataStatus: VerificationStatus
  conflictNote: string | null
  lastVerified: string | null
  citations: Citation[]
  headline: string
  /** The model's explanation, or null when it didn't submit one. */
  explanation: string | null
  policyNotes: PolicyNote[]
}

export type CheckResponse = {
  mode: 'check' | 'explore'
  results: CheckResult[]
  noDataReason: string | null
  trace: TraceStep[]
  /** False when the agent stopped before calling submit_verdict; verdicts are still the evaluator's. */
  explained: boolean
  model: string
}

const MAX_STEPS = 12
const VERDICT_ORDER: Verdict[] = ['ELIGIBLE', 'AT_RISK', 'NOT_ELIGIBLE']

/** Trims to `max` characters at a word boundary. */
function clip(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > max / 2 ? cut.lastIndexOf(' ') : cut.length).trimEnd()}…`
}

function fallbackHeadline({requirement, result}: Evaluated): string {
  const course = `${requirement.programme?.title ?? 'this course'} at ${requirement.programme?.institution?.shortName ?? 'the university'} (${requirement.session})`
  if (result.verdict === 'ELIGIBLE') return `You meet the published requirements for ${course}.`
  if (result.verdict === 'AT_RISK') return `You may qualify for ${course}, but check the warnings.`
  return `You don't meet the published requirements for ${course}.`
}

function modelOptions(modelId: string) {
  // Sonnet 5.5 always thinks; between_tools at low effort is its lightest setting. At medium effort an
  // explore run took up to 52s against the 60s function limit; at low it took 24-32s with similar text.
  if (modelId.startsWith('claude-sonnet-5-5')) {
    return {thinking: {type: 'between_tools'}, effort: 'low'} satisfies AnthropicLanguageModelOptions
  }
  return {}
}

/** Shows the GROQ text and KB paths as sent; submit_verdict is summarised. */
function traceInput(toolName: string, input: unknown): unknown {
  if (toolName !== 'submit_verdict') return input
  const verdict = readVerdict(input)
  if (!verdict) return {invalid: true}
  return {
    requirementIds: verdict.results.map((r) => r.requirementId),
    ...(verdict.noDataReason ? {noDataReason: verdict.noDataReason} : {}),
  }
}

/**
 * Stops once submit_verdict carries a usable verdict. A malformed one doesn't stop the loop: the SDK returns the
 * validation error to the model, which then retries (seen in testing: `results` sent as a JSON string).
 */
function usableVerdict<TOOLS extends ToolSet>(): StopCondition<TOOLS> {
  return ({steps}) =>
    steps.at(-1)?.toolCalls.some((c) => c.toolName === 'submit_verdict' && readVerdict(c.input) !== null) ?? false
}

export async function runCheck(request: CheckRequest, abortSignal?: AbortSignal): Promise<CheckResponse> {
  const modelId = process.env.MODEL_ID || 'claude-sonnet-5-5'
  const evaluated = new Map<string, Evaluated>()
  const [context, names, findSource] = await Promise.all([getInitialContexts(), getSubjectNames(), getSourceLookup()])

  const steps = await withContextTools(async (contextTools) => {
    const result = await generateText({
      model: anthropic(modelId),
      system: {
        role: 'system',
        content: buildSystemPrompt(context),
        providerOptions: {anthropic: {cacheControl: {type: 'ephemeral'}}},
      },
      prompt: buildUserPrompt(request.mode, request.target, request.candidate, (id) => names.get(id) ?? id),
      tools: {
        ...contextTools,
        ...createLocalTools({candidate: request.candidate, programmeId: request.target?.programmeId, evaluated}),
      },
      stopWhen: [stepCountIs(MAX_STEPS), usableVerdict()],
      maxOutputTokens: 8000,
      providerOptions: {anthropic: modelOptions(modelId)},
      abortSignal,
    })
    return result.steps
  })

  const trace: TraceStep[] = []
  const kbPathsRead = new Set<string>()
  let verdict: VerdictInput | null = null

  for (const step of steps) {
    const failed = new Set(step.content.flatMap((part) => (part.type === 'tool-error' ? [part.toolCallId] : [])))
    for (const call of step.toolCalls) {
      trace.push({
        toolName: call.toolName,
        input: traceInput(call.toolName, call.input),
        ...(failed.has(call.toolCallId) ? {error: true as const} : {}),
      })
      if (call.toolName === 'policy_knowledge_base_read' && !failed.has(call.toolCallId)) {
        const paths = (call.input as {paths?: unknown})?.paths
        if (Array.isArray(paths)) paths.forEach((p) => typeof p === 'string' && kbPathsRead.add(p))
      }
      if (call.toolName === 'submit_verdict') verdict = readVerdict(call.input) ?? verdict
    }
  }

  const written = new Map((verdict?.results ?? []).map((r) => [r.requirementId, r]))

  const results: CheckResult[] = [...evaluated.values()].map((e) => {
    const text = written.get(e.result.requirementId)
    return {
      requirementId: e.result.requirementId,
      programme: {_id: e.requirement.programme?._id, title: e.requirement.programme?.title},
      institution: e.requirement.programme?.institution ?? {},
      session: e.requirement.session,
      verdict: e.result.verdict,
      checks: e.result.checks.map(({id, label, status, detail}) => ({id, label, status, detail})),
      dataStatus: e.requirement.verificationStatus,
      conflictNote: e.requirement.conflictNote ?? null,
      lastVerified: e.requirement.lastVerified ?? null,
      citations: e.requirement.citations,
      headline: text?.headline.trim() ? clip(text.headline, 120) : fallbackHeadline(e),
      explanation: text?.explanation.trim() ? clip(text.explanation, 600) : null,
      // A policy note must point at an entry this run actually read.
      policyNotes: (text?.policyNotes ?? [])
        .filter((n) => kbPathsRead.has(n.kbPath) && n.text.trim())
        .map((n) => {
          // Prefer our own source document (title, URL, authority) over what the model copied.
          const source = findSource({url: n.sourceUrl, title: n.sourceTitle})
          const url = source?.url ?? (n.sourceUrl && /^https?:\/\//.test(n.sourceUrl) ? n.sourceUrl : undefined)
          const title = source?.title ?? (n.sourceTitle && !/\.(md|pdf)\b/i.test(n.sourceTitle) ? n.sourceTitle : undefined)
          return {
            text: clip(n.text, 400),
            kbPath: n.kbPath,
            ...(title ? {sourceTitle: clip(title, 200)} : {}),
            ...(url ? {sourceUrl: url} : {}),
            ...(source?.authority ? {authority: source.authority} : {}),
          }
        }),
    }
  })

  results.sort((a, b) =>
    request.mode === 'explore'
      ? VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict) ||
        `${a.institution.shortName} ${a.programme.title}`.localeCompare(`${b.institution.shortName} ${b.programme.title}`)
      : b.session.localeCompare(a.session),
  )

  const fallbackReason =
    request.mode === 'check'
      ? "Clearance Desk has no published admission requirement for this course yet, so it can't check it. Ask the university or JAMB directly."
      : 'No course in Clearance Desk’s data matched your UTME subjects.'

  return {
    mode: request.mode,
    results,
    noDataReason: results.length ? null : clip(verdict?.noDataReason?.trim() || fallbackReason, 600),
    trace,
    explained: verdict !== null,
    model: modelId,
  }
}
