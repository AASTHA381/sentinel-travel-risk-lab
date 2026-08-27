import type { BookingRequest } from '../types'

export function NumberField({
  label,
  field,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  error,
}: {
  label: string
  field: keyof BookingRequest
  value: number
  onChange: (field: keyof BookingRequest, value: number) => void
  step?: number
  min?: number
  max?: number
  error?: string
}) {
  return (
    <label className={`field ${error ? 'field-invalid' : ''}`}>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(field, Number(event.target.value))}
      />
      {error && <small>{error}</small>}
    </label>
  )
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle" aria-hidden="true" />
    </label>
  )
}
