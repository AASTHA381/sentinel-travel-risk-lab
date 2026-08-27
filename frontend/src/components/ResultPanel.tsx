import { useState } from 'react'
import { CircleDot, GitBranch, LoaderCircle, Sparkles } from 'lucide-react'
import { generateAnalystBrief } from '../api'
import type { AnalystBrief, AssessmentResult, ComponentScore } from '../types'
import { decisionCopy, percent } from '../ui'

function ScoreRow({ label, component }: { label: string; component: ComponentScore }) {
  return (
    <div className="score-row">
      <div className="score-label"><span>{label}</span><strong>{percent(component.score)}</strong></div>
      <div className="score-track" aria-label={`${label}: ${percent(component.score)}`}>
        <span style={{ width: percent(component.score) }} />
      </div>
    </div>
  )
}

export function ResultPanel({ result, loading }: { result: AssessmentResult | null; loading: boolean }) {
  const [brief, setBrief] = useState<AnalystBrief | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  if (loading) {
    return <aside className="result-panel empty-result"><LoaderCircle className="spin" size={28} /><strong>Assessing booking</strong></aside>
  }
  if (!result) {
    return <aside className="result-panel empty-result"><CircleDot size={28} /><strong>No assessment yet</strong><span>Submit a booking or load a scenario.</span></aside>
  }

  const decision = decisionCopy[result.decision]
  const DecisionIcon = decision.icon
  const reasons = [
    ...result.payment_fraud.reasons.map((reason) => ({ ...reason, component: 'payment' })),
    ...result.inventory_abuse.reasons.map((reason) => ({ ...reason, component: 'inventory' })),
    ...result.bot_likelihood.reasons.map((reason) => ({ ...reason, component: 'telemetry' })),
  ].sort((a, b) => b.contribution - a.contribution).slice(0, 6)

  const createBrief = async () => {
    setBriefLoading(true)
    try {
      setBrief(await generateAnalystBrief(result))
    } finally {
      setBriefLoading(false)
    }
  }

  return (
    <aside className={`result-panel decision-${result.decision}`}>
      <div className="decision-heading">
        <span className="decision-icon"><DecisionIcon size={24} /></span>
        <div><span className="eyebrow">Policy recommendation</span><h2>{decision.label}</h2></div>
        <strong className="overall-score">{percent(result.overall_score)}</strong>
      </div>
      <p className="summary">{result.summary}</p>
      <div className="briefing-block">
        {brief ? <><div className="brief-provider"><Sparkles size={14} />{brief.provider.replaceAll('_', ' ')}</div><p>{brief.text}</p><small>{brief.data_disclosure}</small></> : <button type="button" onClick={createBrief} disabled={briefLoading}>{briefLoading ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}Generate analyst brief</button>}
      </div>
      <div className="score-list">
        <ScoreRow label="Payment fraud" component={result.payment_fraud} />
        <ScoreRow label="Inventory abuse" component={result.inventory_abuse} />
        <ScoreRow label="Bot likelihood" component={result.bot_likelihood} />
      </div>
      <div className="evidence-list">
        <div className="section-heading"><h3>Evidence</h3><span>{reasons.length} signals</span></div>
        {reasons.map((reason) => (
          <div className="evidence-row" key={`${reason.component}-${reason.source}-${reason.code}`}>
            <span className={`source-dot source-${reason.source}`} />
            <div><strong>{reason.label}</strong><span>{reason.source.replace('_', ' ')}</span></div>
            <b>{percent(reason.contribution)}</b>
          </div>
        ))}
      </div>
      <div className="engine-note"><GitBranch size={15} /><span>{result.engine_mode.replaceAll('_', ' ')} · {result.policy_version}</span></div>
    </aside>
  )
}
