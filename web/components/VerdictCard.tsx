import type {CheckResult} from '@/lib/agent/run'
import type {CheckStatus, Verdict} from '@/lib/eligibility/types'
import {Disclaimer} from './Disclaimer'
import {AlertIcon, CheckIcon, CrossIcon, EyeIcon, InfoIcon} from './icons'

const VERDICT: Record<Verdict, {label: string; band: string; chip: string; Icon: typeof CheckIcon}> = {
  ELIGIBLE: {label: 'Eligible', band: 'bg-emerald-50 border-emerald-200', chip: 'bg-emerald-700 text-white', Icon: CheckIcon},
  AT_RISK: {label: 'At risk', band: 'bg-amber-50 border-amber-200', chip: 'bg-amber-400 text-amber-950', Icon: AlertIcon},
  NOT_ELIGIBLE: {label: 'Not eligible', band: 'bg-red-50 border-red-200', chip: 'bg-red-700 text-white', Icon: CrossIcon},
}

const CHECK: Record<CheckStatus, {sr: string; className: string; Icon: typeof CheckIcon}> = {
  pass: {sr: 'Passed', className: 'bg-emerald-100 text-emerald-800', Icon: CheckIcon},
  fail: {sr: 'Failed', className: 'bg-red-100 text-red-800', Icon: CrossIcon},
  warn: {sr: 'Warning', className: 'bg-amber-100 text-amber-900', Icon: AlertIcon},
  manual: {sr: 'Check yourself', className: 'bg-stone-200 text-stone-700', Icon: EyeIcon},
}

export function AuthorityBadge({authority}: {authority?: 'official' | 'secondary'}) {
  if (!authority) return null
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-px text-xs font-medium ${
        authority === 'official' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-stone-300 bg-white text-stone-700'
      }`}
    >
      {authority === 'official' ? 'Official' : 'Secondary'}
    </span>
  )
}

function CheckRow({check}: {check: CheckResult['checks'][number]}) {
  const {sr, className, Icon} = CHECK[check.status]
  // Manual checks are listed under their own heading, so their generic label adds nothing.
  if (check.status === 'manual')
    return (
      <li className="flex gap-3">
        <span className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ${className}`}>
          <Icon className="size-3.5" />
        </span>
        <p className="min-w-0 text-sm text-stone-800">
          <span className="sr-only">{sr}: </span>
          {check.detail}
        </p>
      </li>
    )
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ${className}`}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-900">
          <span className="sr-only">{sr}: </span>
          {check.label}
        </p>
        <p className="text-sm text-stone-700">{check.detail}</p>
      </div>
    </li>
  )
}

const subheading = 'text-xs font-semibold tracking-wide text-stone-600 uppercase'

/** `pending`: the verdict is final, but the explanation and policy notes are still being written. */
export function VerdictCard({result, pending = false}: {result: CheckResult; pending?: boolean}) {
  const v = VERDICT[result.verdict]
  const decided = result.checks.filter((c) => c.status !== 'manual' && c.id !== 'data-status')
  const manual = result.checks.filter((c) => c.status === 'manual')
  const school = result.institution.shortName ?? result.institution.name

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <header className={`border-b px-4 py-4 sm:px-5 ${v.band}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-bold ${v.chip}`}>
            <v.Icon className="size-4" />
            {v.label}
          </span>
          <span className="text-sm text-stone-700">{result.session} session</span>
        </div>
        <h3 className="mt-3 text-lg leading-snug font-semibold text-stone-950">
          {result.programme.title}
          <span className="font-normal text-stone-700"> · {result.institution.name}{school && school !== result.institution.name ? ` (${school})` : ''}</span>
        </h3>
        <p className="mt-1 text-base text-stone-900">{result.headline}</p>
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-5">
        {result.explanation && <p className="text-[15px] leading-relaxed text-stone-800">{result.explanation}</p>}
        {pending && !result.explanation && (
          <p className="flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
            <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-stone-500 border-t-transparent" aria-hidden="true" />
            Verdict decided by the checks below. Reading the admission policy and writing your explanation…
          </p>
        )}

        <section className="space-y-3">
          <h4 className={subheading}>The checks</h4>
          <ul className="space-y-3">
            {decided.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        </section>

        {manual.length > 0 && (
          <section className="space-y-3">
            <h4 className={subheading}>Also check these yourself</h4>
            <ul className="space-y-3">
              {manual.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </ul>
          </section>
        )}

        {result.policyNotes.length > 0 && (
          <section className="space-y-3">
            <h4 className={subheading}>What the admission policy says</h4>
            <ul className="space-y-3">
              {result.policyNotes.map((n, i) => (
                <li key={i} className="rounded-lg border-l-4 border-emerald-700 bg-stone-50 py-2 pr-3 pl-3">
                  <p className="text-sm text-stone-900">{n.text}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600">
                    <span className="min-w-0">
                      Knowledge Base: <code className="font-mono break-all text-stone-800">{n.kbPath}</code>
                    </span>
                    {n.sourceUrl ? (
                      <a
                        href={n.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
                      >
                        {n.sourceTitle ?? 'Original source'}
                      </a>
                    ) : (
                      n.sourceTitle && <span>{n.sourceTitle}</span>
                    )}
                    <AuthorityBadge authority={n.authority} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2 rounded-lg border border-stone-200 p-3">
          <p className="flex items-start gap-2 text-sm text-stone-800">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-stone-500" />
            <span>
              <span className="font-medium">Data status: </span>
              {result.dataStatus === 'verified' &&
                `verified against the cited sources${result.lastVerified ? ` on ${result.lastVerified}` : ''}.`}
              {result.dataStatus === 'conflicting' && 'conflicting. Official sources disagree, so the stricter rule is used.'}
              {result.dataStatus === 'unverified' && 'not yet verified against the sources.'}
            </span>
          </p>
          {result.conflictNote && (
            <details className="group text-sm">
              <summary className="cursor-pointer py-1 font-medium text-emerald-800 hover:text-emerald-950">
                What the sources disagree on
              </summary>
              <p className="mt-1 text-stone-700">{result.conflictNote}</p>
            </details>
          )}
          {result.citations.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer py-1 font-medium text-emerald-800 hover:text-emerald-950">
                Sources for these rules ({result.citations.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {result.citations.map((c, i) => (
                  <li key={i} className="text-stone-700">
                    <span className="flex flex-wrap items-center gap-2">
                      {c.source?.url ? (
                        <a
                          href={c.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-words text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
                        >
                          {c.source.title ?? c.source.url}
                        </a>
                      ) : (
                        <span>{c.source?.title ?? 'Source'}</span>
                      )}
                      <AuthorityBadge authority={c.source?.authority} />
                    </span>
                    {c.locator && <span className="block text-xs text-stone-600">{c.locator}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <Disclaimer />
      </div>
    </article>
  )
}
