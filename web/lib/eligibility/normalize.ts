import type {Citation, Exam, Grade, Requirement, SubjectChoice, VerificationStatus} from './types'

/** A Sanity reference ({_ref}), an expanded document ({_id}) or a plain id. */
type RefLike = string | {_ref?: string; _id?: string} | null | undefined

const refId = (r: RefLike): string => (typeof r === 'string' ? r : (r?._ref ?? r?._id ?? ''))

type RawChoice = {pick?: number; from?: RefLike[]; minGrade?: string | null}
type RawProgramme =
  | {_id?: string; _ref?: string; title?: string; institution?: {_id?: string; name?: string; shortName?: string}}
  | null
  | undefined

/** Raw requirement as stored in Sanity (references) or as projected by GROQ (ids / expanded objects). */
export type RawRequirement = {
  _id: string
  session: string
  programme?: RawProgramme
  utmeCompulsory?: RefLike[]
  utmeChoices?: RawChoice[]
  utmeMinScore?: number | null
  lastCutoff?: {score?: number; session?: string} | null
  olevelMinCredits?: number
  olevelMinCreditsCombined?: number | null
  olevelCompulsory?: Array<{subject?: RefLike; minGrade?: string | null}>
  olevelChoices?: RawChoice[]
  olevelOtherSubjectsCount?: boolean
  olevelMaxSittings?: number
  olevelAcceptedExams?: string[]
  specialConditions?: string[] | null
  citations?: Array<{locator?: string; source?: Citation['source'] | {_ref?: string}}>
  verificationStatus?: string
  conflictNote?: string | null
  lastVerified?: string | null
}

const choice = (c: RawChoice): SubjectChoice => ({
  pick: c.pick ?? 1,
  from: (c.from ?? []).map(refId).filter(Boolean),
  ...(c.minGrade ? {minGrade: c.minGrade as Grade} : {}),
})

/** Turns a requirement document (stored or projected) into the plain shape `evaluate` expects. */
export function normalizeRequirement(doc: RawRequirement): Requirement {
  const programme =
    doc.programme && typeof doc.programme === 'object'
      ? {
          _id: doc.programme._id ?? doc.programme._ref,
          title: doc.programme.title,
          institution: doc.programme.institution,
        }
      : undefined
  const lastCutoff =
    doc.lastCutoff && typeof doc.lastCutoff.score === 'number' && doc.lastCutoff.session
      ? {score: doc.lastCutoff.score, session: doc.lastCutoff.session}
      : null

  return {
    _id: doc._id,
    session: doc.session,
    programme,
    utmeCompulsory: (doc.utmeCompulsory ?? []).map(refId).filter(Boolean),
    utmeChoices: (doc.utmeChoices ?? []).map(choice),
    utmeMinScore: doc.utmeMinScore ?? null,
    lastCutoff,
    olevelMinCredits: doc.olevelMinCredits ?? 5,
    olevelMinCreditsCombined: doc.olevelMinCreditsCombined ?? null,
    olevelCompulsory: (doc.olevelCompulsory ?? []).map((g) => ({
      subject: refId(g.subject),
      minGrade: (g.minGrade ?? 'C6') as Grade,
    })),
    olevelChoices: (doc.olevelChoices ?? []).map(choice),
    olevelOtherSubjectsCount: doc.olevelOtherSubjectsCount ?? false,
    olevelMaxSittings: doc.olevelMaxSittings ?? 2,
    olevelAcceptedExams: (doc.olevelAcceptedExams ?? []) as Exam[],
    specialConditions: doc.specialConditions ?? [],
    citations: (doc.citations ?? []).map((c) => ({
      locator: c.locator ?? '',
      source: c.source && 'title' in c.source ? c.source : undefined,
    })),
    verificationStatus: (doc.verificationStatus ?? 'unverified') as VerificationStatus,
    conflictNote: doc.conflictNote ?? null,
    lastVerified: doc.lastVerified ?? null,
  }
}
