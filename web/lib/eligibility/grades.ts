import {GRADES, type Grade} from './types'

/** A1 = 1 … F9 = 9. Lower is better. */
export function rank(grade: Grade): number {
  return GRADES.indexOf(grade) + 1
}

/** True when `grade` is at least as good as `min`. */
export function meets(grade: Grade, min: Grade): boolean {
  return rank(grade) <= rank(min)
}

/** A credit pass is C6 or better. */
export function isCredit(grade: Grade): boolean {
  return meets(grade, 'C6')
}

/** The better of two grades (lower rank). */
export function best(a: Grade, b: Grade): Grade {
  return rank(a) <= rank(b) ? a : b
}
