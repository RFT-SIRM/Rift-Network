// ═══════════════════════════════════════════════════════════════════════════════
// Rift Network — Devnet Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import { PublicKey } from '@solana/web3.js'

export const NETWORK = 'devnet'
export const RPC_ENDPOINT = 'https://api.devnet.solana.com'

// Program IDs
export const ULTRA_CORE_RIFT_ID = new PublicKey('CBrsXBaa1DTHFdCwCkeQHm3bQKRFaWfPx6bKNmM5r5uy')
export const RIFT_TOKEN_ID = new PublicKey('GdTffSB1aNxfCeZW3PG2S7c788DnZgduJ68jWak3aJrp')

/** RIFT SPL Mint address */
export const RIFT_MINT = new PublicKey('2vbCLEmr4U9v8weqdQKCuRCJAG3gcJShNkSexNvskfG6')

/** Admin vault pubkey — receives genesis share + SOL fees */
export const ADMIN_VAULT = new PublicKey('85NEnWh2CEHNVzvcq8VhLUMKQNszRVfXsANsgTRq79LL')

// ═══════════════════════════════════════════════════════════════════════════════
// PDAs — derived deterministically, no need to change
// ═══════════════════════════════════════════════════════════════════════════════

export const PDAS = {
  coreState: PublicKey.findProgramAddressSync(
    [Buffer.from('core_state')], ULTRA_CORE_RIFT_ID
  )[0],

  riftTokenState: PublicKey.findProgramAddressSync(
    [Buffer.from('rift_token_state')], RIFT_TOKEN_ID
  )[0],

  riftAuthority: PublicKey.findProgramAddressSync(
    [Buffer.from('rift_mint_authority')], RIFT_TOKEN_ID
  )[0],

  userAccount: (authority: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from('user'), authority.toBuffer()], ULTRA_CORE_RIFT_ID
    )[0],

  edgeAccount: (from: PublicKey, to: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from('edge'), from.toBuffer(), to.toBuffer()], ULTRA_CORE_RIFT_ID
    )[0],
}

export const WORLD_CRYPTO_TVL = 3_500_000_000_000
