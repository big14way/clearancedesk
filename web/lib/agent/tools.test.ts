import {describe, expect, it} from 'vitest'
import {readVerdict} from './tools'

const result = {
  requirementId: 'requirement-lasu-nursing-science-2026-2027',
  headline: 'At risk: your NECO 2026 result is still awaited.',
  explanation: 'Your Chemistry credit depends on NECO 2026.',
  policyNotes: [{text: 'LASU reopened its screening portal.', kbPath: 'awaiting_results_and_olevel_upload'}],
}

describe('readVerdict', () => {
  it('accepts a well-formed verdict', () => {
    expect(readVerdict({mode: 'check', results: [result]})?.results[0].requirementId).toBe(result.requirementId)
  })

  it('repairs results sent as a JSON string, with policyNotes beside them (seen in testing)', () => {
    const {policyNotes, ...withoutNotes} = result
    const verdict = readVerdict({
      mode: 'check',
      results: JSON.stringify([withoutNotes]),
      policyNotes: JSON.stringify(policyNotes),
    })
    expect(verdict?.results).toHaveLength(1)
    expect(verdict?.results[0].policyNotes).toEqual(policyNotes)
  })

  it('drops stray policyNotes when there is more than one result, rather than guessing their owner', () => {
    const {policyNotes, ...withoutNotes} = result
    const verdict = readVerdict({
      mode: 'explore',
      results: [withoutNotes, {...withoutNotes, requirementId: 'requirement-other'}],
      policyNotes,
    })
    expect(verdict?.results.map((r) => r.policyNotes)).toEqual([[], []])
  })

  it('accepts null optional fields and a missing mode', () => {
    const verdict = readVerdict({
      results: [{...result, policyNotes: [{...result.policyNotes[0], sourceTitle: null, sourceUrl: null}]}],
      noDataReason: null,
    })
    expect(verdict?.mode).toBe('check')
  })

  it('returns null when the input still does not fit', () => {
    expect(readVerdict({results: 'not json'})).toBeNull()
    expect(readVerdict({results: [{requirementId: 'x'}]})).toBeNull()
    expect(readVerdict('nonsense')).toBeNull()
  })
})
