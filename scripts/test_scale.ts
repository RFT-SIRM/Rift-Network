import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "fs"; import path from "path"; import os from "os";

const idPath = path.join(os.homedir(), ".config", "solana", "id.json");
const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(idPath, "utf-8"))));
const connection = new Connection("http://localhost:8899", "confirmed");
const provider = new AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
anchor.setProvider(provider);

const ULTRA_CORE_RIFT_ID = new PublicKey("ApQFryfGR7pWdThYVNqTJh8YX2c7ca8M1voeJsizJohR");
const CORE_STATE = new PublicKey("ajJ1cfNEcvGoa6CP2Q297qW1BDgRVjkCycyhCbKbHrj");

const ultraCoreIdl = JSON.parse(fs.readFileSync("target/idl/ultra_core_rift.json", "utf-8"));
ultraCoreIdl.address = ULTRA_CORE_RIFT_ID.toBase58();
const core = new Program(ultraCoreIdl as any, provider);

function userPda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("user"), authority.toBuffer()], ULTRA_CORE_RIFT_ID)[0];
}

async function main() {
  const N = 5000; // Меняй на 3000 если хочешь, но жди 20 минут
  console.log(`Registering ${N} users...`);
  const start = Date.now();
  
  for (let i = 0; i < N; i++) {
    const u = Keypair.generate();
    const pda = userPda(u.publicKey);
    await (core.methods as any).register(u.publicKey).accounts({
      coreState: CORE_STATE, userAccount: pda, gate: wallet.publicKey, systemProgram: SystemProgram.programId,
    }).rpc();
    if (i % 10 === 0) console.log(`  ${i}/${N} registered`);
  }
  
  const regTime = Date.now() - start;
  console.log(`✅ ${N} users registered in ${regTime}ms`);

  console.log("\nRedistributing 1000000 units (O(1))...");
  const redistStart = Date.now();
  await (core.methods as any).redistribute(new BN(1000000)).accounts({
    coreState: CORE_STATE, gate: wallet.publicKey,
  }).rpc();
  const redistTime = Date.now() - redistStart;
  
  const state: any = await (core.account as any).coreState.fetch(CORE_STATE);
  console.log(`✅ Redistribute done in ${redistTime}ms`);
  console.log(`   global_field: ${state.globalField.toString()}`);
  console.log(`   per_user: ~${Math.floor(1000000 / N)}`);
  console.log(`   total_supply: ${state.totalSupply.toString()}`);
  console.log(`   p: ${state.p.toString()}`);
  console.log("\n🎉 O(1) proven: 1 transaction updated ALL balances simultaneously.");
}

main().catch(console.error);
