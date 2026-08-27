import { describe, expect, it } from 'vitest'

import { activeScenario, formatHistoryRate } from '../assessment'
import { paymentRiskBooking, trustedBooking } from '../fixtures'

describe('assessment view helpers', () => {
  it('identifies a loaded scenario and marks edited values as custom', () => {
    expect(activeScenario(trustedBooking)).toBe('Trusted')
    expect(activeScenario(paymentRiskBooking)).toBe('Payment risk')
    expect(activeScenario({ ...trustedBooking, seats_requested: 3 })).toBe('Custom')
  })

  it('formats useful history rates and impossible zero-history values', () => {
    expect(formatHistoryRate(2, 20)).toBe('10%')
    expect(formatHistoryRate(0, 0)).toBe('No history')
    expect(formatHistoryRate(1, 0)).toBe('Invalid')
  })
})