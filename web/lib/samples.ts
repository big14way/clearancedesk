import type {Candidate, Verdict} from '@/lib/eligibility/types'

export type Sample = {
  id: string
  /** Button text. */
  label: string
  /** One line saying what the sample shows. */
  story: string
  expected: Verdict
  institutionId: string
  programmeId: string
  candidate: Candidate
}

/**
 * Fictional candidates built against real, verified 2026/2027 requirements.
 * samples.test.ts checks each `expected` verdict with the evaluator on data/seed.ndjson.
 */
export const SAMPLES: Sample[] = [
  {
    id: 'eligible',
    label: 'Eligible',
    story: 'Ada wants Computer Science at UNILAG. One WAEC sitting, with Further Maths.',
    expected: 'ELIGIBLE',
    institutionId: 'institution-unilag',
    programmeId: 'programme-unilag-computer-science',
    candidate: {
      utme: {score: 268, subjects: ['subject-english', 'subject-mathematics', 'subject-physics', 'subject-chemistry']},
      olevel: {
        sittings: [
          {
            exam: 'WAEC',
            year: 2025,
            results: [
              {subjectId: 'subject-english', grade: 'C5'},
              {subjectId: 'subject-mathematics', grade: 'B2'},
              {subjectId: 'subject-further-mathematics', grade: 'B3'},
              {subjectId: 'subject-physics', grade: 'C4'},
              {subjectId: 'subject-chemistry', grade: 'B3'},
              {subjectId: 'subject-biology', grade: 'C6'},
              {subjectId: 'subject-civic-education', grade: 'B2'},
              {subjectId: 'subject-economics', grade: 'C5'},
            ],
          },
        ],
      },
    },
  },
  {
    id: 'at-risk',
    label: 'At risk',
    story: "Tunde wants Nursing at LASU. His Chemistry credit depends on a NECO result he's still waiting for.",
    expected: 'AT_RISK',
    institutionId: 'institution-lasu',
    programmeId: 'programme-lasu-nursing-science',
    candidate: {
      utme: {score: 231, subjects: ['subject-english', 'subject-biology', 'subject-chemistry', 'subject-physics']},
      olevel: {
        sittings: [
          {
            exam: 'WAEC',
            year: 2025,
            results: [
              {subjectId: 'subject-english', grade: 'C4'},
              {subjectId: 'subject-mathematics', grade: 'C6'},
              {subjectId: 'subject-biology', grade: 'B3'},
              {subjectId: 'subject-chemistry', grade: 'D7'},
              {subjectId: 'subject-physics', grade: 'C5'},
              {subjectId: 'subject-civic-education', grade: 'B3'},
              {subjectId: 'subject-yoruba', grade: 'B2'},
            ],
          },
          {
            exam: 'NECO',
            year: 2026,
            awaitingResult: true,
            results: [
              {subjectId: 'subject-chemistry', grade: 'C5'},
              {subjectId: 'subject-english', grade: 'C5'},
              {subjectId: 'subject-mathematics', grade: 'C5'},
            ],
          },
        ],
      },
    },
  },
  {
    id: 'rejected',
    label: 'Would be rejected at clearance',
    story: 'Chioma has a strong 301 for Medicine at UNILAG, but her Physics credit comes from a second sitting.',
    expected: 'NOT_ELIGIBLE',
    institutionId: 'institution-unilag',
    programmeId: 'programme-unilag-medicine-and-surgery',
    candidate: {
      utme: {score: 301, subjects: ['subject-english', 'subject-biology', 'subject-chemistry', 'subject-physics']},
      olevel: {
        sittings: [
          {
            exam: 'WAEC',
            year: 2025,
            results: [
              {subjectId: 'subject-english', grade: 'B2'},
              {subjectId: 'subject-mathematics', grade: 'A1'},
              {subjectId: 'subject-biology', grade: 'B2'},
              {subjectId: 'subject-chemistry', grade: 'B3'},
              {subjectId: 'subject-physics', grade: 'D7'},
              {subjectId: 'subject-civic-education', grade: 'A1'},
              {subjectId: 'subject-yoruba', grade: 'B3'},
            ],
          },
          {
            exam: 'NECO',
            year: 2025,
            results: [
              {subjectId: 'subject-physics', grade: 'B3'},
              {subjectId: 'subject-english', grade: 'C4'},
              {subjectId: 'subject-mathematics', grade: 'B3'},
            ],
          },
        ],
      },
    },
  },
]
