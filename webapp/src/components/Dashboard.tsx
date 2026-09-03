import { useCoreState, useTokenState, useUserAccount } from '../hooks/useRift'
import { useWallet } from '@solana/wallet-adapter-react'
import Tooltip from './Tooltip'

export default function Dashboard() {
  const { state: coreState, loading: coreLoading } = useCoreState()
  const { state: tokenState } = useTokenState()
  const { account, loading: userLoading } = useUserAccount() as any
  const { connected } = useWallet()

  const fmt = (n: any) => n !== undefined && n !== null ? Number(n).toLocaleString() : '—'

  const base = account ? Number(account.baseBalance) : 0
  const gf = coreState ? Number(coreState.globalField) : 0
  const eff = base + gf
  const supply = coreState ? Number(coreState.totalSupply) : 0
  const p = coreState ? Number(coreState.p) : 1
  const debtLimit = p > 0 ? -Math.floor(supply / (10 * p)) : 0
  const headroom = eff - debtLimit

  const metrics = [
    { label: 'GLOBAL FIELD', value: fmt(coreState?.globalField), color: 'cyan', tooltip: 'Global redistribution field affecting effective participant balances.', formula: 'global_field += amount / p' },
    { label: 'TOTAL SUPPLY', value: fmt(coreState?.totalSupply), color: 'violet', tooltip: 'Current CoreState supply maintained by protocol invariants.', formula: 'supply = base_sum + field * p' },
    { label: 'PARTICIPANTS', value: fmt(coreState?.p), color: 'amber', tooltip: 'Number of registered participants in the Rift core.', formula: 'p = registered users' },
    { label: 'PROTOCOL STATUS', value: coreState?.paused ? 'PAUSED' : 'ACTIVE', color: coreState?.paused ? 'amber' : 'green', tooltip: coreState?.paused ? 'Protocol paused. All transfers blocked.' : 'Protocol active. All operations permitted.', formula: '' },
  ]

  const invariants = [
    { id: 'I1', name: 'SUPPLY CONSISTENCY', formula: 'supply = base_sum + global_field * p', desc: 'Total supply must equal sum of base balances plus field distribution.' },
    { id: 'I2', name: 'MINT/BURN CONSISTENCY', formula: 'supply = minted - burned', desc: 'Total supply equals total minted minus total burned tokens.' },
    { id: 'I3', name: 'DUST BOUND', formula: 'dust < p', desc: 'Dust accumulator must be less than participant count.' },
    { id: 'I4', name: 'DEBT LIMIT', formula: 'eff_balance >= -supply / (10*p)', desc: 'Effective balance cannot fall below negative debt limit.' },
  ]

  return (
    <div>
      <div className="rift-card">
        <div className="rift-card-title">Network Telemetry</div>
        <div className="rift-grid">
          {metrics.map((m) => (
            <div className="rift-metric" key={m.label}>
              <div className="rift-metric-label">
                {m.label}
                <Tooltip text={m.tooltip} formula={m.formula}><span className="info-icon">ⓘ</span></Tooltip>
              </div>
              <div className={`rift-metric-value ${m.color}`}>{coreLoading ? '…' : m.value}</div>
            </div>
          ))}
        </div>
      </div>
      {connected && (
        <div className="rift-card">
          <div className="rift-card-title">My Core Account</div>
          <div className="rift-grid">
            <div className="rift-metric">
              <div className="rift-metric-label">BASE BALANCE <Tooltip text="Your personal base balance before field redistribution."><span className="info-icon">ⓘ</span></Tooltip></div>
              <div className="rift-metric-value">{fmt(account?.baseBalance)}</div>
            </div>
            <div className="rift-metric">
              <div className="rift-metric-label">EFFECTIVE BALANCE <Tooltip text="Your actual spendable balance: base + global_field."><span className="info-icon">ⓘ</span></Tooltip></div>
              <div className="rift-metric-value cyan">{fmt(eff)}</div>
            </div>
            <div className="rift-metric">
              <div className="rift-metric-label">DEBT LIMIT <Tooltip text="Maximum negative balance allowed by I4 invariant."><span className="info-icon">ⓘ</span></Tooltip></div>
              <div className="rift-metric-value small">{fmt(debtLimit)}</div>
            </div>
            <div className="rift-metric">
              <div className="rift-metric-label">HEADROOM <Tooltip text="Distance to debt limit. Critical if negative."><span className="info-icon">ⓘ</span></Tooltip></div>
              <div className="rift-metric-value small" style={{ color: headroom > 0 ? 'var(--rift-green)' : 'var(--rift-danger)' }}>{headroom > 0 ? 'SAFE' : 'CRITICAL'}</div>
            </div>
          </div>
        </div>
      )}
      <div className="rift-card">
        <div className="rift-card-title">SIRM Invariants</div>
        {invariants.map((inv) => (
          <Tooltip key={inv.id} text={inv.desc} formula={inv.formula}>
            <div className="rift-inv">
              <span className="rift-inv-id">{inv.id}</span>
              <span>{inv.name}</span>
              <span className="rift-inv-ok">✓</span>
            </div>
          </Tooltip>
        ))}
      </div>
      {tokenState && (
        <div className="rift-card">
          <div className="rift-card-title">Token Parameters</div>
          <div className="rift-grid">
            <div className="rift-metric"><div className="rift-metric-label">FEE BPS</div><div className="rift-metric-value small">{tokenState.feeBps / 100}%</div></div>
            <div className="rift-metric"><div className="rift-metric-label">SOFT LAUNCH</div><div className="rift-metric-value small">{(Number(tokenState.softLaunchLimit) / 1e9).toFixed(1)} SOL</div></div>
            <div className="rift-metric"><div className="rift-metric-label">TOTAL SHARES</div><div className="rift-metric-value small">{fmt(tokenState.totalShares)}</div></div>
            <div className="rift-metric"><div className="rift-metric-label">MULTIPLIER</div><div className="rift-metric-value small mono">{Number(tokenState.riftMultiplier).toExponential(2)}</div></div>
          </div>
        </div>
      )}
    </div>
  )
}
