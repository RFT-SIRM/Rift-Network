import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { useRiftPrograms, useCoreState } from '../hooks/useRift'
import { useNotify } from '../utils/notifications'
import { PDAS } from '../config'

export default function Transfer() {
  const wallet = useWallet()
  const programs = useRiftPrograms()
  const { state: coreState } = useCoreState()
  const notify = useNotify()
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [useEdge, setUseEdge] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!programs || !wallet.publicKey) return
    setBusy(true)
    try {
      let toPubkey: PublicKey
    try { toPubkey = new PublicKey(to) } catch { notify('Invalid address', 'error'); setBusy(false); return }
      const fromPda = PDAS.userAccount(wallet.publicKey)
      const toPda = PDAS.userAccount(toPubkey)
      if (useEdge) {
        const edgePda = PDAS.edgeAccount(wallet.publicKey, toPubkey)
        await programs.coreProgram.methods.transferWithEdge(new BN(amount))
          .accounts({ transferCtx: { coreState: PDAS.coreState, fromUser: fromPda, toUser: toPda, fromAuthority: wallet.publicKey, toAuthority: toPubkey }, edgeAccount: edgePda })
          .rpc()
      } else {
        await programs.coreProgram.methods.transfer(new BN(amount))
          .accounts({ transferCtx: { coreState: PDAS.coreState, fromUser: fromPda, toUser: toPda, fromAuthority: wallet.publicKey, toAuthority: toPubkey } })
          .rpc()
      }
      notify('Transfer executed successfully', 'success')
    } catch (e: any) {
      notify('Error: ' + (e.message || e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const valid = to.length >= 32 && to.length <= 44 && amount !== '' && Number(amount) > 0
  const paused = coreState?.paused

  return (
    <div className="rift-card">
      <div className="rift-card-title">P2P transfer</div>
      {paused && <div style={{ padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: 'var(--rift-warning)', fontSize: 12, marginBottom: 12 }}>⚠️ Protocol is paused. Transfers are disabled.</div>}
      <div className="rift-field">
        <label className="rift-field-label">Recipient public key</label>
        <input className="rift-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="GdTffSB1aNxfCeZW3PG2S7c788DnZgduJ68jWak3aJrp" />
        <div className="rift-hint" style={{ color: to.length >= 32 && to.length <= 44 ? 'var(--rift-positive)' : 'var(--rift-text-quaternary)' }}>
          {to.length >= 32 && to.length <= 44 ? 'Format valid. Recipient must be registered in core.' : 'Base58-encoded Solana address (32–44 chars)'}
        </div>
      </div>
      <div className="rift-field">
        <label className="rift-field-label">Amount</label>
        <input className="rift-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000000" />
      </div>
      <div className="rift-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" id="useEdge" checked={useEdge} onChange={(e) => setUseEdge(e.target.checked)} style={{ width: 16, height: 16 }} />
        <label htmlFor="useEdge" style={{ fontSize: 13, color: 'var(--rift-text-secondary)', cursor: 'pointer' }}>Use directed edge weight</label>
      </div>
      <button className="rift-btn primary" style={{ width: '100%', padding: 12 }} onClick={submit} disabled={busy || !valid || paused}>
        {busy ? 'Processing…' : 'Execute transfer'}
      </button>
    </div>
  )
}
