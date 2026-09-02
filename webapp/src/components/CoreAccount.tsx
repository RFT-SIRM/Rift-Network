import { useCoreState, useUserAccount } from '../hooks/useRift'

export default function CoreAccount() {
  const { state: coreState, loading: coreLoading } = useCoreState()
  const { account, loading: userLoading } = useUserAccount() as any

  const fmt = (n: any) => n !== undefined && n !== null ? Number(n).toLocaleString() : '—'

  const base = account ? Number(account.baseBalance) : 0
  const gf = coreState ? Number(coreState.globalField) : 0
  const eff = base + gf
  const supply = coreState ? Number(coreState.totalSupply) : 0
  const p = coreState ? Number(coreState.p) : 1
  const debtLimit = p > 0 ? -Math.floor(supply / (10 * p)) : 0
  const headroom = eff - debtLimit

  return (
    <>
      <div className="rift-card">
        <div className="rift-card-title">My core account</div>
        <div className="rift-grid">
          <div className="rift-metric">
            <div className="rift-metric-label">base_balance</div>
            <div className="rift-metric-value">{fmt(account?.baseBalance)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">effective_balance</div>
            <div className="rift-metric-value">{fmt(eff)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">debt_limit</div>
            <div className="rift-metric-value small">{coreLoading ? '…' : fmt(debtLimit)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">headroom</div>
            <div className="rift-metric-value small" style={{ color: headroom > 0 ? 'var(--rift-positive)' : 'var(--rift-danger)' }}>
              {coreLoading ? '…' : (headroom > 0 ? 'safe' : 'critical')}
            </div>
          </div>
        </div>
      </div>
      <div className="rift-card">
        <div className="rift-card-title">Global field history</div>
        <svg className="rift-spark" viewBox="0 0 300 80" preserveAspectRatio="none">
          <polyline fill="none" stroke="var(--rift-accent)" strokeWidth="2" points="0,70 40,60 80,55 120,45 160,35 200,25 240,15 300,5"/>
          <circle cx="300" cy="5" r="3" fill="var(--rift-accent)"/>
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--rift-text-quaternary)' }}>
          <span>T−6</span><span>T−5</span><span>T−4</span><span>T−3</span><span>T−2</span><span>T−1</span><span>now</span>
        </div>
      </div>
    </>
  )
}
