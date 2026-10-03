'use client'

import {useId, type Dispatch, type FormEvent, type SetStateAction} from 'react'
import {EXAMS, GRADES} from '@/lib/eligibility/types'
import type {FormOptions} from '@/lib/sanity/queries'
import {ENGLISH, MAX_ROWS, MAX_SITTINGS, newSitting, type FormState, type SittingState} from './form-state'
import {CrossIcon, PlusIcon} from './icons'

const YEARS = Array.from({length: 2026 - 2000 + 1}, (_, i) => 2026 - i)

// No width here: width utilities added per field must not fight a default.
const fieldBase =
  'h-11 rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 shadow-xs transition-colors focus:border-emerald-700 focus:outline-2 focus:outline-offset-0 focus:outline-emerald-700/30 disabled:bg-stone-100 disabled:text-stone-500'
const fieldClass = `${fieldBase} w-full min-w-0`
const labelClass = 'mb-1.5 block text-sm font-medium text-stone-800'
const sectionClass = 'space-y-4 border-t border-stone-200 pt-6 first:border-t-0 first:pt-0'
const headingClass = 'text-base font-semibold text-stone-900'
const buttonBase =
  'inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:text-stone-400 disabled:hover:bg-transparent'
const ghostButton = `${buttonBase} text-emerald-800 hover:bg-emerald-50`
const dangerButton = `${buttonBase} text-red-800 hover:bg-red-50`

type Props = {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  options: FormOptions
  busy: boolean
  errors: string[]
  onSubmit: () => void
}

export function CandidateForm({form, setForm, options, busy, errors, onSubmit}: Props) {
  const id = useId()
  const institution = options.institutions.find((i) => i._id === form.institutionId)
  const nonEnglish = options.subjects.filter((s) => s._id !== ENGLISH)

  const update = (patch: Partial<FormState>) => setForm((f) => ({...f, ...patch}))
  const updateSitting = (index: number, patch: Partial<SittingState>) =>
    setForm((f) => ({...f, sittings: f.sittings.map((s, i) => (i === index ? {...s, ...patch} : s))}))

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {/* ------------------------------------------------------------ target */}
      <section className={sectionClass} aria-labelledby={`${id}-target`}>
        <h2 id={`${id}-target`} className={headingClass}>
          1. What do you want to know?
        </h2>
        <fieldset className="min-w-0">
          <legend className="sr-only">Mode</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
            {(
              [
                ['check', 'Check this course'],
                ['explore', 'Show courses I qualify for'],
              ] as const
            ).map(([value, text]) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-medium text-stone-700 has-checked:bg-white has-checked:text-emerald-900 has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-emerald-700"
              >
                <input
                  type="radio"
                  name={`${id}-mode`}
                  value={value}
                  checked={form.mode === value}
                  onChange={() => update({mode: value})}
                  className="sr-only"
                />
                {text}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-institution`} className={labelClass}>
              University
            </label>
            <select
              id={`${id}-institution`}
              className={fieldClass}
              value={form.institutionId}
              onChange={(e) => update({institutionId: e.target.value, programmeId: ''})}
            >
              <option value="">{form.mode === 'explore' ? 'All five universities' : 'Choose a university'}</option>
              {options.institutions.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name} ({i.shortName})
                </option>
              ))}
            </select>
          </div>
          {form.mode === 'check' && (
            <div>
              <label htmlFor={`${id}-programme`} className={labelClass}>
                Course
              </label>
              <select
                id={`${id}-programme`}
                className={fieldClass}
                value={form.programmeId}
                disabled={!institution}
                onChange={(e) => update({programmeId: e.target.value})}
              >
                <option value="">{institution ? 'Choose a course' : 'Choose a university first'}</option>
                {institution?.programmes.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ UTME */}
      <section className={sectionClass} aria-labelledby={`${id}-utme`}>
        <h2 id={`${id}-utme`} className={headingClass}>
          2. Your UTME
        </h2>
        <div className="max-w-40">
          <label htmlFor={`${id}-score`} className={labelClass}>
            UTME score <span className="font-normal text-stone-600">(out of 400)</span>
          </label>
          <input
            id={`${id}-score`}
            className={fieldClass}
            type="number"
            inputMode="numeric"
            min={0}
            max={400}
            step={1}
            placeholder="e.g. 245"
            value={form.score}
            onChange={(e) => update({score: e.target.value})}
          />
        </div>
        <fieldset className="min-w-0">
          <legend className={labelClass}>Your 4 UTME subjects</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-utme-0`} className="sr-only">
                UTME subject 1 (compulsory)
              </label>
              <input
                id={`${id}-utme-0`}
                className="h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-stone-100 px-3 text-base text-stone-700"
                value="Use of English (compulsory)"
                readOnly
                aria-readonly="true"
              />
            </div>
            {form.utme.map((subjectId, i) => (
              <div key={i}>
                <label htmlFor={`${id}-utme-${i + 1}`} className="sr-only">
                  UTME subject {i + 2}
                </label>
                <select
                  id={`${id}-utme-${i + 1}`}
                  className={fieldClass}
                  value={subjectId}
                  onChange={(e) => {
                    const utme = [...form.utme] as FormState['utme']
                    utme[i] = e.target.value
                    update({utme})
                  }}
                >
                  <option value="">Choose subject {i + 2}</option>
                  {nonEnglish.map((s) => (
                    <option key={s._id} value={s._id} disabled={form.utme.includes(s._id) && s._id !== subjectId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </fieldset>
      </section>

      {/* ------------------------------------------------------------ O'level */}
      <section className={sectionClass} aria-labelledby={`${id}-olevel`}>
        <div>
          <h2 id={`${id}-olevel`} className={headingClass}>
            3. Your O&apos;level results
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            A <strong className="font-medium text-stone-800">sitting</strong> is one exam attempt, like WAEC May/June
            2025. Some courses accept only one.
          </p>
        </div>

        {form.sittings.map((sitting, si) => (
          <fieldset key={si} className="min-w-0 rounded-xl border border-stone-200 bg-stone-50/70 p-3 sm:p-4">
            <legend className="sr-only">Sitting {si + 1}</legend>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-stone-900" aria-hidden="true">
                Sitting {si + 1}
              </span>
              {form.sittings.length > 1 && (
                <button
                  type="button"
                  className={`${dangerButton} -mr-2`}
                  onClick={() => setForm((f) => ({...f, sittings: f.sittings.filter((_, i) => i !== si)}))}
                >
                  Remove sitting {si + 1}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${id}-s${si}-exam`} className={labelClass}>
                  Exam
                </label>
                <select
                  id={`${id}-s${si}-exam`}
                  className={fieldClass}
                  value={sitting.exam}
                  onChange={(e) => updateSitting(si, {exam: e.target.value as SittingState['exam']})}
                >
                  {EXAMS.map((exam) => (
                    <option key={exam}>{exam}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-s${si}-year`} className={labelClass}>
                  Year
                </label>
                <select
                  id={`${id}-s${si}-year`}
                  className={fieldClass}
                  value={sitting.year}
                  onChange={(e) => updateSitting(si, {year: Number(e.target.value)})}
                >
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-stone-800">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-emerald-700"
                checked={sitting.awaitingResult}
                onChange={(e) => updateSitting(si, {awaitingResult: e.target.checked})}
              />
              <span>
                Awaiting result
                <span className="block text-stone-600">Enter the grades you expect. They can&apos;t be confirmed yet.</span>
              </span>
            </label>

            <div className="mt-2 space-y-2">
              <div className="flex gap-2 text-xs font-medium tracking-wide text-stone-600 uppercase" aria-hidden="true">
                <span className="flex-1">Subject</span>
                <span className="w-20">Grade</span>
                <span className="w-11" />
              </div>
              {sitting.rows.map((row, ri) => (
                <div key={ri} className="flex gap-2">
                  <select
                    id={`${id}-s${si}-r${ri}-subject`}
                    aria-label={`Sitting ${si + 1}, subject ${ri + 1}`}
                    className={`${fieldBase} min-w-0 flex-1`}
                    value={row.subjectId}
                    onChange={(e) =>
                      updateSitting(si, {
                        rows: sitting.rows.map((r, i) => (i === ri ? {...r, subjectId: e.target.value} : r)),
                      })
                    }
                  >
                    <option value="">Subject…</option>
                    {options.subjects.map((s) => (
                      <option
                        key={s._id}
                        value={s._id}
                        disabled={s._id !== row.subjectId && sitting.rows.some((r) => r.subjectId === s._id)}
                      >
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    id={`${id}-s${si}-r${ri}-grade`}
                    aria-label={`Sitting ${si + 1}, grade for subject ${ri + 1}`}
                    className={`${fieldBase} w-20 shrink-0 px-2`}
                    value={row.grade}
                    onChange={(e) =>
                      updateSitting(si, {
                        rows: sitting.rows.map((r, i) =>
                          i === ri ? {...r, grade: e.target.value as SittingState['rows'][number]['grade']} : r,
                        ),
                      })
                    }
                  >
                    <option value="">–</option>
                    {GRADES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-30"
                    aria-label={`Remove sitting ${si + 1}, subject ${ri + 1}`}
                    disabled={sitting.rows.length <= 1}
                    onClick={() => updateSitting(si, {rows: sitting.rows.filter((_, i) => i !== ri)})}
                  >
                    <CrossIcon className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${ghostButton} mt-2 -ml-2`}
              disabled={sitting.rows.length >= MAX_ROWS}
              onClick={() => updateSitting(si, {rows: [...sitting.rows, {subjectId: '', grade: ''}]})}
            >
              <PlusIcon className="size-4" />
              {sitting.rows.length >= MAX_ROWS ? `${MAX_ROWS} subjects is the most` : 'Add subject'}
            </button>
          </fieldset>
        ))}

        {form.sittings.length < MAX_SITTINGS && (
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-400 text-sm font-medium text-stone-800 hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
            onClick={() => setForm((f) => ({...f, sittings: [...f.sittings, newSitting()]}))}
          >
            <PlusIcon className="size-4" />
            Add another sitting
          </button>
        )}
      </section>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Please fix these first:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-emerald-800 px-5 text-base font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:bg-emerald-800/60"
      >
        {busy ? 'Checking…' : form.mode === 'check' ? 'Check my eligibility' : 'Show courses I qualify for'}
      </button>
    </form>
  )
}
