import type {CheckRequest} from '@/lib/agent/run'
import type {Exam, Grade} from '@/lib/eligibility/types'
import type {Sample} from '@/lib/samples'

export const ENGLISH = 'subject-english'
export const MAX_SITTINGS = 3
export const MAX_ROWS = 9
const START_ROWS = 5

export type RowState = {subjectId: string; grade: Grade | ''}
export type SittingState = {exam: Exam; year: number; awaitingResult: boolean; rows: RowState[]}

export type FormState = {
  mode: 'check' | 'explore'
  institutionId: string
  programmeId: string
  score: string
  /** The three UTME subjects after Use of English, which is fixed. */
  utme: [string, string, string]
  sittings: SittingState[]
}

const blankRow = (subjectId = ''): RowState => ({subjectId, grade: ''})

export function newSitting(year = 2025): SittingState {
  return {
    exam: 'WAEC',
    year,
    awaitingResult: false,
    rows: [blankRow(ENGLISH), blankRow('subject-mathematics'), ...Array.from({length: START_ROWS - 2}, () => blankRow())],
  }
}

export const emptyForm = (): FormState => ({
  mode: 'check',
  institutionId: '',
  programmeId: '',
  score: '',
  utme: ['', '', ''],
  sittings: [newSitting()],
})

export function fromSample(sample: Sample): FormState {
  const [, ...rest] = sample.candidate.utme.subjects
  return {
    mode: 'check',
    institutionId: sample.institutionId,
    programmeId: sample.programmeId,
    score: String(sample.candidate.utme.score),
    utme: [rest[0] ?? '', rest[1] ?? '', rest[2] ?? ''],
    sittings: sample.candidate.olevel.sittings.map((s) => ({
      exam: s.exam,
      year: s.year,
      awaitingResult: Boolean(s.awaitingResult),
      rows: s.results.map((r) => ({subjectId: r.subjectId, grade: r.grade})),
    })),
  }
}

/** Builds the API request, or plain-English problems to fix first. */
export function toRequest(form: FormState): {request: CheckRequest} | {errors: string[]} {
  const errors: string[] = []

  const score = Number(form.score)
  if (form.score.trim() === '' || !Number.isInteger(score) || score < 0 || score > 400)
    errors.push('Enter your UTME score as a whole number from 0 to 400.')

  const utme = [ENGLISH, ...form.utme]
  if (form.utme.some((s) => !s)) errors.push('Choose all four UTME subjects.')
  else if (new Set(utme).size !== 4) errors.push('Your four UTME subjects must all be different.')

  const anyGrade = form.sittings.some((s) => s.rows.some((r) => r.subjectId && r.grade))
  if (!anyGrade) errors.push("Add your O'level subjects and grades.")
  form.sittings.forEach((s, i) => {
    const filled = s.rows.filter((r) => r.subjectId)
    const name = form.sittings.length > 1 ? `O'level sitting ${i + 1}` : "Your O'level results"
    // English and Mathematics start pre-selected, so only nag about missing grades once some are entered.
    if (anyGrade && filled.some((r) => !r.grade)) errors.push(`${name}: pick a grade for every subject you chose.`)
    if (new Set(filled.map((r) => r.subjectId)).size !== filled.length) errors.push(`${name}: a subject appears twice.`)
  })

  if (form.mode === 'check' && !form.programmeId) errors.push('Choose a university and a course to check.')

  if (errors.length) return {errors}

  return {
    request: {
      mode: form.mode,
      target:
        form.mode === 'check'
          ? {programmeId: form.programmeId}
          : form.institutionId
            ? {institutionIds: [form.institutionId]}
            : undefined,
      candidate: {
        utme: {score, subjects: utme},
        olevel: {
          sittings: form.sittings.map((s) => ({
            exam: s.exam,
            year: s.year,
            ...(s.awaitingResult ? {awaitingResult: true} : {}),
            results: s.rows
              .filter((r): r is {subjectId: string; grade: Grade} => Boolean(r.subjectId && r.grade))
              .map((r) => ({subjectId: r.subjectId, grade: r.grade})),
          })),
        },
      },
    },
  }
}
