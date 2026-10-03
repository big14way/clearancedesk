'use client'

import {useEffect, useId, useState} from 'react'
import type {AskResponse} from '@/lib/agent/ask'
import type {CheckResult} from '@/lib/agent/run'
import {AuthorityBadge} from './VerdictCard'
import {InfoIcon} from './icons'

/** Questions a candidate asks next, phrased for the course they just checked. */
function suggestions(results: CheckResult[]): string[] {
  const schools = [...new Set(results.map((r) => r.institution.shortName).filter(Boolean))]
  if (schools.length === 1) {
    const school = schools[0]
    return [
      `When is ${school}'s Post-UTME screening for 2026/2027?`,
      `What is the deadline to upload my O'level result for ${school}?`,
      `My result is still awaited. Can I still apply to ${school}?`,
    ]
  }
  return [
    'Can I combine WAEC and NECO results?',
    'What is the minimum UTME score at each university?',
    'What happens at clearance if my O’level does not match?',
  ]
}

export function FollowUp({results}: {results: CheckResult[]}) {
  const id = useId()
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState<string | null>(null)
  const [answer, setAnswer] = useState<AskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!busy) return
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [busy])

  async function ask(q: string) {
    const text = q.trim()
    if (text.length < 3 || busy) return
    setAsked(text)
    setAnswer(null)
    setError(null)
    setElapsed(0)
    setBusy(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question: text, requirementIds: results.map((r) => r.requirementId).slice(0, 10)}),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body) setError(body?.error ?? 'Something went wrong while looking that up. Please try again.')
      else setAnswer(body as AskResponse)
    } catch {
      setError('Could not reach Clearance Desk. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h3 id={`${id}-h`} className="text-base font-semibold text-stone-900">
          Ask about the admission policy
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          Answered only from the Knowledge Base of JAMB and university notices, with the sources it used.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions(results).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => {
              setQuestion(s)
              void ask(s)
            }}
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-left text-sm text-violet-950 hover:border-violet-400 focus-visible:outline-2 focus-visible:outline-violet-700 disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void ask(question)
        }}
      >
        <label htmlFor={`${id}-q`} className="sr-only">
          Your question
        </label>
        <input
          id={`${id}-q`}
          value={question}
          maxLength={300}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Or type your own question"
          className="h-11 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 focus:border-violet-700 focus:outline-2 focus:outline-violet-700/30"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length < 3}
          className="h-11 shrink-0 rounded-lg bg-violet-800 px-4 text-sm font-semibold text-white hover:bg-violet-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-800 disabled:bg-violet-800/50"
        >
          Ask
        </button>
      </form>

      <div aria-live="polite" className="space-y-3">
        {busy && (
          <p className="flex items-center gap-2 text-sm text-stone-700">
            <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-violet-700 border-t-transparent" aria-hidden="true" />
            Searching the Knowledge Base… {elapsed}s
          </p>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        {answer && asked && (
          <div className="space-y-3 rounded-xl bg-stone-50 p-4">
            <p className="text-sm font-medium text-stone-600">“{asked}”</p>
            {!answer.answered && (
              <p className="flex items-center gap-2 text-xs font-medium text-amber-900">
                <InfoIcon className="size-4" />
                Not covered by the Knowledge Base
              </p>
            )}
            <p className="text-[15px] leading-relaxed text-stone-900">{answer.answer}</p>
            {answer.citations.length > 0 && (
              <ul className="space-y-1.5 border-t border-stone-200 pt-3">
                {answer.citations.map((c) => (
                  <li key={c.kbPath} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600">
                    <span>
                      Knowledge Base: <code className="font-mono break-all text-stone-800">{c.kbPath}</code>
                    </span>
                    {c.sourceUrl ? (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words text-violet-800 underline underline-offset-2 hover:text-violet-950"
                      >
                        {c.sourceTitle ?? 'Original source'}
                      </a>
                    ) : (
                      c.sourceTitle && <span>{c.sourceTitle}</span>
                    )}
                    <AuthorityBadge authority={c.authority} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
