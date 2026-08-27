import { describe, expect, it } from 'vitest'

import { formatValidationIssue } from './api'

describe('formatValidationIssue', () => {
  it('turns model-level booking history errors into plain language', () => {
    expect(formatValidationIssue({
      loc: ['body'],
      msg: 'Value error, chargebacks_90d cannot exceed total_bookings_90d',
    })).toBe('Booking history: Chargebacks cannot exceed total bookings')
  })

  it('humanizes field names when no explicit label exists', () => {
    expect(formatValidationIssue({
      loc: ['body', 'recent_holds_24h'],
      msg: 'Input should be greater than or equal to 0',
    })).toBe('Recent holds 24h: Input should be greater than or equal to 0')
  })

  it('uses a safe fallback for malformed validation responses', () => {
    expect(formatValidationIssue({})).toBe('Field: Invalid value')
  })
})