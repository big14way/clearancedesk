import type {TraceStep} from '@/lib/agent/run'
import {CheckIcon} from './icons'
import {STEPS} from './TracePanel'

/** What the agent is most likely doing next, given the last finished tool call. */
function nextAction(last?: string): string {
  if (!last) return 'Finding the rules for this course in Sanity'
  if (last.startsWith('rules_')) return 'Running the eligibility checks'
  if (last === 'evaluate_eligibility') return 'Reading the admission policy in the Knowledge Base'
  if (last.startsWith('policy_')) return 'Writing your explanation'
  return 'Finishing up'
}

function detail(step: TraceStep): string | null {
  const input = (step.input ?? {}) as {paths?: unknown; requirementIds?: unknown}
  if (Array.isArray(input.paths)) return `${input.paths.length} entr${input.paths.length === 1 ? 'y' : 'ies'}`
  if (step.toolName === 'evaluate_eligibility' && Array.isArray(input.requirementIds))
    return `${input.requirementIds.length} course${input.requirementIds.length === 1 ? '' : 's'}`
  return null
}

export function LiveProgress({steps, elapsed, onCancel}: {steps: TraceStep[]; elapsed: number; onCancel: () => void}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-stone-900">Checking… {elapsed}s</p>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          Cancel
        </button>
      </div>
      <ol className="mt-4 space-y-3" aria-label="Progress">
        {steps.map((step, i) => {
          const info = STEPS[step.toolName] ?? {title: step.toolName, where: 'Tool', tone: 'bg-stone-200 text-stone-800'}
          const extra = detail(step)
          return (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <CheckIcon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">
                  {info.title}
                  {extra && <span className="font-normal text-stone-600"> · {extra}</span>}
                </p>
                <span className={`mt-0.5 inline-block rounded-full px-2 py-px text-xs font-medium ${info.tone}`}>{info.where}</span>
              </div>
            </li>
          )
        })}
        <li className="flex items-center gap-3">
          <span
            className="size-6 shrink-0 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-sm text-stone-700">{nextAction(steps.at(-1)?.toolName)}…</p>
        </li>
      </ol>
    </div>
  )
}
