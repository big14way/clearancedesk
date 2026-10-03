'use client'

import {useEffect, useRef, useState} from 'react'
import type {CheckResponse} from '@/lib/agent/run'
import type {Verdict} from '@/lib/eligibility/types'
import type {FormOptions} from '@/lib/sanity/queries'
import {SAMPLES, type Sample} from '@/lib/samples'
import {CandidateForm} from './CandidateForm'
import {Disclaimer} from './Disclaimer'
import {emptyForm, fromSample, toRequest, type FormState} from './form-state'
import {AlertIcon, CheckIcon, CrossIcon, InfoIcon} from './icons'
import {TracePanel} from './TracePanel'
import {VerdictCard} from './VerdictCard'

type Status = 'idle' | 'loading' | 'done' | 'error'

const SAMPLE_STYLE: Record<Verdict, {ring: string; chip: string; Icon: typeof CheckIcon}> = {
  ELIGIBLE: {ring: 'hover:border-emerald-600', chip: 'bg-emerald-100 text-emerald-900', Icon: CheckIcon},
  AT_RISK: {ring: 'hover:border-amber-500', chip: 'bg-amber-100 text-amber-950', Icon: AlertIcon},
  NOT_ELIGIBLE: {ring: 'hover:border-red-600', chip: 'bg-red-100 text-red-900', Icon: CrossIcon},
}

export function Checker({options}: {options: FormOptions}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [response, setResponse] = useState<CheckResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [activeSample, setActiveSample] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const results = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status !== 'loading') return
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [status])

  useEffect(() => {
    if (status === 'loading' || status === 'done' || status === 'error') {
      results.current?.scrollIntoView({behavior: 'smooth', block: 'start'})
    }
    if (status === 'done' || status === 'error') results.current?.focus({preventScroll: true})
  }, [status])

  async function run(state: FormState) {
    const built = toRequest(state)
    if ('errors' in built) {
      setFormErrors(built.errors)
      return
    }
    setFormErrors([])
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setElapsed(0)
    setResponse(null)
    setError(null)
    setStatus('loading')
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(built.request),
        signal: controller.signal,
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body) {
        setError(body?.error ?? 'Something went wrong while checking. Please try again.')
        setStatus('error')
        return
      }
      setResponse(body as CheckResponse)
      setStatus('done')
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setStatus('idle')
        return
      }
      setError('Could not reach Clearance Desk. Check your connection and try again.')
      setStatus('error')
    }
  }

  function runSample(sample: Sample) {
    const state = fromSample(sample)
    setForm(state)
    setActiveSample(sample.id)
    void run(state)
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="samples-heading" className="space-y-3">
        <h2 id="samples-heading" className="text-sm font-semibold tracking-wide text-stone-600 uppercase">
          Try a sample candidate
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {SAMPLES.map((s) => {
            const style = SAMPLE_STYLE[s.expected]
            return (
              <button
                key={s.id}
                type="button"
                disabled={status === 'loading'}
                onClick={() => runSample(s)}
                aria-pressed={activeSample === s.id}
                className={`flex flex-col items-start gap-2 rounded-xl border border-stone-200 bg-white p-4 text-left shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60 aria-pressed:border-stone-900 ${style.ring}`}
              >
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ${style.chip}`}>
                  <style.Icon className="size-3.5" />
                  {s.label}
                </span>
                <span className="text-sm text-stone-700">{s.story}</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-stone-600">
          Fictional candidates, checked against real verified 2026/2027 requirements. Tapping one fills the form and runs it.
        </p>
      </section>

      <section aria-labelledby="form-heading" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 id="form-heading" className="sr-only">
          Your details
        </h2>
        <CandidateForm
          form={form}
          setForm={(next) => {
            setActiveSample(null)
            setForm(next)
          }}
          options={options}
          busy={status === 'loading'}
          errors={formErrors}
          onSubmit={() => run(form)}
        />
      </section>

      <div ref={results} tabIndex={-1} aria-live="polite" className="scroll-mt-4 space-y-4 outline-none">
        {status === 'loading' && (
          <div className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="mt-1 size-5 shrink-0 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-stone-900">Checking… {elapsed}s</p>
              <p className="mt-1 text-sm text-stone-700">
                The agent finds the rules in Sanity, runs the eligibility checks, then reads the admission policy. This usually
                takes 15 to 40 seconds.
              </p>
              <button
                type="button"
                onClick={() => abort.current?.abort()}
                className="mt-3 inline-flex h-10 items-center rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === 'error' && error && (
          <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
            <AlertIcon className="mt-0.5 size-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {status === 'done' && response && (
          <>
            <h2 className="text-xl font-semibold text-stone-950">
              {response.mode === 'explore'
                ? response.results.length
                  ? `${response.results.length} course${response.results.length === 1 ? '' : 's'} checked`
                  : 'No matching courses'
                : 'Your result'}
            </h2>
            {response.mode === 'explore' && response.results.length > 0 && (
              <p className="text-sm text-stone-700">
                Courses whose compulsory UTME subjects you took, best match first. Each one is fully checked.
              </p>
            )}

            {response.noDataReason && (
              <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="flex gap-3 text-stone-900">
                  <InfoIcon className="mt-0.5 size-5 shrink-0 text-stone-600" />
                  <span>{response.noDataReason}</span>
                </p>
                <Disclaimer />
              </div>
            )}

            {!response.explained && response.results.length > 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                The written explanation didn&apos;t finish, but the verdicts and checks below are complete and exact.
              </p>
            )}

            {response.results.map((r) => (
              <VerdictCard key={r.requirementId} result={r} />
            ))}

            {response.trace.length > 0 && <TracePanel trace={response.trace} model={response.model} />}
          </>
        )}
      </div>
    </div>
  )
}
