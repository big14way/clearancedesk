import {readFileSync} from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {assignChoiceGroups, evaluate} from './evaluate'
import {meets, rank} from './grades'
import {normalizeRequirement, type RawRequirement} from './normalize'
import {candidateSchema, type Candidate, type Grade, type OlevelSitting, type Requirement} from './types'

// ---------------------------------------------------------------- fixtures

const S = (id: string) => `subject-${id}`

/** A science course: UTME English, Maths, Physics + one of Chemistry/Biology; O'level E, M, P + one of C/B; 5 credits. */
function requirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    _id: 'requirement-test-2026-2027',
    session: '2026/2027',
    programme: {title: 'Computer Science', institution: {shortName: 'TEST'}},
    utmeCompulsory: [S('english'), S('mathematics'), S('physics')],
    utmeChoices: [{pick: 1, from: [S('chemistry'), S('biology')]}],
    utmeMinScore: 200,
    lastCutoff: null,
    olevelMinCredits: 5,
    olevelMinCreditsCombined: null,
    olevelCompulsory: [
      {subject: S('english'), minGrade: 'C6'},
      {subject: S('mathematics'), minGrade: 'C6'},
      {subject: S('physics'), minGrade: 'C6'},
    ],
    olevelChoices: [{pick: 1, from: [S('chemistry'), S('biology')], minGrade: 'C6'}],
    olevelOtherSubjectsCount: true,
    olevelMaxSittings: 2,
    olevelAcceptedExams: ['WAEC', 'NECO', 'GCE'],
    specialConditions: [],
    citations: [{locator: 'test fixture'}],
    verificationStatus: 'verified',
    conflictNote: null,
    lastVerified: '2026-10-03',
    ...overrides,
  }
}

const sitting = (grades: Record<string, Grade>, extra: Partial<OlevelSitting> = {}): OlevelSitting => ({
  exam: 'WAEC',
  year: 2025,
  results: Object.entries(grades).map(([id, grade]) => ({subjectId: S(id), grade})),
  ...extra,
})

const strongSitting = () =>
  sitting({english: 'B3', mathematics: 'A1', physics: 'B2', chemistry: 'B3', biology: 'C4', economics: 'C5'})

function candidate(overrides: {score?: number; utme?: string[]; sittings?: OlevelSitting[]} = {}): Candidate {
  return candidateSchema.parse({
    utme: {score: overrides.score ?? 260, subjects: (overrides.utme ?? ['english', 'mathematics', 'physics', 'chemistry']).map(S)},
    olevel: {sittings: overrides.sittings ?? [strongSitting()]},
  })
}

const check = (result: ReturnType<typeof evaluate>, id: string) => result.checks.find((c) => c.id === id)

// ---------------------------------------------------------------- grades

describe('grades', () => {
  it('ranks A1 best and F9 worst', () => {
    expect(rank('A1')).toBe(1)
    expect(rank('F9')).toBe(9)
  })
  it('meets() compares by rank', () => {
    expect(meets('C6', 'C6')).toBe(true)
    expect(meets('B3', 'C6')).toBe(true)
    expect(meets('D7', 'C6')).toBe(false)
  })
})

// ---------------------------------------------------------------- baseline

describe('evaluate — baseline', () => {
  it('a strong candidate for a verified requirement is ELIGIBLE', () => {
    const r = evaluate(requirement(), candidate())
    expect(r.verdict).toBe('ELIGIBLE')
    expect(r.checks.filter((c) => c.status === 'fail')).toEqual([])
    expect(r.usedSittings).toEqual([0])
  })
})

// ---------------------------------------------------------------- spec test list

describe('evaluate — O\'level grades', () => {
  it('D7 in a compulsory subject fails; C6 passes', () => {
    const fail = evaluate(requirement(), candidate({sittings: [sitting({english: 'B3', mathematics: 'D7', physics: 'B2', chemistry: 'B3', biology: 'C4'})]}))
    expect(fail.verdict).toBe('NOT_ELIGIBLE')
    expect(check(fail, 'olevel-compulsory')?.status).toBe('fail')
    expect(check(fail, 'olevel-compulsory')?.detail).toMatch(/Mathematics: you have D7, needs C6/)

    const pass = evaluate(requirement(), candidate({sittings: [sitting({english: 'B3', mathematics: 'C6', physics: 'B2', chemistry: 'B3', biology: 'C4'})]}))
    expect(check(pass, 'olevel-compulsory')?.status).toBe('pass')
    expect(pass.verdict).toBe('ELIGIBLE')
  })
})

describe('evaluate — sittings', () => {
  it('three sittings with max 2: the best pair is chosen', () => {
    const sittings = [
      sitting({english: 'C5', economics: 'B3'}, {year: 2023}), // useless on its own
      sitting({english: 'B3', mathematics: 'B2', physics: 'C4'}, {year: 2024}),
      sitting({chemistry: 'B3', geography: 'C5'}, {exam: 'NECO', year: 2024}),
    ]
    const r = evaluate(requirement(), candidate({sittings}))
    expect(r.verdict).toBe('ELIGIBLE')
    expect(r.usedSittings).toEqual([1, 2])
    expect(check(r, 'olevel-sittings')?.detail).toMatch(/WAEC 2024 and NECO 2024/)
  })

  it('max 1 sitting fails when the credits are split across two sittings', () => {
    const sittings = [
      sitting({english: 'B3', mathematics: 'B2', physics: 'C4'}, {year: 2024}),
      sitting({chemistry: 'B3', economics: 'C5'}, {exam: 'NECO', year: 2024}),
    ]
    const r = evaluate(requirement({olevelMaxSittings: 1}), candidate({sittings}))
    expect(r.verdict).toBe('NOT_ELIGIBLE')
    expect(check(r, 'olevel-sittings')).toMatchObject({status: 'fail', detail: 'This course allows 1 sitting; you need 2 sittings to meet it.'})
  })

  it('a non-accepted exam is excluded with a WARN', () => {
    const sittings = [strongSitting(), sitting({english: 'A1', mathematics: 'A1'}, {exam: 'NABTEB'})]
    const r = evaluate(requirement(), candidate({sittings}))
    expect(check(r, 'olevel-exams')).toMatchObject({status: 'warn'})
    expect(check(r, 'olevel-exams')?.detail).toMatch(/NABTEB 2025 was left out/)
    expect(r.usedSittings).toEqual([0])
    expect(r.verdict).toBe('AT_RISK')
  })

  it('only a non-accepted exam → NOT_ELIGIBLE', () => {
    const r = evaluate(requirement(), candidate({sittings: [{...strongSitting(), exam: 'NABTEB'}]}))
    expect(r.verdict).toBe('NOT_ELIGIBLE')
    expect(check(r, 'olevel-sittings')?.status).toBe('fail')
  })
})

describe('evaluate — UTME subjects', () => {
  it('a missing UTME compulsory subject fails', () => {
    const r = evaluate(requirement(), candidate({utme: ['english', 'mathematics', 'chemistry', 'biology']}))
    expect(r.verdict).toBe('NOT_ELIGIBLE')
    expect(check(r, 'utme-subjects')?.detail).toMatch(/Physics is compulsory/)
  })

  it('the same subject cannot satisfy a compulsory rule and a choice rule', () => {
    // Physics is compulsory AND listed in the choice group; the candidate's 4th subject (Economics) fits nothing.
    const req = requirement({utmeChoices: [{pick: 1, from: [S('physics'), S('chemistry')]}]})
    const r = evaluate(req, candidate({utme: ['english', 'mathematics', 'physics', 'economics']}))
    expect(check(r, 'utme-subjects')?.status).toBe('fail')
    expect(check(r, 'utme-subjects')?.detail).toMatch(/1 more UTME subject from: Physics or Chemistry/)
  })

  it('a choice group with pick: 2 needs two distinct subjects', () => {
    const req = requirement({
      utmeCompulsory: [S('english'), S('mathematics')],
      utmeChoices: [{pick: 2, from: [S('physics'), S('chemistry'), S('biology')]}],
    })
    expect(evaluate(req, candidate({utme: ['english', 'mathematics', 'physics', 'chemistry']})).verdict).toBe('ELIGIBLE')
    const r = evaluate(req, candidate({utme: ['english', 'mathematics', 'physics', 'economics']}))
    expect(check(r, 'utme-subjects')?.detail).toMatch(/1 more UTME subject/)
  })

  it('assigns subjects to groups by matching, not greedily in order', () => {
    // Greedy would give Chemistry to group 1 and leave group 2 (Chemistry only) empty.
    const groups = [
      {pick: 1, from: ['chem', 'bio']},
      {pick: 1, from: ['chem']},
    ]
    expect(assignChoiceGroups(['chem', 'bio'], groups, (s, g) => g.from.includes(s))).toEqual([['bio'], ['chem']])
  })
})

describe('evaluate — UTME score', () => {
  it('a score below the minimum fails', () => {
    const r = evaluate(requirement(), candidate({score: 190}))
    expect(r.verdict).toBe('NOT_ELIGIBLE')
    expect(check(r, 'utme-score')?.detail).toMatch(/190 is below TEST's minimum of 200 for 2026\/2027/)
  })

  it('a score between the minimum and the last cut-off is AT_RISK', () => {
    const r = evaluate(requirement({lastCutoff: {score: 250, session: '2025/2026'}}), candidate({score: 230}))
    expect(check(r, 'utme-score')?.status).toBe('pass')
    expect(check(r, 'utme-cutoff')).toMatchObject({status: 'warn'})
    expect(r.verdict).toBe('AT_RISK')
  })

  it('an unknown institution minimum is a WARN, not a pass', () => {
    const r = evaluate(requirement({utmeMinScore: null}), candidate())
    expect(check(r, 'utme-score')?.status).toBe('warn')
    expect(r.verdict).toBe('AT_RISK')
  })
})

describe('evaluate — data trust and awaiting results', () => {
  it('an unverified requirement is AT_RISK', () => {
    expect(evaluate(requirement({verificationStatus: 'unverified'}), candidate()).verdict).toBe('AT_RISK')
  })

  it('a conflicting requirement is AT_RISK and shows the conflict note', () => {
    const r = evaluate(requirement({verificationStatus: 'conflicting', conflictNote: 'JAMB and the university disagree.'}), candidate())
    expect(r.verdict).toBe('AT_RISK')
    expect(check(r, 'data-status')?.detail).toMatch(/JAMB and the university disagree/)
  })

  it('an awaiting result is AT_RISK', () => {
    const r = evaluate(requirement(), candidate({sittings: [{...strongSitting(), awaitingResult: true}]}))
    expect(check(r, 'olevel-awaiting')?.status).toBe('warn')
    expect(r.verdict).toBe('AT_RISK')
  })

  it('manual checks are shown but never change the verdict', () => {
    const r = evaluate(requirement({specialConditions: ['Post-UTME screening required']}), candidate())
    expect(check(r, 'manual-1')).toMatchObject({status: 'manual', detail: 'Post-UTME screening required'})
    expect(r.verdict).toBe('ELIGIBLE')
  })
})

describe('evaluate — credit counting', () => {
  // E, M, P compulsory + one of C/B; candidate has exactly 4 relevant credits + Economics.
  const fourPlusEconomics = () => [sitting({english: 'B3', mathematics: 'B2', physics: 'C4', chemistry: 'B3', economics: 'C5'})]

  it('olevelOtherSubjectsCount: true lets any other credit reach the minimum', () => {
    const r = evaluate(requirement({olevelOtherSubjectsCount: true}), candidate({sittings: fourPlusEconomics()}))
    expect(check(r, 'olevel-credits')?.status).toBe('pass')
  })

  it('olevelOtherSubjectsCount: false does not count unrelated credits', () => {
    const r = evaluate(requirement({olevelOtherSubjectsCount: false}), candidate({sittings: fourPlusEconomics()}))
    expect(check(r, 'olevel-credits')).toMatchObject({status: 'fail'})
    expect(check(r, 'olevel-credits')?.detail).toMatch(/^4 credits/)
  })

  it('every qualifying credit in a choice group counts, not only `pick` of them', () => {
    // pick 1 from C/B, but both are credits: 3 compulsory + 2 = 5 without counting "other" subjects
    const r = evaluate(
      requirement({olevelOtherSubjectsCount: false}),
      candidate({sittings: [sitting({english: 'B3', mathematics: 'B2', physics: 'C4', chemistry: 'B3', biology: 'C6'})]}),
    )
    expect(check(r, 'olevel-credits')?.status).toBe('pass')
  })

  it('olevelMinCreditsCombined: 5 at one sitting or 6 at two sittings', () => {
    const req = requirement({olevelOtherSubjectsCount: false, olevelMinCreditsCombined: 6})
    // all five credits sit in one sitting → 5 is enough
    expect(evaluate(req, candidate({sittings: [sitting({english: 'B3', mathematics: 'B2', physics: 'C4', chemistry: 'B3', biology: 'C5'})]})).verdict).toBe('ELIGIBLE')
    // the same five credits split across two sittings → needs 6
    const split = [sitting({english: 'B3', mathematics: 'B2', physics: 'C4'}), sitting({chemistry: 'B3', biology: 'C5'}, {exam: 'NECO'})]
    const r = evaluate(req, candidate({sittings: split}))
    expect(r.verdict).toBe('NOT_ELIGIBLE')
    expect(check(r, 'olevel-credits')?.detail).toMatch(/needs 6 when two sittings are combined/)
    // six across two sittings → passes (the extra credit must count for the course, here via othersCount)
    const six = [sitting({english: 'B3', mathematics: 'B2', physics: 'C4', economics: 'C5'}), sitting({chemistry: 'B3', biology: 'C5'}, {exam: 'NECO'})]
    expect(evaluate({...req, olevelOtherSubjectsCount: true}, candidate({sittings: six})).verdict).toBe('ELIGIBLE')
  })
})

describe('candidate validation', () => {
  it('rejects repeated UTME subjects and more than 3 sittings', () => {
    expect(() => candidate({utme: ['english', 'english', 'physics', 'chemistry']})).toThrow(/distinct/)
    expect(() => candidate({sittings: [strongSitting(), strongSitting(), strongSitting(), strongSitting()]})).toThrow()
  })
})

// ---------------------------------------------------------------- the real dataset

describe('real requirements from data/seed.ndjson', () => {
  const seed = readFileSync(path.resolve(__dirname, '../../../data/seed.ndjson'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
  const requirements = seed.filter((d) => d._type === 'requirement').map((d) => normalizeRequirement(d as RawRequirement))
  const byId = (id: string) => requirements.find((r) => r._id === `requirement-${id}`)!

  it('normalises all 34 requirements and evaluates each without throwing', () => {
    expect(requirements).toHaveLength(34)
    for (const r of requirements) {
      const result = evaluate(r, candidate())
      expect(['ELIGIBLE', 'AT_RISK', 'NOT_ELIGIBLE']).toContain(result.verdict)
      expect(result.checks.length).toBeGreaterThan(3)
    }
  })

  const medic = (sittings: OlevelSitting[], score = 290) =>
    candidate({score, utme: ['english', 'biology', 'chemistry', 'physics'], sittings})
  const medicSitting = () => sitting({english: 'B3', mathematics: 'B2', physics: 'B3', chemistry: 'A1', biology: 'B2', 'agricultural-science': 'C4'})

  it('UNILAG Medicine (verified): a strong one-sitting candidate is ELIGIBLE', () => {
    expect(evaluate(byId('unilag-medicine-and-surgery-2026-2027'), medic([medicSitting()])).verdict).toBe('ELIGIBLE')
  })

  it('UNILAG Medicine: the same credits over two sittings are NOT_ELIGIBLE (one sitting only)', () => {
    const split = [
      sitting({english: 'B3', mathematics: 'B2', physics: 'B3'}),
      sitting({chemistry: 'A1', biology: 'B2'}, {exam: 'NECO'}),
    ]
    const r = evaluate(byId('unilag-medicine-and-surgery-2026-2027'), medic(split))
    expect(r.verdict).toBe('NOT_ELIGIBLE')
    expect(check(r, 'olevel-sittings')?.detail).toMatch(/allows 1 sitting/)
  })

  it('UNILAG Computer Science: missing Further Mathematics at O\'level is NOT_ELIGIBLE', () => {
    const r = evaluate(byId('unilag-computer-science-2026-2027'), candidate())
    expect(r.verdict).toBe('NOT_ELIGIBLE')
    expect(check(r, 'olevel-compulsory')?.detail).toMatch(/Further Mathematics: not in these results/)
  })

  it('UI Medicine: UI publishes no UTME minimum, so a strong candidate is AT_RISK, not ELIGIBLE', () => {
    const r = evaluate(byId('ui-medicine-and-surgery-2026-2027'), medic([medicSitting()]))
    expect(check(r, 'utme-score')?.status).toBe('warn')
    expect(r.verdict).toBe('AT_RISK')
  })

  it('UNN Medicine: 160 is UNN\'s minimum, 150 fails', () => {
    expect(check(evaluate(byId('unn-medicine-and-surgery-2026-2027'), medic([medicSitting()], 150)), 'utme-score')?.status).toBe('fail')
  })

  it('LASU Medicine: LASU says only "SSCE (or equivalent)", so a NABTEB result counts (eval case C11)', () => {
    const r = evaluate(byId('lasu-medicine-and-surgery-2026-2027'), medic([{...medicSitting(), exam: 'NABTEB'}]))
    expect(check(r, 'olevel-exams')).toBeUndefined()
    expect(r.verdict).toBe('ELIGIBLE')
  })
})
