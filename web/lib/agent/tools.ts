import {tool} from 'ai'
import {z} from 'zod'
import {evaluate} from '@/lib/eligibility/evaluate'
import {normalizeRequirement, type RawRequirement} from '@/lib/eligibility/normalize'
import type {Candidate, EvaluationResult, Requirement} from '@/lib/eligibility/types'
import {getSubjectNames, sanity} from '@/lib/sanity/client'

/** Field names checked against the deployed schema (requirement, programme, institution, source). */
const REQUIREMENT_QUERY = `*[_type == "requirement" && _id in $ids]{
  ...,
  "programme": programme->{_id, title, "institution": institution->{_id, name, shortName}},
  "citations": citations[]{locator, "source": source->{_id, title, url, publisher, authority}}
}`

export type Evaluated = {requirement: Requirement; result: EvaluationResult}

// Length limits are stated, not enforced: a schema failure here would cost the agent a step,
// so run.ts trims over-long text instead.
export const verdictInputSchema = z.object({
  mode: z.enum(['check', 'explore']),
  results: z
    .array(
      z.object({
        requirementId: z.string().describe('A requirement _id that evaluate_eligibility returned.'),
        headline: z.string().describe('One plain sentence, at most 120 characters.'),
        explanation: z
          .string()
          .describe(
            'At most 600 characters. Name the exact subject, grade, sitting or score that decided the verdict, and what the candidate can do next.',
          ),
        policyNotes: z
          .array(
            z.object({
              text: z.string().describe('One sentence taken from the Knowledge Base entry.'),
              kbPath: z.string().describe('The entry path you read, copied verbatim from the outline.'),
              sourceTitle: z.string().nullish().describe("The entry's original source title."),
              sourceUrl: z.string().nullish().describe("The entry's original source URL."),
            }),
          )
          .describe('Policy that matters for this result, only from entries you read with policy_knowledge_base_read.'),
      }),
    )
    .describe('One item per evaluated requirement. Empty when nothing was found.'),
  noDataReason: z
    .string()
    .nullish()
    .describe('Set only when no requirement matched: say plainly what is missing. Never guess a requirement.'),
})

export type VerdictInput = z.infer<typeof verdictInputSchema>

const maybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/**
 * Reads a submit_verdict input, repairing the slips the model has been seen to make: `results` sent as a JSON
 * string, and policyNotes placed beside `results` instead of inside it (kept only when there is one result).
 * Returns null when the input still doesn't fit, so the loop can hand the error back for a retry.
 */
export function readVerdict(input: unknown): VerdictInput | null {
  const raw = maybeJson(input)
  if (!raw || typeof raw !== 'object') return null
  const {results, policyNotes: stray, mode, ...rest} = raw as Record<string, unknown>
  const list = maybeJson(results)
  const strayNotes = maybeJson(stray)
  const repaired = {
    ...rest,
    mode: mode === 'explore' ? 'explore' : 'check',
    results: Array.isArray(list)
      ? list.map((r) => {
          if (!r || typeof r !== 'object') return r
          const notes = maybeJson((r as {policyNotes?: unknown}).policyNotes)
          return {
            ...r,
            policyNotes: Array.isArray(notes) ? notes : list.length === 1 && Array.isArray(strayNotes) ? strayNotes : [],
          }
        })
      : list,
  }
  const parsed = verdictInputSchema.safeParse(repaired)
  return parsed.success ? parsed.data : null
}

type Options = {
  candidate: Candidate
  /** In check mode, only this programme's requirements may be evaluated. */
  programmeId?: string
  /** Shared with run.ts: every evaluation made during this request, keyed by requirement _id. */
  evaluated: Map<string, Evaluated>
}

/** The two local tools. The candidate is held here, so the model can't change the input it is judged on. */
export function createLocalTools({candidate, programmeId, evaluated}: Options) {
  return {
    evaluate_eligibility: tool({
      description:
        "Runs the deterministic eligibility check for the candidate against requirement documents. Pass requirement _ids from rules_groq_query (max 10, one call). Returns each verdict (ELIGIBLE, AT_RISK, NOT_ELIGIBLE) with its checks. The verdict is final; don't change it.",
      inputSchema: z.object({
        requirementIds: z.array(z.string().min(1).max(160)).min(1).max(10).describe('Requirement document _ids.'),
      }),
      execute: async ({requirementIds}) => {
        const ids = [...new Set(requirementIds)]
        const missing = ids.filter((id) => !evaluated.has(id))
        const notFound: string[] = []
        const skipped: string[] = []

        if (missing.length > 0) {
          const [docs, names] = await Promise.all([
            sanity.fetch<RawRequirement[]>(REQUIREMENT_QUERY, {ids: missing}),
            getSubjectNames(),
          ])
          const subjectName = (id: string) => names.get(id) ?? id
          for (const doc of docs) {
            const requirement = normalizeRequirement(doc)
            if (programmeId && requirement.programme?._id !== programmeId) {
              skipped.push(doc._id)
              continue
            }
            evaluated.set(doc._id, {requirement, result: evaluate(requirement, candidate, {subjectName})})
          }
          const found = new Set(docs.map((d) => d._id))
          notFound.push(...missing.filter((id) => !found.has(id)))
        }

        return {
          results: ids.flatMap((id) => {
            const e = evaluated.get(id)
            if (!e) return []
            return [
              {
                requirementId: id,
                programme: e.requirement.programme?.title,
                institution: e.requirement.programme?.institution?.shortName,
                session: e.requirement.session,
                verdict: e.result.verdict,
                dataStatus: e.requirement.verificationStatus,
                conflictNote: e.requirement.conflictNote ?? undefined,
                checks: e.result.checks.map(({id, label, status, detail}) => ({id, label, status, detail})),
              },
            ]
          }),
          ...(notFound.length ? {notFound} : {}),
          ...(skipped.length ? {skipped, skippedReason: `Check mode is limited to programme ${programmeId}.`} : {}),
        }
      },
    }),

    // No execute: calling it ends the loop, and run.ts reads its input.
    submit_verdict: tool({
      description:
        'Final step. Submit the plain-English explanation for every evaluated requirement, or noDataReason when none matched. Call it once, after evaluate_eligibility and policy_knowledge_base_read.',
      inputSchema: verdictInputSchema,
    }),
  }
}
