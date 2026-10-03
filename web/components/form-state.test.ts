import {describe, expect, it} from 'vitest'
import {checkRequestSchema} from '@/lib/agent/run'
import {SAMPLES} from '@/lib/samples'
import {emptyForm, fromSample, toRequest} from './form-state'

describe('form state', () => {
  for (const sample of SAMPLES) {
    it(`${sample.id}: sample → form → request is lossless and valid`, () => {
      const built = toRequest(fromSample(sample))
      expect('request' in built).toBe(true)
      if (!('request' in built)) return
      expect(built.request).toEqual({mode: 'check', target: {programmeId: sample.programmeId}, candidate: sample.candidate})
      expect(checkRequestSchema.safeParse(built.request).success).toBe(true)
    })
  }

  it('an untouched form asks for the basics, without nagging about pre-filled rows', () => {
    const built = toRequest(emptyForm())
    expect('errors' in built && built.errors).toEqual([
      'Enter your UTME score as a whole number from 0 to 400.',
      'Choose all four UTME subjects.',
      "Add your O'level subjects and grades.",
      'Choose a university and a course to check.',
    ])
  })

  it('explore mode needs no course, and an institution narrows it', () => {
    const form = {...fromSample(SAMPLES[0]), mode: 'explore' as const, programmeId: ''}
    const built = toRequest(form)
    expect('request' in built && built.request.target).toEqual({institutionIds: [SAMPLES[0].institutionId]})
    const all = toRequest({...form, institutionId: ''})
    expect('request' in all && all.request.target).toBeUndefined()
  })
})
