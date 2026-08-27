import { useDeferredValue, useState } from 'react'
import { ChevronRight, Download, Search, Trash2, UserRoundCheck } from 'lucide-react'
import type { AssessmentResult } from '../types'
import { decisionCopy, percent } from '../ui'

export function CasesView({ cases, onOpen, onClear }: { cases: AssessmentResult[]; onOpen: (item: AssessmentResult) => void; onClear: () => void }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const filteredCases = cases.filter((item) =>
    [item.booking_id, item.decision, item.engine_mode].some((value) => value.toLowerCase().includes(deferredQuery)),
  )
  const exportCases = () => {
    const blob = new Blob([JSON.stringify(cases, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sentinel-cases.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <header className="page-heading"><div><span className="eyebrow">Human-in-the-loop</span><h1>Case queue</h1></div><div className="queue-actions"><button type="button" onClick={exportCases} disabled={!cases.length}><Download size={15} />Export</button><button type="button" onClick={onClear} disabled={!cases.length}><Trash2 size={15} />Clear</button><span className="count-badge">{cases.length} local cases</span></div></header>
      <section className="table-panel">
        <div className="table-toolbar"><div className="search-box"><Search size={16} /><input aria-label="Search cases" placeholder="Search booking or decision" value={query} onChange={(event) => setQuery(event.target.value)} /></div><span className="filtered-count">{filteredCases.length} shown</span></div>
        <div className="case-table" role="table">
          <div className="case-row case-header" role="row"><span>Booking</span><span>Decision</span><span>Risk</span><span>Engine</span><span>Action</span></div>
          {filteredCases.length === 0 ? (
            <div className="table-empty"><UserRoundCheck size={28} /><strong>{cases.length ? 'No matching cases' : 'Queue is empty'}</strong><span>{cases.length ? 'Change the search text to see other cases.' : 'Assessed bookings appear here during this session.'}</span></div>
          ) : filteredCases.map((item) => (
            <div className="case-row" role="row" key={`${item.booking_id}-${item.policy_version}`}>
              <span><strong>{item.booking_id}</strong><small>{item.policy_version}</small></span>
              <span><b className={`decision-pill decision-${item.decision}`}>{decisionCopy[item.decision].label}</b></span>
              <span className="risk-cell"><i><em style={{ width: percent(item.overall_score) }} /></i>{percent(item.overall_score)}</span>
              <span className="engine-cell">{item.engine_mode.replaceAll('_', ' ')}</span>
              <span><button type="button" className="text-button" onClick={() => onOpen(item)}>Open <ChevronRight size={15} /></button></span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
