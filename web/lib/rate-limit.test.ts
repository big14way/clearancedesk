import {afterEach, describe, expect, it, vi} from 'vitest'
import {overIpLimit} from './rate-limit'

afterEach(() => vi.useRealTimers())

describe('overIpLimit', () => {
  it('refuses after `limit` requests, and retries while refused do not extend the lockout', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T10:00:00Z'))
    const ip = `test-${Math.random()}`
    for (let i = 0; i < 3; i++) expect(overIpLimit(ip, 3)).toBe(false)

    // Retry every minute for 9 minutes: all refused.
    for (let m = 1; m <= 9; m++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 9, 4, 10, m, 30)))
      expect(overIpLimit(ip, 3)).toBe(true)
    }
    // 10 minutes after the accepted requests the window has moved, despite the retries.
    vi.setSystemTime(new Date('2026-10-04T10:10:01Z'))
    expect(overIpLimit(ip, 3)).toBe(false)
  })

  it('counts each IP separately', () => {
    const ip = `test-${Math.random()}`
    for (let i = 0; i < 3; i++) overIpLimit(ip, 3)
    expect(overIpLimit(ip, 3)).toBe(true)
    expect(overIpLimit(`${ip}-other`, 3)).toBe(false)
  })
})
