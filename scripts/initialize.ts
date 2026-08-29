import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";
import os from "os";

const idPath = path.join(os.homedir(), ".config", "solana", "id.json");
const secretKey = JSON.parse(fs.readFileSync(idPath, "utf-8"));
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const provider = new AnchorProvider(connection, new anchor.Wallet(wallet), {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const ULTRA_CORE_RIFT_ID = new PublicKey("45oaP6nFPqCNcd6zcTXHLFNYdujNDHyKiNdDQQ4H4arM");
const RIFT_TOKEN_ID = new PublicKey("6zXnKoRT9B46JAVVBktCkgGWRJhcPsfyMX9NwR67q64x");

const ultraCoreIdlRaw = JSON.parse(fs.readFileSync("target/idl/ultra_core_rift.json", "utf-8"));
ultraCoreIdlRaw.address = ULTRA_CORE_RIFT_ID.toBase58();
const riftTokenIdlRaw = JSON.parse(fs.readFileSync("target/idl/rift_token.json", "utf-8"));
riftTokenIdlRaw.address = RIFT_TOKEN_ID.toBase58();

const ultraCoreProgram = new Program(ultraCoreIdlRaw as any, provider);
const riftTokenProgram = new Program(riftTokenIdlRaw as any, provider);

async function main() {
  console.log("Wallet:", wallet.publicKey.toBase58());

  console.log("\n=== 1. Initializing ultra_core_rift ===");
  const coreState = Keypair.generate();
  console.log("CoreState address:", coreState.publicKey.toBase58());
  
  await (ultraCoreProgram.methods as any)
    .initialize(wallet.publicKey)
    .accounts({
      coreState: coreState.publicKey,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([coreState])
    .rpc();
  console.log("✅ CoreState initialized");

  const [riftTokenState] = PublicKey.findProgramAddressSync(
    [Buffer.from("rift_token_state")],
    RIFT_TOKEN_ID
  );
  const [riftAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("rift_mint_authority")],
    RIFT_TOKEN_ID
  );
  console.log("RiftTokenState PDA:", riftTokenState.toBase58());
  console.log("RiftAuthority PDA:", riftAuthority.toBase58());

  console.log("\n=== 2. Creating RIFT Mint ===");
  const mintKeypair = Keypair.generate();
  console.log("Mint address:", mintKeypair.publicKey.toBase58());
  
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  const createMintTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      9,
      riftAuthority,
      null,
      TOKEN_PROGRAM_ID
    )
  );
  await provider.sendAndConfirm(createMintTx, [mintKeypair]);
  console.log("✅ Mint created");

  console.log("\n=== 3. Creating Admin Vault Token Account ===");
  const adminVaultATA = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    wallet.publicKey
  );
  console.log("Admin Vault ATA:", adminVaultATA.toBase58());
  
  const createAtaTx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      adminVaultATA,
      wallet.publicKey,
      mintKeypair.publicKey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );
  await provider.sendAndConfirm(createAtaTx);
  console.log("✅ Admin Vault ATA created");

  console.log("\n=== 4. Initializing rift_token ===");
  await (riftTokenProgram.methods as any)
    .initialize(9, 10, new BN("1000000000000"))
    .accounts({
      riftTokenState: riftTokenState,
      coreState: coreState.publicKey,
      riftMint: mintKeypair.publicKey,
      adminVaultTokenAccount: adminVaultATA,
      adminVault: wallet.publicKey,
      riftAuthority: riftAuthority,
      gate: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("✅ RiftToken initialized");

  console.log("\n🎉 DONE! Save these addresses:");
  console.log("CoreState:", coreState.publicKey.toBase58());
  console.log("RiftTokenState:", riftTokenState.toBase58());
  console.log("RiftMint:", mintKeypair.publicKey.toBase58());
  console.log("AdminVaultATA:", adminVaultATA.toBase58());
}

main().catch(console.error);
