import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { useCoreState } from '../hooks/useRift'

export default function WalletBar() {
  const { publicKey, connected, wallet, connecting } = useWallet()
  const { connection } = useConnection()
  const { state: coreState } = useCoreState()
  const [balance, setBalance] = useState<number | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicKey) { setBalance(null); return }
    connection.getBalance(publicKey).then((lamports) => {
      setBalance(lamports / 1e9)
      setWalletError(null)
    }).catch(() => setBalance(null))
  }, [publicKey, connection])

  useEffect(() => {
    if (!connected && !connecting && wallet) {
      setWalletError('Wallet detected but not connected. Unlock and try again.')
    } else {
      setWalletError(null)
    }
  }, [connected, connecting, wallet])

  const isGate = connected && coreState && publicKey
    ? coreState.gate.toBase58() === publicKey.toBase58()
    : false

  const addr = publicKey ? publicKey.toBase58().slice(0, 14) + '…' + publicKey.toBase58().slice(-4) : '—'

  return (
    <div>
      <div className="rift-wallet">
        <span className="wallet-icon">◈</span>
        <span className="rift-wallet-id">{addr}</span>
        {balance !== null && <span className="rift-wallet-balance">{balance.toFixed(4)} SOL</span>}
        <span className={`rift-wallet-tag ${connected ? (isGate ? 'gate' : 'user') : 'off'}`}>
          {connected ? (isGate ? 'GATE' : 'USER') : 'OFFLINE'}
        </span>
        <WalletMultiButton style={{
          padding: '6px 14px', borderRadius: 8, border: '1px solid var(--rift-border)',
          background: 'var(--rift-surface-raised)', color: 'var(--rift-text)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: 'normal',
          fontFamily: "'SF Mono', monospace", letterSpacing: '0.05em', textTransform: 'uppercase',
        }} />
      </div>
      {walletError && <div className="wallet-error">⚠ {walletError}</div>}
      {!connected && !walletError && (
        <div style={{ fontSize: 11, color: 'var(--rift-text-muted)', padding: '8px 12px', textAlign: 'center' }}>
          Connect wallet to interact with Rift Network on <strong>DEVNET</strong>
        </div>
      )}
    </div>
  )
}
