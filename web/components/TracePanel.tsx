import type {TraceStep} from '@/lib/agent/run'

export type StepInfo = {title: string; where: string; tone: string}

export const STEPS: Record<string, StepInfo> = {
  rules_groq_query: {title: 'Queried the admission rules (GROQ)', where: 'Sanity Context · clearance-rules', tone: 'bg-sky-100 text-sky-900'},
  rules_schema_explorer: {title: 'Looked up the rules schema', where: 'Sanity Context · clearance-rules', tone: 'bg-sky-100 text-sky-900'},
  policy_knowledge_base_read: {title: 'Read Knowledge Base entries', where: 'Sanity Context · clearance-policy', tone: 'bg-violet-100 text-violet-900'},
  policy_knowledge_base_search: {title: 'Searched the Knowledge Base', where: 'Sanity Context · clearance-policy', tone: 'bg-violet-100 text-violet-900'},
  evaluate_eligibility: {title: 'Ran the eligibility checks', where: 'Deterministic code, no AI', tone: 'bg-emerald-100 text-emerald-900'},
  submit_verdict: {title: 'Wrote the explanation', where: 'Claude', tone: 'bg-stone-200 text-stone-800'},
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [])

function StepDetail({step}: {step: TraceStep}) {
  const input = (step.input ?? {}) as Record<string, unknown>
  const pre = 'mt-2 overflow-x-auto rounded-lg bg-stone-900 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-stone-100'

  if (typeof input.query === 'string' && step.toolName.startsWith('rules_'))
    return <pre className={pre}>{input.query}</pre>
  if (typeof input.query === 'string') return <p className="mt-1 text-sm text-stone-700">Search: “{input.query}”</p>
  if (typeof input.type === 'string') return <p className="mt-1 text-sm text-stone-700">Type: {input.type}</p>

  const paths = strings(input.paths)
  if (paths.length)
    return (
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {paths.map((p) => (
          <li key={p} className="max-w-full">
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs break-all text-stone-800">{p}</code>
          </li>
        ))}
      </ul>
    )

  const ids = strings(input.requirementIds)
  if (step.toolName === 'submit_verdict')
    return (
      <p className="mt-1 text-sm text-stone-700">
        {ids.length ? `Explained ${ids.length} result${ids.length === 1 ? '' : 's'}.` : 'No matching requirement, so it said so.'}
      </p>
    )
  if (ids.length)
    return (
      <ul className="mt-2 space-y-0.5">
        {ids.map((id) => (
          <li key={id}>
            <code className="font-mono text-xs break-all text-stone-800">{id}</code>
          </li>
        ))}
      </ul>
    )
  return null
}

export function TracePanel({trace, model}: {trace: TraceStep[]; model: string}) {
  return (
    <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-semibold text-stone-900">How I got this answer</span>
          <span className="block text-sm text-stone-600">
            {trace.length} step{trace.length === 1 ? '' : 's'}: the exact queries, checks and policy entries used
          </span>
        </span>
        <span aria-hidden="true" className="text-xl text-stone-500 transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <ol className="space-y-4 border-t border-stone-200 px-4 py-4 sm:px-5">
        {trace.map((step, i) => {
          const info = STEPS[step.toolName] ?? {title: step.toolName, where: 'Tool', tone: 'bg-stone-200 text-stone-800'}
          return (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-900">
                  {info.title}
                  {step.error && <span className="ml-2 text-red-800">(this call failed)</span>}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-px text-xs font-medium ${info.tone}`}>{info.where}</span>
                  <code className="font-mono text-xs break-all text-stone-500">{step.toolName}</code>
                </p>
                <StepDetail step={step} />
              </div>
            </li>
          )
        })}
        <li className="pl-9 text-xs text-stone-500">Model: {model}. The verdicts come from step “Ran the eligibility checks”, never from the model.</li>
      </ol>
    </details>
  )
}
