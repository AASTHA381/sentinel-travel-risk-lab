import { inventoryRiskBooking, paymentRiskBooking, trustedBooking } from './fixtures'
import type { BookingRequest } from './types'

export const scenarios = [
  { name: 'Trusted', booking: trustedBooking },
  { name: 'Payment risk', booking: paymentRiskBooking },
  { name: 'Inventory abuse', booking: inventoryRiskBooking },
] as const

export function activeScenario(booking: BookingRequest): string {
  return scenarios.find(({ booking: preset }) =>
    Object.entries(preset).every(([key, value]) => booking[key as keyof BookingRequest] === value),
  )?.name ?? 'Custom'
}

export function formatHistoryRate(count: number, total: number): string {
  if (total <= 0) return count > 0 ? 'Invalid' : 'No history'
  return `${Math.round((count / total) * 100)}%`
}