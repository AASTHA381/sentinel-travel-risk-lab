import { useEffect, useRef, useState } from 'react'
import { BarChart3, ChevronRight, FlaskConical, LayoutDashboard, Network, Search, ShieldCheck } from 'lucide-react'
import { assessBooking, getAgentNetwork, getHealth, getModelMetadata } from './api'
import { trustedBooking } from './fixtures'
import type { AssessmentResult, BookingRequest, GraphData, ModelMetadata } from './types'
import { AssessmentView } from './views/AssessmentView'
import { CasesView } from './views/CasesView'
import { ModelView } from './views/ModelView'
import { NetworkView } from './views/NetworkView'
import './sentinel.css'

type View = 'assessment' | 'cases' | 'network' | 'model'

const navItems = [
  { id: 'assessment' as const, label: 'Assessment', icon: LayoutDashboard },
  { id: 'cases' as const, label: 'Case queue', icon: Search },
  { id: 'network' as const, label: 'Detective graph', icon: Network },
  { id: 'model' as const, label: 'Model evidence', icon: BarChart3 },
]

function App() {
  const [view, setView] = useState<View>('assessment')
  const [booking, setBooking] = useState<BookingRequest>({ ...trustedBooking })
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [cases, setCases] = useState<AssessmentResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sentinel-cases') ?? '[]') as AssessmentResult[]
    } catch {
      return []
    }
  })
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captureTelemetry, setCaptureTelemetry] = useState(false)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [engineMode, setEngineMode] = useState('checking')
  const formStartedAt = useRef(0)

  useEffect(() => {
    formStartedAt.current = Date.now()
    getHealth().then((health) => {
      setApiStatus(health.status === 'ok' ? 'online' : 'offline')
      setEngineMode(health.engine_mode.replaceAll('_', ' '))
    }).catch(() => {
      setApiStatus('offline')
      setEngineMode('unavailable')
    })
    getModelMetadata().then(setMetadata).catch(() => setMetadata(null))
    getAgentNetwork(trustedBooking.agent_id).then(setGraph).catch(() => setGraph(null))
  }, [])

  useEffect(() => {
    localStorage.setItem('sentinel-cases', JSON.stringify(cases.slice(0, 50)))
  }, [cases])

  const loadPreset = (preset: BookingRequest) => {
    setBooking({ ...preset })
    setResult(null)
    setError(null)
    setCaptureTelemetry(false)
    formStartedAt.current = Date.now()
    getAgentNetwork(preset.agent_id).then(setGraph).catch(() => setGraph(null))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const payload = captureTelemetry
      ? { ...booking, interaction_duration_seconds: Math.max((Date.now() - formStartedAt.current) / 1000, 0.1) }
      : booking
    try {
      const assessment = await assessBooking(payload)
      setResult(assessment)
      setCases((current) => [assessment, ...current.filter((item) => item.booking_id !== assessment.booking_id)])
      getAgentNetwork(booking.agent_id).then(setGraph).catch(() => setGraph(null))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Assessment failed')
    } finally {
      setLoading(false)
    }
  }

  const pointerCapture = () => {
    if (captureTelemetry) setBooking((current) => ({ ...current, pointer_events: current.pointer_events + 1 }))
  }
  const pasteCapture = () => {
    if (captureTelemetry) {
      setError(null)
      setBooking((current) => ({ ...current, fields_pasted: current.fields_pasted + 1 }))
    }
  }
  const openCase = (item: AssessmentResult) => {
    setResult(item)
    setView('assessment')
  }
  const clearCases = () => {
    setCases([])
  }
  const apiOnline = apiStatus === 'online'
  const healthLabel = apiStatus === 'checking' ? 'Checking decision engine' : `Decision engine ${apiStatus}`

  return (
    <div className="app-shell" onPointerDown={pointerCapture} onPaste={pasteCapture}>
      <aside className="sidebar">
        <div className="brand"><span><ShieldCheck size={21} /></span><div><strong>Sentinel</strong><small>Travel risk lab</small></div></div>
        <nav>{navItems.map((item) => <button type="button" aria-label={item.label} title={item.label} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)} key={item.id}><item.icon size={18} /><span>{item.label}</span>{view === item.id && <ChevronRight size={15} />}</button>)}</nav>
        <div className="sidebar-foot"><span className="status-light" /><div><strong>Research mode</strong><small>Synthetic evidence</small></div></div>
      </aside>
      <main>
        <div className="topbar"><div title={`Decision engine: ${engineMode}`}><span className={`api-light ${apiStatus}`} />{healthLabel}</div><span className="research-label"><FlaskConical size={14} />Not for production decisions</span></div>
        <div className="page-content">
          {view === 'assessment' && <AssessmentView booking={booking} setBooking={setBooking} result={result} loading={loading} error={error} captureTelemetry={captureTelemetry} setCaptureTelemetry={setCaptureTelemetry} apiOnline={apiOnline} onEdit={() => setError(null)} onPreset={loadPreset} onSubmit={submit} />}
          {view === 'cases' && <CasesView cases={cases} onOpen={openCase} onClear={clearCases} />}
          {view === 'network' && <NetworkView graph={graph} />}
          {view === 'model' && <ModelView metadata={metadata} />}
        </div>
      </main>
    </div>
  )
}

export default App
