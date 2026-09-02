import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useRiftPrograms, useIsGate, useCoreState } from '../hooks/useRift'
import { useNotify } from '../utils/notifications'
import { PDAS } from '../config'

function GateCard({ name, desc, children }: { name: string; desc: string; children: any }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rift-gate-card">
      <div className="rift-gate-head" onClick={() => setOpen(!open)}>
        <div><div className="rift-gate-name">{name}</div><div className="rift-gate-desc">{desc}</div></div>
        <span className="rift-gate-chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      <div className={`rift-gate-body ${open ? 'open' : ''}`}><div className="rift-gate-inner">{children}</div></div>
    </div>
  )
}

export default function GateAdmin() {
  const wallet = useWallet()
  const programs = useRiftPrograms()
  const isGate = useIsGate()
  const { state: coreState } = useCoreState()
  const notify = useNotify()
  const [busy, setBusy] = useState(false)

  if (!wallet.connected) return <div className="rift-card" style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 14, color: 'var(--rift-text-secondary)' }}>Connect wallet to access gate operations</div></div>
  if (!isGate) return <div className="rift-card" style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 14, color: 'var(--rift-danger)' }}>⛔ Gate access denied.</div></div>

  async function call(method: string, accounts: any, args?: any[]) {
    if (!programs || !wallet.publicKey) return
    setBusy(true)
    try {
      const tx = args ? (programs.coreProgram.methods as any)[method](...args) : (programs.coreProgram.methods as any)[method]()
      await tx.accounts(accounts).rpc()
      notify(`${method} executed`, 'success')
    } catch (e: any) {
      notify('Error: ' + (e.message || e), 'error')
    } finally { setBusy(false) }
  }

  return (
    <div className="rift-card">
      <div className="rift-card-title">Gate operations</div>
      <GateCard name="Register user" desc="Add a new participant">
        <div className="rift-field"><label className="rift-field-label">User public key</label><input className="rift-input" id="reg-user" placeholder="Pubkey" /></div>
        <button className="rift-btn primary" style={{ width: '100%' }} disabled={busy} onClick={() => {
          const val = (document.getElementById('reg-user') as HTMLInputElement).value
          if (!val) return
          const pk = new PublicKey(val)
          call('register', { coreState: PDAS.coreState, userAccount: PDAS.userAccount(pk), gate: wallet.publicKey, systemProgram: SystemProgram.programId }, [pk])
        }}>Register</button>
      </GateCard>
      <GateCard name="Redistribute" desc="O(1) distribution via global_field">
        <div className="rift-field"><label className="rift-field-label">Amount</label><input className="rift-input" id="redist-amt" type="number" placeholder="900" /></div>
        <button className="rift-btn primary" style={{ width: '100%' }} disabled={busy} onClick={() => {
          const val = (document.getElementById('redist-amt') as HTMLInputElement).value
          if (!val) return
          call('redistribute', { coreState: PDAS.coreState, gate: wallet.publicKey }, [new BN(val)])
        }}>Redistribute</button>
      </GateCard>
      <GateCard name="Pause / Unpause" desc="Emergency circuit breaker">
        <button className="rift-btn primary" style={{ width: '100%' }} disabled={busy} onClick={() => call('setPaused', { coreState: PDAS.coreState, gate: wallet.publicKey }, [!coreState?.paused])}>
          {coreState?.paused ? 'Unpause protocol' : 'Pause protocol'}
        </button>
      </GateCard>
    </div>
  )
}
