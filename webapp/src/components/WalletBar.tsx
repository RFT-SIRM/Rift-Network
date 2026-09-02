import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { useCoreState } from '../hooks/useRift'

export default function WalletBar() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const { state: coreState } = useCoreState()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!publicKey) { setBalance(null); return }
    connection.getBalance(publicKey).then((lamports) => {
      setBalance(lamports / 1e9)
    })
  }, [publicKey, connection])

  const isGate = connected && coreState && publicKey
    ? coreState.gate.toBase58() === publicKey.toBase58()
    : false

  const addr = publicKey ? publicKey.toBase58().slice(0, 18) + '…' : '—'

  return (
    <div className="rift-wallet">
      <span style={{ fontSize: 18 }}>👛</span>
      <span className="rift-wallet-id">{addr}</span>
      {balance !== null && (
        <span style={{ fontSize: 12, color: 'var(--rift-text-muted)', marginLeft: 'auto' }}>
          {balance.toFixed(4)} SOL
        </span>
      )}
      <span className={`rift-wallet-tag ${connected ? (isGate ? 'gate' : 'user') : 'off'}`}>
        {connected ? (isGate ? 'gate' : 'user') : 'offline'}
      </span>
      <WalletMultiButton style={{
        padding: '6px 14px', borderRadius: 8, border: '1px solid var(--rift-border)',
        background: 'var(--rift-surface-raised)', color: 'var(--rift-text)',
        fontSize: 13, fontWeight: 500, cursor: 'pointer', lineHeight: 'normal',
      }} />
    </div>
  )
}
