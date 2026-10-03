export const GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'] as const // WAEC/NECO scale; credit = C6 or better
export const EXAMS = ['WAEC', 'NECO', 'NABTEB', 'GCE'] as const
export const VERIFICATION = ['verified', 'unverified', 'conflicting'] as const

export type Grade = (typeof GRADES)[number]
export type Exam = (typeof EXAMS)[number]
export type Verification = (typeof VERIFICATION)[number]

/** Value for `options.list` (the Studio wants a mutable array). */
export const gradeOptions = [...GRADES]
export const examOptions = [...EXAMS]
export const verificationOptions = [
  {title: 'Verified', value: 'verified'},
  {title: 'Unverified', value: 'unverified'},
  {title: 'Conflicting', value: 'conflicting'},
]
