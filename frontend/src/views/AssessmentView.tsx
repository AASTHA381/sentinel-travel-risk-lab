import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Activity, AlertTriangle, ChevronRight, LoaderCircle, ShieldCheck } from 'lucide-react'
import { activeScenario, formatHistoryRate, scenarios } from '../assessment'
import type { AssessmentResult, BookingRequest } from '../types'
import { NumberField, ToggleField } from '../components/Inputs'
import { ResultPanel } from '../components/ResultPanel'

export function AssessmentView({
  booking,
  setBooking,
  result,
  loading,
  error,
  captureTelemetry,
  setCaptureTelemetry,
  apiOnline,
  onEdit,
  onPreset,
  onSubmit,
}: {
  booking: BookingRequest
  setBooking: Dispatch<SetStateAction<BookingRequest>>
  result: AssessmentResult | null
  loading: boolean
  error: string | null
  captureTelemetry: boolean
  setCaptureTelemetry: (value: boolean) => void
  apiOnline: boolean
  onEdit: () => void
  onPreset: (booking: BookingRequest) => void
  onSubmit: (event: FormEvent) => void
}) {
  const scenario = activeScenario(booking)
  const chargebackError = booking.chargebacks_90d > booking.total_bookings_90d ? 'Exceeds total bookings' : undefined
  const cancellationError = booking.cancellations_90d > booking.total_bookings_90d ? 'Exceeds total bookings' : undefined
  const numberChange = (field: keyof BookingRequest, value: number) => {
    onEdit()
    setBooking((current) => ({ ...current, [field]: value }))
  }
  const textChange = (field: keyof BookingRequest, value: string) => {
    onEdit()
    setBooking((current) => ({ ...current, [field]: value.toUpperCase().slice(0, 2) }))
  }

  return (
    <>
      <header className="page-heading">
        <div><span className="eyebrow">Live workbench</span><h1>Booking assessment</h1></div>
        <div className="scenario-area">
          <span className={`scenario-state ${scenario === 'Custom' ? 'custom' : ''}`}>{scenario}</span>
          <div className="scenario-switcher" aria-label="Demo scenarios">
            {scenarios.map(({ name, booking: preset }) => (
              <button type="button" className={scenario === name ? 'active' : ''} aria-pressed={scenario === name} onClick={() => onPreset(preset)} key={name}>{name}</button>
            ))}
          </div>
        </div>
      </header>
      <form className="assessment-layout" onSubmit={onSubmit}>
        <div className="input-panel">
          <div className="form-section">
            <div className="section-heading"><h2>Booking context</h2><div className="section-signals"><span className={booking.ip_country === booking.card_country ? 'positive' : 'warning'}>{booking.ip_country === booking.card_country ? 'Countries match' : 'Country mismatch'}</span><span>{booking.hours_until_departure < 2 ? 'Last-minute' : 'Scheduled'}</span></div></div>
            <div className="form-grid">
              <label className="field"><span>Booking ID</span><input value={booking.booking_id} onChange={(event) => { onEdit(); setBooking({ ...booking, booking_id: event.target.value }) }} /></label>
              <label className="field"><span>Agent ID</span><input value={booking.agent_id} onChange={(event) => { onEdit(); setBooking({ ...booking, agent_id: event.target.value }) }} /></label>
              <NumberField label="Seats requested" field="seats_requested" value={booking.seats_requested} onChange={numberChange} min={1} max={250} />
              <NumberField label="Hours to departure" field="hours_until_departure" value={booking.hours_until_departure} onChange={numberChange} step={0.1} max={8760} />
              <label className="field"><span>IP country</span><input maxLength={2} value={booking.ip_country} onChange={(event) => textChange('ip_country', event.target.value)} /></label>
              <label className="field"><span>Card country</span><input maxLength={2} value={booking.card_country} onChange={(event) => textChange('card_country', event.target.value)} /></label>
            </div>
          </div>
          <div className="form-section">
            <div className="section-heading"><h2>Agent history</h2><div className="section-signals"><span className={chargebackError ? 'danger' : ''}>{formatHistoryRate(booking.chargebacks_90d, booking.total_bookings_90d)} chargebacks</span><span className={cancellationError ? 'danger' : ''}>{formatHistoryRate(booking.cancellations_90d, booking.total_bookings_90d)} cancelled</span></div></div>
            <div className="form-grid">
              <NumberField label="Account age (days)" field="account_age_days" value={booking.account_age_days} onChange={numberChange} />
              <NumberField label="Total bookings" field="total_bookings_90d" value={booking.total_bookings_90d} onChange={numberChange} />
              <NumberField label="Chargebacks" field="chargebacks_90d" value={booking.chargebacks_90d} onChange={numberChange} error={chargebackError} />
              <NumberField label="Cancellations" field="cancellations_90d" value={booking.cancellations_90d} onChange={numberChange} error={cancellationError} />
              <NumberField label="Bookings in 24h" field="bookings_24h" value={booking.bookings_24h} onChange={numberChange} />
              <NumberField label="Holds in 24h" field="recent_holds_24h" value={booking.recent_holds_24h} onChange={numberChange} />
              <NumberField label="Late cancellations" field="recent_late_cancellations_90d" value={booking.recent_late_cancellations_90d} onChange={numberChange} />
              <NumberField label="Payment attempts / 10m" field="payment_attempts_10m" value={booking.payment_attempts_10m} onChange={numberChange} />
            </div>
          </div>
          <div className="form-section telemetry-section">
            <div className="section-heading">
              <div><h2>Shop Assistant telemetry</h2><span className="inline-status"><Activity size={13} /> {captureTelemetry ? 'Capture live' : 'Scenario values'}</span></div>
              <ToggleField label="Live capture" checked={captureTelemetry} onChange={(value) => { onEdit(); setCaptureTelemetry(value) }} />
            </div>
            <div className="form-grid telemetry-grid">
              <NumberField label="Completion seconds" field="interaction_duration_seconds" value={booking.interaction_duration_seconds} onChange={numberChange} step={0.1} />
              <NumberField label="Pasted fields" field="fields_pasted" value={booking.fields_pasted} onChange={numberChange} />
              <NumberField label="Pointer events" field="pointer_events" value={booking.pointer_events} onChange={numberChange} />
              <div className="binary-fields">
                <ToggleField label="Linked device" checked={booking.device_linked_to_fraud} onChange={(value) => { onEdit(); setBooking({ ...booking, device_linked_to_fraud: value }) }} />
                <ToggleField label="Blocked token" checked={booking.card_on_blocklist} onChange={(value) => { onEdit(); setBooking({ ...booking, card_on_blocklist: value }) }} />
              </div>
            </div>
          </div>
          {error && <div className="error-banner"><AlertTriangle size={17} />{error}</div>}
          <button className="primary-action" type="submit" disabled={loading || !apiOnline} title={apiOnline ? undefined : 'Start the decision engine before assessing a booking'}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />}
            {apiOnline ? 'Assess booking' : 'Decision engine unavailable'} <ChevronRight size={17} />
          </button>
        </div>
        <ResultPanel key={result?.booking_id ?? 'empty'} result={result} loading={loading} />
      </form>
    </>
  )
}
