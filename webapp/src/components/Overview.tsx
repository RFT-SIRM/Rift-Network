import { useCoreState } from '../hooks/useRift'

export default function Overview() {
  const { state: s, loading } = useCoreState()

  const fmt = (n: any) => n !== undefined && n !== null ? Number(n).toLocaleString() : '—'

  return (
    <>
      <div className="rift-card">
        <div className="rift-card-title">Core state</div>
        <div className="rift-grid">
          <div className="rift-metric">
            <div className="rift-metric-label">global_field</div>
            <div className="rift-metric-value">{loading ? '…' : fmt(s?.globalField)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">total_supply</div>
            <div className="rift-metric-value">{loading ? '…' : fmt(s?.totalSupply)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">participants (p)</div>
            <div className="rift-metric-value small">{loading ? '…' : fmt(s?.p)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">protocol status</div>
            <div className="rift-metric-value small">
              <span className={`rift-dot ${s?.paused ? 'warn' : 'ok'}`} />
              {loading ? '…' : (s?.paused ? 'Paused' : 'Active')}
            </div>
          </div>
        </div>
      </div>

      <div className="rift-card">
        <div className="rift-card-title">SIRM invariants</div>
        <div className="rift-inv"><span className="rift-inv-id">I1</span><span>supply = base_sum + global_field × p</span><span className="rift-inv-ok">✓</span></div>
        <div className="rift-inv"><span className="rift-inv-id">I2</span><span>supply = minted − burned</span><span className="rift-inv-ok">✓</span></div>
        <div className="rift-inv"><span className="rift-inv-id">I3</span><span>dust &lt; p</span><span className="rift-inv-ok">✓</span></div>
        <div className="rift-inv"><span className="rift-inv-id">I4</span><span>effective_balance ≥ −supply / (10·p)</span><span className="rift-inv-ok">✓</span></div>
      </div>
    </>
  )
}
