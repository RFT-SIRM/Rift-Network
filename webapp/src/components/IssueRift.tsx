import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { BN } from '@coral-xyz/anchor'
import { SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from '@solana/spl-token'
import { useRiftPrograms, useCoreState, useTokenState } from '../hooks/useRift'
import { useNotify } from '../utils/notifications'
import { PDAS, RIFT_MINT, ADMIN_VAULT } from '../config'

export default function IssueRift() {
  const wallet = useWallet()
  const programs = useRiftPrograms()
  const { state: coreState } = useCoreState()
  const { state: tokenState } = useTokenState()
  const notify = useNotify()
  const [amount, setAmount] = useState('1000000000')
  const [busy, setBusy] = useState(false)

  const val = BigInt(amount || '0')
  const fee = (val * BigInt(tokenState?.feeBps || 10)) / 10000n
  const after = val - fee
  const fp = BigInt(Math.max(Math.floor(Math.abs(Number(coreState?.globalField || 1500000))), 1000000))
  const mult = 1000000000000000n / fp
  const shares = (after * mult) / 1000000000000n

  async function submit() {
    if (!programs || !wallet.publicKey) return
    setBusy(true)
    try {
      const userATA = getAssociatedTokenAddressSync(RIFT_MINT, wallet.publicKey)
      const ataInfo = await programs.connection.getAccountInfo(userATA)
      const preInstructions = []
      if (!ataInfo) {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(wallet.publicKey, userATA, wallet.publicKey, RIFT_MINT)
        )
      }
      await programs.tokenProgram.methods
        .issueRift(new BN(amount))
        .accounts({
          riftTokenState: PDAS.riftTokenState,
          coreState: PDAS.coreState,
          riftMint: RIFT_MINT,
          userTokenAccount: userATA,
          riftAuthority: PDAS.riftAuthority,
          user: wallet.publicKey,
          adminVault: ADMIN_VAULT,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(preInstructions)
        .rpc()
      notify(`Issued ${Number(shares).toLocaleString()} RIFT shares`, 'success')
    } catch (e: any) {
      notify('Error: ' + (e.message || e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rift-card">
      <div className="rift-card-title">Mint RIFT with SOL</div>
      <div className="rift-field">
        <label className="rift-field-label">Base amount (lamports)</label>
        <input className="rift-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="rift-hint">1 000 000 000 lamports = 1 SOL. Soft launch cap: {tokenState?.softLaunchLimit ? (Number(tokenState.softLaunchLimit) / 1e9).toFixed(1) : '5'} SOL.</div>
      </div>

      <div className="rift-formula">
        <span className="f-box">{Number(after).toLocaleString()}</span>
        <span className="f-op">×</span>
        <span className="f-box">{Number(mult).toLocaleString()}</span>
        <span className="f-op">÷ 10¹²</span>
        <span className="f-op">=</span>
        <span className="f-res">{Number(shares).toLocaleString()}</span>
      </div>

      <div className="rift-calc">
        <div className="rift-calc-row"><span className="rift-calc-label">Field pressure</span><span className="rift-calc-val">{Number(fp).toLocaleString()}</span></div>
        <div className="rift-calc-row"><span className="rift-calc-label">Protocol fee ({(tokenState?.feeBps || 10) / 100}%)</span><span className="rift-calc-val">{Number(fee).toLocaleString()}</span></div>
        <div className="rift-calc-row"><span className="rift-calc-label">Amount after fee</span><span className="rift-calc-val">{Number(after).toLocaleString()}</span></div>
        <div className="rift-calc-row total"><span className="rift-calc-label">Shares to mint</span><span className="rift-calc-val">{Number(shares).toLocaleString()}</span></div>
      </div>

      <button className="rift-btn primary" style={{ width: '100%', padding: 12 }} onClick={submit} disabled={busy || !wallet.connected}>
        {busy ? 'Processing…' : 'Issue RIFT'}
      </button>
    </div>
  )
}
