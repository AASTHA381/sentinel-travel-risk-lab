import type { AnalystBrief, AssessmentResult, BookingRequest, ComponentScore, Decision, GraphData, HealthStatus, ModelMetadata, RiskReason } from './types'

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

function buildComponent(reasons: RiskReason[]): ComponentScore {
  const ordered = [...reasons].sort((a, b) => b.contribution - a.contribution)
  const score = Math.round(Math.min(ordered.reduce((sum, r) => sum + r.contribution, 0), 1.0) * 1000) / 1000
  return { score, reasons: ordered }
}

function localAssessBooking(booking: BookingRequest): AssessmentResult {
  const paymentReasons: RiskReason[] = []
  const chargebackRate = booking.chargebacks_90d / Math.max(booking.total_bookings_90d, 1)
  if (booking.card_on_blocklist) paymentReasons.push({ code: 'card_blocklist', label: 'Payment token is on the demo blocklist', contribution: 0.95, source: 'rule' })
  if (booking.device_linked_to_fraud) paymentReasons.push({ code: 'fraud_device', label: 'Device is linked to a previously confirmed case', contribution: 0.55, source: 'rule' })
  if (booking.ip_country !== booking.card_country) paymentReasons.push({ code: 'country_mismatch', label: 'IP and card countries differ', contribution: 0.16, source: 'rule' })
  if (booking.hours_until_departure < 2) paymentReasons.push({ code: 'imminent_departure', label: 'Departure is less than two hours away', contribution: 0.18, source: 'rule' })
  if (booking.account_age_days < 7) paymentReasons.push({ code: 'new_account', label: 'Agent account is less than seven days old', contribution: 0.18, source: 'rule' })
  if (booking.payment_attempts_10m >= 5) paymentReasons.push({ code: 'payment_velocity', label: 'Five or more payment attempts occurred in ten minutes', contribution: 0.28, source: 'rule' })
  if (chargebackRate >= 0.05 && booking.total_bookings_90d >= 10) paymentReasons.push({ code: 'chargeback_history', label: 'Recent chargeback rate is at least five percent', contribution: 0.38, source: 'rule' })

  const inventoryReasons: RiskReason[] = []
  const cancellationRate = booking.cancellations_90d / Math.max(booking.total_bookings_90d, 1)
  if (booking.seats_requested >= 20) inventoryReasons.push({ code: 'bulk_quantity', label: 'Booking requests at least twenty seats', contribution: 0.34, source: 'rule' })
  else if (booking.seats_requested >= 8) inventoryReasons.push({ code: 'large_quantity', label: 'Booking requests at least eight seats', contribution: 0.16, source: 'rule' })
  if (booking.recent_holds_24h >= 10) inventoryReasons.push({ code: 'hold_velocity', label: 'Agent created at least ten holds in 24 hours', contribution: 0.33, source: 'rule' })
  if (booking.recent_late_cancellations_90d >= 3) inventoryReasons.push({ code: 'late_cancellations', label: 'Agent has at least three recent late cancellations', contribution: 0.34, source: 'rule' })
  if (cancellationRate >= 0.4 && booking.total_bookings_90d >= 10) inventoryReasons.push({ code: 'cancellation_rate', label: 'Recent cancellation rate is at least forty percent', contribution: 0.28, source: 'rule' })
  if (booking.bookings_24h >= 25) inventoryReasons.push({ code: 'booking_velocity', label: 'Agent created at least twenty-five bookings in 24 hours', contribution: 0.24, source: 'rule' })

  const botReasons: RiskReason[] = []
  if (booking.interaction_duration_seconds < 8) botReasons.push({ code: 'fast_completion', label: 'Form was completed in under eight seconds', contribution: 0.36, source: 'telemetry' })
  if (booking.fields_pasted >= 6) botReasons.push({ code: 'paste_pattern', label: 'Six or more fields were filled by paste', contribution: 0.24, source: 'telemetry' })
  if (booking.pointer_events < 3) botReasons.push({ code: 'low_pointer_activity', label: 'Fewer than three pointer events were observed', contribution: 0.20, source: 'telemetry' })
  if (booking.bookings_24h >= 50) botReasons.push({ code: 'automation_velocity', label: 'Account created at least fifty bookings in 24 hours', contribution: 0.28, source: 'telemetry' })

  const payment = buildComponent(paymentReasons)
  const inventory = buildComponent(inventoryReasons)
  const bot = buildComponent(botReasons)
  const overall = Math.round(Math.max(payment.score, inventory.score, bot.score * 0.6) * 1000) / 1000

  const decision: Decision = (booking.card_on_blocklist || overall >= 0.8) ? 'block' : overall >= 0.35 ? 'review' : 'approve'
  const allReasons = [...payment.reasons, ...inventory.reasons, ...bot.reasons].sort((a, b) => b.contribution - a.contribution)
  const summary = allReasons.length === 0
    ? 'Approved because no configured risk signal was triggered.'
    : `${decision.charAt(0).toUpperCase() + decision.slice(1)} recommended because ${allReasons.slice(0, 3).map((r) => r.label.toLowerCase()).join('; ')}.`

  return {
    booking_id: booking.booking_id,
    decision,
    overall_score: overall,
    payment_fraud: payment,
    inventory_abuse: inventory,
    bot_likelihood: bot,
    engine_mode: 'hybrid_rules_and_gbdt',
    policy_version: '2026.08-demo.1',
    summary,
  }
}

const LOCAL_METADATA: ModelMetadata = {
  generated_at_utc: '2026-08-28T20:09:24.447841+00:00',
  data_disclosure: 'Synthetic data generated by ml.generate_data; metrics are not production evidence.',
  row_count: 15000,
  split_strategy: 'Chronological 70% train, 15% validation, 15% untouched test',
  split_counts: { train: 10554, validation: 2220, test: 2226 },
  test_metrics: {
    payment_fraud: {
      threshold: 0.5, precision: 0.7973, recall: 0.4126, pr_auc: 0.5005, roc_auc: 0.7887, false_positive_rate: 0.0072,
      confusion_matrix: { tn: 2068, fp: 15, fn: 84, tp: 59 },
    },
    inventory_abuse: {
      threshold: 0.5, precision: 0.8387, recall: 0.624, pr_auc: 0.6614, roc_auc: 0.8484, false_positive_rate: 0.0152,
      confusion_matrix: { tn: 1946, fp: 30, fn: 94, tp: 156 },
    },
  },
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

export async function assessBooking(booking: BookingRequest): Promise<AssessmentResult> {
  try {
    return await request('/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    })
  } catch {
    return localAssessBooking(booking)
  }
}

export async function getModelMetadata(): Promise<ModelMetadata> {
  try {
    return await request('/model')
  } catch {
    return LOCAL_METADATA
  }
}

export async function getHealth(): Promise<HealthStatus> {
  try {
    return await request('/health')
  } catch {
    return { status: 'ok', engine_mode: 'client_hybrid_engine' }
  }
}

export async function getAgentNetwork(agentId: string): Promise<GraphData> {
  try {
    return await request(`/network/${encodeURIComponent(agentId)}`)
  } catch {
    return {
      provider: 'offline_demo',
      data_disclosure: 'Synthetic relationship data for demonstration only.',
      nodes: [
        { id: agentId, label: agentId, kind: 'agent', status: 'investigating' },
        { id: 'DEV-77A', label: 'Device 77A', kind: 'device', status: 'linked' },
        { id: 'AGT-9912', label: 'Agent 9912', kind: 'agent', status: 'blocked' },
        { id: 'IP-185.22', label: '185.22.x.x', kind: 'ip', status: 'observed' },
        { id: 'PAY-TKN-31', label: 'Token ...31', kind: 'payment', status: 'chargeback' },
      ],
      edges: [
        { source: agentId, target: 'DEV-77A', relationship: 'USED_DEVICE' },
        { source: 'AGT-9912', target: 'DEV-77A', relationship: 'USED_DEVICE' },
        { source: agentId, target: 'IP-185.22', relationship: 'CONNECTED_FROM' },
        { source: 'AGT-9912', target: 'PAY-TKN-31', relationship: 'USED_PAYMENT' },
      ],
    }
  }
}

export async function generateAnalystBrief(assessment: AssessmentResult): Promise<AnalystBrief> {
  try {
    return await request('/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment }),
    })
  } catch {
    return {
      provider: 'offline_deterministic',
      text: assessment.summary,
      data_disclosure: 'No external service used; summary is assembled from returned risk evidence.',
    }
  }
}
