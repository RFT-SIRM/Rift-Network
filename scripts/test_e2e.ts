import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import os from "os";

const idPath = path.join(os.homedir(), ".config", "solana", "id.json");
const secretKey = JSON.parse(fs.readFileSync(idPath, "utf-8"));
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

const connection = new Connection("http://localhost:8899", "confirmed");
const provider = new AnchorProvider(connection, new anchor.Wallet(wallet), {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const ULTRA_CORE_RIFT_ID = new PublicKey("ApQFryfGR7pWdThYVNqTJh8YX2c7ca8M1voeJsizJohR");
const RIFT_TOKEN_ID = new PublicKey("58NUZF9VQhGRP9vdrLz3tLGDy7qHB5XGoCrEQr9un4N6");

// !!! Update these to match your latest scripts/initialize.ts run output !!!
const CORE_STATE = new PublicKey("ajJ1cfNEcvGoa6CP2Q297qW1BDgRVjkCycyhCbKbHrj");
const RIFT_TOKEN_STATE = new PublicKey("H5ZgJ4QGGcFYGikXJECuPP48BhfZDqU8weLwUaCBrNeM");
const RIFT_MINT = new PublicKey("Ak39aCRzqcoPb1Wf28Bfqpht8kFQ9Z1QaKgETgtQ5rdc");
const [RIFT_AUTHORITY] = PublicKey.findProgramAddressSync(
  [Buffer.from("rift_mint_authority")],
  RIFT_TOKEN_ID
);

const ultraCoreIdl = JSON.parse(fs.readFileSync("target/idl/ultra_core_rift.json", "utf-8"));
ultraCoreIdl.address = ULTRA_CORE_RIFT_ID.toBase58();
const riftTokenIdl = JSON.parse(fs.readFileSync("target/idl/rift_token.json", "utf-8"));
riftTokenIdl.address = RIFT_TOKEN_ID.toBase58();

const core = new Program(ultraCoreIdl as any, provider);
const token = new Program(riftTokenIdl as any, provider);

function userPda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user"), authority.toBuffer()],
    ULTRA_CORE_RIFT_ID
  )[0];
}

async function printCoreState(label: string) {
  const s: any = await (core.account as any).coreState.fetch(CORE_STATE);
  console.log(`\n--- CoreState (${label}) ---`);
  console.log("gate:", s.gate.toBase58());
  console.log("paused:", s.paused);
  console.log("global_field:", s.globalField.toString());
  console.log("total_base_sum:", s.totalBaseSum.toString());
  console.log("total_supply:", s.totalSupply.toString());
  console.log("total_minted:", s.totalMinted.toString());
  console.log("total_burned:", s.totalBurned.toString());
  console.log("p:", s.p.toString());
  console.log("dust_accumulator:", s.dustAccumulator.toString());
  return s;
}

async function printUser(label: string, authority: PublicKey, globalField: BN) {
  const pda = userPda(authority);
  const u: any = await (core.account as any).userAccount.fetch(pda);
  const effective = new BN(u.baseBalance.toString()).add(globalField);
  console.log(
    `${label}: base_balance=${u.baseBalance.toString()} effective=${effective.toString()}`
  );
}

async function main() {
  console.log("Wallet (gate):", wallet.publicKey.toBase58());

  // === 1. Register 3 test users ===
  const users = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
  console.log("\n=== 1. Registering 3 users ===");
  for (const [i, u] of users.entries()) {
    const pda = userPda(u.publicKey);
    await (core.methods as any)
      .register(u.publicKey)
      .accounts({
        coreState: CORE_STATE,
        userAccount: pda,
        gate: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`✅ User ${i} registered: ${u.publicKey.toBase58()} (PDA: ${pda.toBase58()})`);
  }

  let state = await printCoreState("after register x3");

  // === 2. issue_rift: mint RIFT tokens to user 0's token account ===
  console.log("\n=== 2. issue_rift (user 0 pays SOL, mints RIFT) ===");
  // Fund user 0 with SOL to pay the issue_rift SOL fee + rent
  await provider.connection.requestAirdrop(users[0].publicKey, 2_000_000_000);
  await new Promise((r) => setTimeout(r, 1000));

  const userAta = getAssociatedTokenAddressSync(RIFT_MINT, users[0].publicKey);
  const createAtaTx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      userAta,
      users[0].publicKey,
      RIFT_MINT
    )
  );
  await provider.sendAndConfirm(createAtaTx);

  const beforeIssue = await printCoreState("before issue_rift");

  await (token.methods as any)
    .issueRift(new BN(1_000_000_000)) // 1 SOL worth of base_amount
    .accounts({
      riftTokenState: RIFT_TOKEN_STATE,
      coreState: CORE_STATE,
      riftMint: RIFT_MINT,
      userTokenAccount: userAta,
      riftAuthority: RIFT_AUTHORITY,
      user: users[0].publicKey,
      adminVault: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([users[0]])
    .rpc();
  console.log("✅ issue_rift executed");

  const afterIssue = await printCoreState("after issue_rift");
  console.log(
    "global_field changed?",
    !beforeIssue.globalField.eq(afterIssue.globalField),
    "(issue_rift should NOT touch global_field, only mints SPL tokens)"
  );

  // === 3. redistribute: gate distributes 900 units among 3 participants ===
  console.log("\n=== 3. redistribute (O(1) distribution to all participants) ===");
  await (core.methods as any)
    .redistribute(new BN(900))
    .accounts({
      coreState: CORE_STATE,
      gate: wallet.publicKey,
    })
    .rpc();
  console.log("✅ redistribute executed");

  state = await printCoreState("after redistribute(900)");
  for (const [i, u] of users.entries()) {
    await printUser(`user ${i}`, u.publicKey, state.globalField);
  }

  // === 4. transfer: move base_balance between two registered users ===
  console.log("\n=== 4. transfer (user 0 -> user 1) ===");
  await (core.methods as any)
    .transfer(new BN(100))
    .accounts({
      transferCtx: {
        coreState: CORE_STATE,
        fromUser: userPda(users[0].publicKey),
        toUser: userPda(users[1].publicKey),
        fromAuthority: users[0].publicKey,
        toAuthority: users[1].publicKey,
      },
    })
    .signers([users[0]])
    .rpc();
  console.log("✅ transfer executed");

  state = await printCoreState("after transfer(100)");
  for (const [i, u] of users.entries()) {
    await printUser(`user ${i}`, u.publicKey, state.globalField);
  }

  console.log("\n🎉 All steps completed. Invariants held (no errors thrown by check_invariant).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
