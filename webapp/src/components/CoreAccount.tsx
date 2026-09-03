import { useCoreState, useUserAccount } from '../hooks/useRift'
import Tooltip from './Tooltip'

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
        <div className="rift-card-title">My Core Account</div>
        <div className="rift-grid">
          <div className="rift-metric">
            <div className="rift-metric-label">
              BASE BALANCE
              <Tooltip text="Your personal base balance before field redistribution is applied.">
                <span className="info-icon">ⓘ</span>
              </Tooltip>
            </div>
            <div className="rift-metric-value">{fmt(account?.baseBalance)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">
              EFFECTIVE BALANCE
              <Tooltip text="Your actual spendable balance: base + global_field.">
                <span className="info-icon">ⓘ</span>
              </Tooltip>
            </div>
            <div className="rift-metric-value cyan">{fmt(eff)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">
              DEBT LIMIT
              <Tooltip text="Maximum negative balance allowed by I4 invariant.">
                <span className="info-icon">ⓘ</span>
              </Tooltip>
            </div>
            <div className="rift-metric-value small">{coreLoading ? '…' : fmt(debtLimit)}</div>
          </div>
          <div className="rift-metric">
            <div className="rift-metric-label">
              HEADROOM
              <Tooltip text="Distance to debt limit. Critical if negative.">
                <span className="info-icon">ⓘ</span>
              </Tooltip>
            </div>
            <div className="rift-metric-value small" style={{ color: headroom > 0 ? 'var(--rift-green)' : 'var(--rift-danger)' }}>
              {coreLoading ? '…' : (headroom > 0 ? 'SAFE' : 'CRITICAL')}
            </div>
          </div>
        </div>
      </div>
      <div className="rift-card">
        <div className="rift-card-title">Global Field History</div>
        <svg className="rift-spark" viewBox="0 0 300 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--rift-cyan)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--rift-cyan)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon fill="url(#sparkGrad)" points="0,80 0,70 40,60 80,55 120,45 160,35 200,25 240,15 300,5 300,80" />
          <polyline fill="none" stroke="var(--rift-cyan)" strokeWidth="2" points="0,70 40,60 80,55 120,45 160,35 200,25 240,15 300,5" />
          <circle cx="300" cy="5" r="3" fill="var(--rift-cyan)" filter="drop-shadow(0 0 4px var(--rift-cyan-glow))" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--rift-text-quaternary)', fontFamily: 'monospace' }}>
          <span>T-6</span><span>T-5</span><span>T-4</span><span>T-3</span><span>T-2</span><span>T-1</span><span>now</span>
        </div>
      </div>
    </>
  )
}
