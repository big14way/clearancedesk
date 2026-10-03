import {z} from 'zod'

/** WAEC/NECO grade scale, best to worst. A credit is C6 or better. */
export const GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'] as const
export type Grade = (typeof GRADES)[number]

export const EXAMS = ['WAEC', 'NECO', 'NABTEB', 'GCE'] as const
export type Exam = (typeof EXAMS)[number]

export type VerificationStatus = 'verified' | 'unverified' | 'conflicting'

// ---------------------------------------------------------------- candidate (validated input)

export const olevelSittingSchema = z.object({
  exam: z.enum(EXAMS),
  year: z.number().int().min(1990).max(2100),
  awaitingResult: z.boolean().optional(),
  results: z
    .array(z.object({subjectId: z.string().min(1), grade: z.enum(GRADES)}))
    .max(9)
    .refine((rs) => new Set(rs.map((r) => r.subjectId)).size === rs.length, 'A subject appears twice in one sitting'),
})

export const candidateSchema = z.object({
  utme: z.object({
    score: z.number().int().min(0).max(400),
    subjects: z
      .array(z.string().min(1))
      .length(4, 'UTME has exactly 4 subjects')
      .refine((s) => new Set(s).size === s.length, 'UTME subjects must be distinct'),
  }),
  olevel: z.object({
    sittings: z.array(olevelSittingSchema).min(1).max(3),
  }),
})

export type OlevelSitting = z.infer<typeof olevelSittingSchema>
export type Candidate = z.infer<typeof candidateSchema>

// ---------------------------------------------------------------- requirement (normalised from Sanity)

export type SubjectChoice = {pick: number; from: string[]; minGrade?: Grade}

export type Citation = {
  locator: string
  source?: {_id?: string; title?: string; url?: string; publisher?: string; authority?: 'official' | 'secondary'}
}

/** One programme's rules for one session. Subject references are plain subject document ids. */
export type Requirement = {
  _id: string
  session: string
  programme?: {_id?: string; title?: string; institution?: {_id?: string; name?: string; shortName?: string}}
  utmeCompulsory: string[]
  utmeChoices: SubjectChoice[]
  utmeMinScore: number | null
  lastCutoff: {score: number; session: string} | null
  olevelMinCredits: number
  /** Credits needed when results from more than one sitting are combined, if higher than olevelMinCredits. */
  olevelMinCreditsCombined?: number | null
  olevelCompulsory: Array<{subject: string; minGrade: Grade}>
  olevelChoices: SubjectChoice[]
  olevelOtherSubjectsCount: boolean
  olevelMaxSittings: number
  olevelAcceptedExams: Exam[]
  specialConditions: string[]
  citations: Citation[]
  verificationStatus: VerificationStatus
  conflictNote?: string | null
  lastVerified?: string | null
}

// ---------------------------------------------------------------- result

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'manual'

export type Check = {
  id: string
  label: string
  status: CheckStatus
  detail: string
  citations: Citation[]
}

export type Verdict = 'ELIGIBLE' | 'AT_RISK' | 'NOT_ELIGIBLE'

export type EvaluationResult = {
  requirementId: string
  verdict: Verdict
  checks: Check[]
  /** Indexes into candidate.olevel.sittings of the sittings the O'level verdict is based on. */
  usedSittings: number[]
}
