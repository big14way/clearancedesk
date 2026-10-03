/**
 * Deterministic eligibility check: one requirement × one candidate → verdict + checks.
 * No model involved. The agent finds requirements and explains; this code judges.
 */
import {best, isCredit, meets} from './grades'
import type {
  Candidate,
  Check,
  CheckStatus,
  EvaluationResult,
  Grade,
  OlevelSitting,
  Requirement,
  SubjectChoice,
  Verdict,
} from './types'

export type EvaluateOptions = {
  /** Display name for a subject id, e.g. "subject-english" → "English Language / Use of English". */
  subjectName?: (id: string) => string
}

const fallbackName = (id: string) =>
  id
    .replace(/^subject-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

const listOf = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
const anyOf = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// ---------------------------------------------------------------- choice groups as a matching problem

/**
 * Assigns distinct subjects to choice-group slots (a group with pick: 2 has two slots) so that as many slots as
 * possible are filled — maximum bipartite matching (Kuhn's algorithm). Unlike a greedy pass in group order, this never
 * fails a candidate whose subjects could satisfy every group under some other assignment, and a subject can never
 * fill two slots.
 *
 * @returns for each group, the subjects assigned to it.
 */
export function assignChoiceGroups(
  subjects: string[],
  groups: SubjectChoice[],
  qualifies: (subject: string, group: SubjectChoice) => boolean,
): string[][] {
  const slotGroup = groups.flatMap((g, gi) => Array.from({length: g.pick}, () => gi))
  const slotSubject: Array<string | null> = slotGroup.map(() => null)
  const subjectSlot = new Map<string, number>()

  const tryAssign = (slot: number, seen: Set<string>): boolean => {
    for (const s of subjects) {
      if (seen.has(s) || !qualifies(s, groups[slotGroup[slot]])) continue
      seen.add(s)
      const taken = subjectSlot.get(s)
      if (taken === undefined || tryAssign(taken, seen)) {
        subjectSlot.set(s, slot)
        slotSubject[slot] = s
        return true
      }
    }
    return false
  }
  slotGroup.forEach((_, slot) => tryAssign(slot, new Set()))

  return groups.map((_, gi) =>
    slotSubject.filter((s, slot): s is string => s !== null && slotGroup[slot] === gi),
  )
}

// ---------------------------------------------------------------- O'level combination evaluation

type IndexedSitting = OlevelSitting & {index: number}

type ComboResult = {
  combo: IndexedSitting[]
  grades: Map<string, Grade>
  compulsoryFails: string[]
  compulsoryPasses: string[]
  choiceShortfalls: string[]
  choicePasses: string[]
  credits: number
  requiredCredits: number
  failures: number
}

function evaluateCombo(req: Requirement, combo: IndexedSitting[], name: (id: string) => string): ComboResult {
  // best grade per subject across the combined sittings
  const grades = new Map<string, Grade>()
  for (const sitting of combo)
    for (const r of sitting.results) grades.set(r.subjectId, grades.has(r.subjectId) ? best(grades.get(r.subjectId)!, r.grade) : r.grade)

  const show = (id: string) => `${name(id)} (${grades.get(id)})`

  // compulsory subjects
  const compulsoryIds = new Set(req.olevelCompulsory.map((c) => c.subject))
  const compulsoryFails: string[] = []
  const compulsoryPasses: string[] = []
  for (const {subject, minGrade} of req.olevelCompulsory) {
    const g = grades.get(subject)
    if (!g) compulsoryFails.push(`${name(subject)}: not in these results (needs ${minGrade} or better)`)
    else if (!meets(g, minGrade)) compulsoryFails.push(`${name(subject)}: you have ${g}, needs ${minGrade} or better`)
    else compulsoryPasses.push(show(subject))
  }

  // choice groups, using only subjects not already used as compulsory
  const groupMin = (g: SubjectChoice): Grade => g.minGrade ?? 'C6'
  const pool = [...grades.keys()].filter((s) => !compulsoryIds.has(s))
  const assigned = assignChoiceGroups(pool, req.olevelChoices, (s, g) => g.from.includes(s) && meets(grades.get(s)!, groupMin(g)))
  const choiceShortfalls: string[] = []
  const choicePasses: string[] = []
  req.olevelChoices.forEach((g, gi) => {
    const got = assigned[gi]
    if (got.length < g.pick)
      choiceShortfalls.push(
        `needs ${plural(g.pick - got.length, 'more subject')} at ${groupMin(g)} or better from: ${anyOf(g.from.map(name))}`,
      )
    else choicePasses.push(`${listOf(got.map(show))} for "pick ${g.pick} from ${anyOf(g.from.map(name))}"`)
  })

  // credit total: compulsory credits + every qualifying credit in a choice group (+ any other credit if allowed)
  const counted = new Set<string>()
  for (const {subject} of req.olevelCompulsory) {
    const g = grades.get(subject)
    if (g && isCredit(g)) counted.add(subject)
  }
  for (const g of req.olevelChoices)
    for (const s of g.from) {
      const grade = grades.get(s)
      if (grade && !compulsoryIds.has(s) && meets(grade, groupMin(g)) && isCredit(grade)) counted.add(s)
    }
  if (req.olevelOtherSubjectsCount) for (const [s, g] of grades) if (isCredit(g)) counted.add(s)

  const requiredCredits =
    combo.length > 1 && req.olevelMinCreditsCombined ? req.olevelMinCreditsCombined : req.olevelMinCredits
  const failures =
    compulsoryFails.length + choiceShortfalls.length + (counted.size < requiredCredits ? 1 : 0)

  return {
    combo,
    grades,
    compulsoryFails,
    compulsoryPasses,
    choiceShortfalls,
    choicePasses,
    credits: counted.size,
    requiredCredits,
    failures,
  }
}

/** All non-empty subsets of the sittings, smallest first. */
function combinations<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let mask = 1; mask < 1 << items.length; mask++) out.push(items.filter((_, i) => mask & (1 << i)))
  return out.sort((a, b) => a.length - b.length)
}

const sittingLabel = (s: OlevelSitting) => `${s.exam} ${s.year}${s.awaitingResult ? ' (awaiting result)' : ''}`

// ---------------------------------------------------------------- main

export function evaluate(req: Requirement, candidate: Candidate, options: EvaluateOptions = {}): EvaluationResult {
  const name = options.subjectName ?? fallbackName
  const school = req.programme?.institution?.shortName ?? 'the university'
  const cites = req.citations
  const checks: Check[] = []
  const add = (id: string, label: string, status: CheckStatus, detail: string) =>
    checks.push({id, label, status, detail, citations: cites})

  // 1. UTME subjects ------------------------------------------------------------------------------
  const utme = candidate.utme.subjects
  if (utme.length !== 4 || new Set(utme).size !== 4) {
    add('utme-subjects', 'UTME subjects', 'fail', 'UTME has exactly 4 different subjects; your list does not.')
  } else {
    const missing = req.utmeCompulsory.filter((s) => !utme.includes(s))
    const remaining = utme.filter((s) => !req.utmeCompulsory.includes(s))
    const assigned = assignChoiceGroups(remaining, req.utmeChoices, (s, g) => g.from.includes(s))
    const short = req.utmeChoices
      .map((g, gi) => ({g, have: assigned[gi].length}))
      .filter(({g, have}) => have < g.pick)
    const problems = [
      ...missing.map((s) => `${name(s)} is compulsory for this course but is not one of your UTME subjects.`),
      ...short.map(
        ({g, have}) => `You need ${plural(g.pick - have, 'more UTME subject')} from: ${anyOf(g.from.map(name))}.`,
      ),
    ]
    const unused = remaining.filter((s) => !assigned.flat().includes(s))
    if (problems.length && unused.length)
      problems.push(`${listOf(unused.map(name))} does not count toward this course's UTME combination.`)
    add(
      'utme-subjects',
      'UTME subject combination',
      problems.length ? 'fail' : 'pass',
      problems.length ? problems.join(' ') : `${listOf(utme.map(name))} match the required UTME combination.`,
    )
  }

  // 2. UTME score ---------------------------------------------------------------------------------
  const score = candidate.utme.score
  if (req.utmeMinScore === null) {
    add(
      'utme-score',
      'UTME score',
      'warn',
      `${school}'s minimum UTME score for ${req.session} is not in our verified data, so your score of ${score} cannot be confirmed.`,
    )
  } else if (score < req.utmeMinScore) {
    add(
      'utme-score',
      'UTME score',
      'fail',
      `Your UTME score of ${score} is below ${school}'s minimum of ${req.utmeMinScore} for ${req.session}.`,
    )
  } else {
    add('utme-score', 'UTME score', 'pass', `Your UTME score of ${score} meets ${school}'s minimum of ${req.utmeMinScore} for ${req.session}.`)
  }
  if (req.lastCutoff && score < req.lastCutoff.score) {
    add(
      'utme-cutoff',
      'Last departmental cut-off',
      'warn',
      `Your score is below the last published departmental cut-off of ${req.lastCutoff.score} for ${req.lastCutoff.session}. Meeting the minimum does not guarantee admission.`,
    )
  }

  // 3. O'level ------------------------------------------------------------------------------------
  const sittings: IndexedSitting[] = candidate.olevel.sittings.map((s, index) => ({...s, index}))
  const accepted = sittings.filter((s) => req.olevelAcceptedExams.includes(s.exam))
  const rejected = sittings.filter((s) => !req.olevelAcceptedExams.includes(s.exam))
  if (rejected.length)
    add(
      'olevel-exams',
      "Accepted O'level exams",
      'warn',
      `${listOf(rejected.map(sittingLabel))} ${rejected.length === 1 ? 'was' : 'were'} left out: for this course ${school} lists only ${listOf(req.olevelAcceptedExams)} results.`,
    )
  const awaiting = accepted.filter((s) => s.awaitingResult)
  if (awaiting.length)
    add(
      'olevel-awaiting',
      'Awaiting results',
      'warn',
      `${listOf(awaiting.map((s) => `${s.exam} ${s.year}`))}: cannot confirm until results are out. The grades you entered were used as expected grades.`,
    )

  let usedSittings: number[] = []
  if (!accepted.length) {
    add('olevel-sittings', "O'level results", 'fail', `None of your O'level results are from an exam ${school} accepts for this course.`)
  } else {
    const evaluated = combinations(accepted).map((c) => evaluateCombo(req, c, name))
    const allowed = evaluated.filter((e) => e.combo.length <= req.olevelMaxSittings)
    const byQuality = (a: ComboResult, b: ComboResult) =>
      a.failures - b.failures || a.combo.length - b.combo.length || b.credits - a.credits
    const chosen = [...allowed].sort(byQuality)[0]
    const passesOnlyWithMore = chosen.failures > 0 && evaluated.some((e) => e.combo.length > req.olevelMaxSittings && e.failures === 0)
    usedSittings = chosen.combo.map((s) => s.index)
    const using = `${listOf(chosen.combo.map(sittingLabel))}`
    const maxText = plural(req.olevelMaxSittings, 'sitting')

    add(
      'olevel-sittings',
      "O'level sittings",
      passesOnlyWithMore ? 'fail' : 'pass',
      passesOnlyWithMore
        ? `This course allows ${maxText}; you need ${plural(evaluated.find((e) => e.failures === 0)!.combo.length, 'sitting')} to meet it.`
        : `Based on ${using} (this course allows up to ${maxText}).`,
    )
    add(
      'olevel-compulsory',
      "Compulsory O'level subjects",
      chosen.compulsoryFails.length ? 'fail' : 'pass',
      chosen.compulsoryFails.length
        ? chosen.compulsoryFails.join('; ') + '.'
        : `${listOf(chosen.compulsoryPasses)} meet the minimum grades.`,
    )
    if (req.olevelChoices.length)
      add(
        'olevel-choices',
        "Other required O'level subjects",
        chosen.choiceShortfalls.length ? 'fail' : 'pass',
        chosen.choiceShortfalls.length
          ? `This course ${chosen.choiceShortfalls.join('; ')}.`
          : `${chosen.choicePasses.join('; ')}.`,
      )
    add(
      'olevel-credits',
      "Number of O'level credits",
      chosen.credits < chosen.requiredCredits ? 'fail' : 'pass',
      `${plural(chosen.credits, 'credit')} that count for this course (C6 or better); it needs ${chosen.requiredCredits}${
        chosen.combo.length > 1 && req.olevelMinCreditsCombined ? ' when two sittings are combined' : ''
      }.`,
    )
  }

  // 4. Things code cannot check -------------------------------------------------------------------
  req.specialConditions.forEach((text, i) => add(`manual-${i + 1}`, 'Check yourself', 'manual', text))

  // 5. Data trust ---------------------------------------------------------------------------------
  if (req.verificationStatus === 'verified')
    add('data-status', 'Data status', 'pass', `Verified against the cited sources${req.lastVerified ? ` on ${req.lastVerified}` : ''}.`)
  else if (req.verificationStatus === 'conflicting')
    add('data-status', 'Data status', 'warn', `Official sources disagree; we apply the stricter rule. ${req.conflictNote ?? ''}`.trim())
  else add('data-status', 'Data status', 'warn', 'These rules have not yet been verified against the sources.')

  // 6. Verdict ------------------------------------------------------------------------------------
  const verdict: Verdict = checks.some((c) => c.status === 'fail')
    ? 'NOT_ELIGIBLE'
    : checks.some((c) => c.status === 'warn')
      ? 'AT_RISK'
      : 'ELIGIBLE'

  return {requirementId: req._id, verdict, checks, usedSittings}
}
