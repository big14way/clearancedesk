import {readFileSync} from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {evaluate} from './eligibility/evaluate'
import {normalizeRequirement, type RawRequirement} from './eligibility/normalize'
import {candidateSchema} from './eligibility/types'
import {SAMPLES} from './samples'

const docs: Array<RawRequirement & {_type: string; institution?: {_ref: string}}> = readFileSync(
  path.resolve(__dirname, '../../data/seed.ndjson'),
  'utf8',
)
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))

describe('sample candidates', () => {
  it('has one sample per verdict', () => {
    expect(SAMPLES.map((s) => s.expected).sort()).toEqual(['AT_RISK', 'ELIGIBLE', 'NOT_ELIGIBLE'])
  })

  for (const sample of SAMPLES) {
    it(`${sample.id}: ${sample.expected} against a verified requirement`, () => {
      expect(candidateSchema.safeParse(sample.candidate).success).toBe(true)

      const programme = docs.find((d) => d._id === sample.programmeId)
      expect(programme?.institution?._ref).toBe(sample.institutionId)

      const raw = docs.find((d) => d._type === 'requirement' && (d.programme as {_ref?: string})?._ref === sample.programmeId)
      expect(raw).toBeDefined()
      const requirement = normalizeRequirement(raw!)
      expect(requirement.verificationStatus).toBe('verified')

      const result = evaluate(requirement, sample.candidate)
      const problems = result.checks.filter((c) => c.status === 'fail' || c.status === 'warn').map((c) => `${c.id}: ${c.detail}`)
      expect(result.verdict, problems.join('\n')).toBe(sample.expected)
    })
  }

  it('the at-risk sample is at risk only because a result is awaited', () => {
    const sample = SAMPLES.find((s) => s.id === 'at-risk')!
    const raw = docs.find((d) => d._type === 'requirement' && (d.programme as {_ref?: string})?._ref === sample.programmeId)!
    const checks = evaluate(normalizeRequirement(raw), sample.candidate).checks
    expect(checks.filter((c) => c.status === 'warn').map((c) => c.id)).toEqual(['olevel-awaiting'])
    expect(checks.some((c) => c.status === 'fail')).toBe(false)
  })

  it('the rejected sample fails only on O’level sittings, not on UTME', () => {
    const sample = SAMPLES.find((s) => s.id === 'rejected')!
    const raw = docs.find((d) => d._type === 'requirement' && (d.programme as {_ref?: string})?._ref === sample.programmeId)!
    const checks = evaluate(normalizeRequirement(raw), sample.candidate).checks
    expect(checks.find((c) => c.id === 'utme-subjects')?.status).toBe('pass')
    expect(checks.find((c) => c.id === 'utme-score')?.status).toBe('pass')
    expect(checks.find((c) => c.id === 'olevel-sittings')?.status).toBe('fail')
  })
})
