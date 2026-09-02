import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { useTokenState } from '../hooks/useRift'
import { WORLD_CRYPTO_TVL, ADMIN_VAULT } from '../config'

export default function WorldLiquidity() {
  const { connection } = useConnection()
  const { state: tokenState } = useTokenState()
  const [adminBalance, setAdminBalance] = useState(0)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    connection.getBalance(ADMIN_VAULT).then((lamports) => {
      setAdminBalance(lamports / 1e9)
    }).catch(() => setAdminBalance(0))
  }, [connection])

  useEffect(() => {
    const totalSupply = tokenState?.totalShares ? Number(tokenState.totalShares) : 0
    const tvl = totalSupply + adminBalance
    const target = (tvl / WORLD_CRYPTO_TVL) * 100
    setPct(target)
  }, [tokenState, adminBalance])

  const displayPct = pct.toFixed(8)

  return (
    <div className="rift-liquidity">
      <div className="rift-liq-label">World liquidity share</div>
      <div className="rift-liq-pct">{displayPct}%</div>
      <div className="rift-liq-sub">
        Rift TVL vs global on-chain liquidity (~$3.5T)
      </div>
      <div className="rift-liq-bar">
        <div className="rift-liq-fill" style={{ width: `${Math.max(pct * 100, 0.3)}%` }} />
      </div>
      <div className="rift-liq-foot">
        <span>Rift TVL: ${(tokenState?.totalShares ? Number(tokenState.totalShares).toLocaleString() : '0')}</span>
        <span>Global: ~$3.5T</span>
      </div>
    </div>
  )
}
