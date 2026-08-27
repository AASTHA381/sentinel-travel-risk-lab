import { ChevronRight, FlaskConical, LoaderCircle, Sparkles } from 'lucide-react'
import type { MetricSet, ModelMetadata } from '../types'
import { percent } from '../ui'

function MetricPanel({ title, metrics }: { title: string; metrics: MetricSet }) {
  const values = [['Precision', metrics.precision], ['Recall', metrics.recall], ['PR-AUC', metrics.pr_auc], ['False positive rate', metrics.false_positive_rate]] as const
  return <section className="metric-panel"><div className="section-heading"><h2>{title}</h2><span>Threshold {metrics.threshold}</span></div><div className="metric-values">{values.map(([label, value]) => <div key={label}><span>{label}</span><strong>{percent(value)}</strong><i><em style={{ width: percent(value) }} /></i></div>)}</div><div className="confusion"><span>TN <b>{metrics.confusion_matrix.tn}</b></span><span>FP <b>{metrics.confusion_matrix.fp}</b></span><span>FN <b>{metrics.confusion_matrix.fn}</b></span><span>TP <b>{metrics.confusion_matrix.tp}</b></span></div></section>
}

export function ModelView({ metadata }: { metadata: ModelMetadata | null }) {
  return (
    <>
      <header className="page-heading"><div><span className="eyebrow">Evaluation</span><h1>Model evidence</h1></div><span className="count-badge">{metadata?.row_count.toLocaleString() ?? '—'} rows</span></header>
      <div className="model-notice"><FlaskConical size={19} /><div><strong>Synthetic-data benchmark</strong><span>{metadata?.data_disclosure ?? 'Model metadata is unavailable.'}</span></div></div>
      {metadata ? <>
        <section className="split-band"><div><span>Training</span><strong>{metadata.split_counts.train.toLocaleString()}</strong></div><ChevronRight /><div><span>Validation</span><strong>{metadata.split_counts.validation.toLocaleString()}</strong></div><ChevronRight /><div><span>Untouched test</span><strong>{metadata.split_counts.test.toLocaleString()}</strong></div><p>{metadata.split_strategy}</p></section>
        <div className="metrics-grid"><MetricPanel title="Payment fraud" metrics={metadata.test_metrics.payment_fraud} /><MetricPanel title="Inventory abuse" metrics={metadata.test_metrics.inventory_abuse} /></div>
        <section className="interpretation-band"><Sparkles size={19} /><div><strong>Interpretation</strong><p>The payment model favors precision over recall at the 0.50 threshold. These results validate the software pipeline on generated patterns; they do not establish real-world fraud performance.</p></div></section>
      </> : <div className="page-loading"><LoaderCircle className="spin" />Loading evaluation record</div>}
    </>
  )
}