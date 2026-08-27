import { useState } from 'react'
import { Bot, FlaskConical, GitBranch, LoaderCircle, Network, ShieldX, UserRoundCheck } from 'lucide-react'
import type { GraphData, GraphNode } from '../types'

const nodePositions = [
  { left: '12%', top: '42%' }, { left: '40%', top: '16%' }, { left: '72%', top: '23%' },
  { left: '39%', top: '68%' }, { left: '73%', top: '66%' },
]

export function NetworkView({ graph }: { graph: GraphData | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected: GraphNode | null = graph?.nodes.find((node) => node.id === selectedId) ?? graph?.nodes[0] ?? null
  const selectedEdges = graph?.edges.filter((edge) => edge.source === selected?.id || edge.target === selected?.id) ?? []

  return (
    <>
      <header className="page-heading"><div><span className="eyebrow">Detective</span><h1>Relationship graph</h1></div><span className="provider-badge"><span />{graph?.provider ?? 'Unavailable'}</span></header>
      <section className="network-layout">
        <div className="graph-canvas">
          <div className="graph-grid" />
          <svg viewBox="0 0 800 500" preserveAspectRatio="none" aria-hidden="true"><line x1="130" y1="235" x2="350" y2="115" /><line x1="350" y1="115" x2="610" y2="150" /><line x1="130" y1="235" x2="350" y2="365" /><line x1="610" y1="150" x2="615" y2="355" /></svg>
          {graph?.nodes.map((node, index) => {
            const Icon = node.kind === 'agent' ? UserRoundCheck : node.kind === 'device' ? Bot : node.kind === 'payment' ? ShieldX : Network
            return <button type="button" key={node.id} className={`graph-node node-${node.kind} ${selected?.id === node.id ? 'selected' : ''}`} style={nodePositions[index]} onClick={() => setSelectedId(node.id)}><Icon size={18} /><span>{node.label}</span><small>{node.kind}</small></button>
          })}
          {!graph && <div className="graph-loading"><LoaderCircle className="spin" />Loading graph</div>}
          <div className="synthetic-watermark">SYNTHETIC DEMO GRAPH</div>
        </div>
        <aside className="graph-inspector">
          <span className="eyebrow">Selected entity</span><h2>{selected?.label ?? 'None'}</h2>
          <dl><div><dt>Entity type</dt><dd>{selected?.kind ?? '—'}</dd></div><div><dt>Status</dt><dd>{selected?.status ?? '—'}</dd></div><div><dt>Connections</dt><dd>{selectedEdges.length}</dd></div></dl>
          <div className="relationship-list"><h3>Relationships</h3>{selectedEdges.map((edge) => <div key={`${edge.source}-${edge.target}`}><GitBranch size={15} /><span><strong>{edge.relationship.replace('_', ' ')}</strong>{edge.source === selected?.id ? edge.target : edge.source}</span></div>)}</div>
          <p className="disclosure"><FlaskConical size={15} />{graph?.data_disclosure ?? 'Graph service unavailable.'}</p>
        </aside>
      </section>
    </>
  )
}
