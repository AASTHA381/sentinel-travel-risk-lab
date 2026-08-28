import type { AnalystBrief, AssessmentResult, BookingRequest, GraphData, HealthStatus, ModelMetadata } from './types'

const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const API_BASE = `${API_ORIGIN}/api`

const FIELD_LABELS: Record<string, string> = {
  body: 'Booking history',
  chargebacks_90d: 'Chargebacks',
  total_bookings_90d: 'total bookings',
  cancellations_90d: 'Cancellations',
  seats_requested: 'Seats requested',
  ip_country: 'IP country',
  card_country: 'Card country',
}

interface ValidationIssue {
  loc?: Array<string | number>
  msg?: string
}

export function formatValidationIssue(issue: ValidationIssue): string {
  const rawLocation = String(issue.loc?.at(-1) ?? 'field')
  const location = FIELD_LABELS[rawLocation] ?? rawLocation.replaceAll('_', ' ')
  const rawMessage = issue.msg ?? 'Invalid value'
  const message = Object.entries(FIELD_LABELS).reduce(
    (current, [field, label]) => current.replaceAll(field, label.toLowerCase()),
    rawMessage.replace(/^Value error,\s*/i, ''),
  )
  const sentence = message.charAt(0).toUpperCase() + message.slice(1)
  return `${location.charAt(0).toUpperCase() + location.slice(1)}: ${sentence}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    if (Array.isArray(detail)) {
      const messages = detail.map(formatValidationIssue).join('; ')
      throw new Error(messages)
    }
    throw new Error(typeof detail === 'string' ? detail : `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function assessBooking(booking: BookingRequest): Promise<AssessmentResult> {
  return request('/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  })
}

export function getModelMetadata(): Promise<ModelMetadata> {
  return request('/model')
}

export function getHealth(): Promise<HealthStatus> {
  return request('/health')
}

export function getAgentNetwork(agentId: string): Promise<GraphData> {
  return request(`/network/${encodeURIComponent(agentId)}`)
}

export function generateAnalystBrief(assessment: AssessmentResult): Promise<AnalystBrief> {
  return request('/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessment }),
  })
}
