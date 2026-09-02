import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { useMemo, useState, useEffect } from 'react'
import { PDAS } from '../config'
import ultraCoreIdl from '../idl/ultra_core_rift.json'
import riftTokenIdl from '../idl/rift_token.json'

export function useRiftPrograms() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  return useMemo(() => {
    if (!wallet) return null
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    })
    const coreProgram = new Program(ultraCoreIdl as any, provider) as any
    const tokenProgram = new Program(riftTokenIdl as any, provider) as any
    return { coreProgram, tokenProgram, provider, wallet, connection }
  }, [connection, wallet])
}

export function useCoreState() {
  const programs = useRiftPrograms()
  const [state, setState] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    if (!programs) return
    setLoading(true)
    try {
      const s = await programs.coreProgram.account.coreState.fetch(PDAS.coreState)
      setState(s)
    } catch {
      setState(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [programs])
  useEffect(() => {
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [programs])

  return { state, loading, refresh }
}

export function useTokenState() {
  const programs = useRiftPrograms()
  const [state, setState] = useState<any>(null)

  const refresh = async () => {
    if (!programs) return
    try {
      const s = await programs.tokenProgram.account.riftTokenState.fetch(PDAS.riftTokenState)
      setState(s)
    } catch {
      setState(null)
    }
  }

  useEffect(() => { refresh() }, [programs])

  return { state, refresh }
}

export function useUserAccount() {
  const programs = useRiftPrograms()
  const [account, setAccount] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    if (!programs?.wallet) { setAccount(null); return }
    setLoading(true)
    try {
      const pda = PDAS.userAccount(programs.wallet.publicKey)
      const a = await programs.coreProgram.account.userAccount.fetch(pda)
      setAccount(a)
    } catch {
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [programs])

  return { account, loading, refresh }
}

export function useIsGate() {
  const { state: coreState } = useCoreState()
  const programs = useRiftPrograms()
  return useMemo(() => {
    if (!coreState || !programs?.wallet) return false
    return coreState.gate.toBase58() === programs.wallet.publicKey.toBase58()
  }, [coreState, programs])
}
