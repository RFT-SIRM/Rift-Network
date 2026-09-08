# Rift Network

[![Lab](https://img.shields.io/badge/Lab-Research%20Platform-dc2626?style=for-the-badge)](https://github.com/RFT-SIRM/UltraCore-RFT)
[![Solana](https://img.shields.io/badge/Chain-Solana-9945ff?style=for-the-badge)](https://solana.com)
[![SPL](https://img.shields.io/badge/Protocol-SPL%20Token-3b82f6?style=for-the-badge)](https://spl.solana.com)
[![Anchor](https://img.shields.io/badge/Framework-Anchor-0ea5e9?style=for-the-badge)](https://www.anchor-lang.com)
[![Security](https://img.shields.io/badge/Security-14%20Findings%20Addressed-22c55e?style=for-the-badge)](https://github.com/RFT-SIRM/Rift-Network#-security-model)
[![Fuzzing](https://img.shields.io/badge/Fuzzing-2.5B%2B%20Runs-10b981?style=for-the-badge)](https://github.com/RFT-SIRM/Rift-Network#-verification)
[![License](https://img.shields.io/badge/License-Apache%202.0-eab308?style=for-the-badge)](https://github.com/RFT-SIRM/Rift-Network/blob/main/LICENSE)

**Solana On-Chain Protocol · SIRM Invariant Enforcement · SPL Token Layer**

_Part of the [UltraCore RFT](https://github.com/RFT-SIRM/UltraCore-RFT) execution platform_

---

> **Deterministic invariant-preserving economic state machine for Solana/SVM.**
>
> - **O(1) global distribution** — one account write shifts all participant balances simultaneously
> - **On-chain invariant enforcement** — `check_invariant()` runs after every state mutation, no exceptions
> - **2.5B+ fuzzed state transitions** — zero invariant violations across all protocol modes
> - **14 security findings resolved** — documented inline with commit references
> - **Reproducible Devnet deployment** — SHA-256 verified on-chain via `solana-verify`

---

## 🖥️ Live Demo (Devnet)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-rift--network.vercel.app-22c55e?style=for-the-badge)](https://rift-network.vercel.app)

A web client for interacting with the on-chain programs is deployed at **[rift-network.vercel.app](https://rift-network.vercel.app)**.

> ⚠️ **Devnet only.** This interface connects exclusively to Solana **Devnet** — a test network with no real economic value. Wallets and tokens shown are for testing purposes only; do not send real funds. All invariant enforcement happens on-chain in the programs listed below.

> **Deployment scope:** This repository targets Solana **Devnet**. Mainnet deployment will require an additional security hardening pass, including canonical mint enforcement and stricter authority binding between Core and Token programs.

---

## 🎯 Start Here

| Audience | Document | What You Will Learn |
|---|---|---|
| 🎯 **First-time visitor** | This README | What Rift Network is and how it works |
| 🔬 **Protocol engineer** | [SPEC.md](SPEC.md) | Full engineering specification: invariants, accounts, instructions |
| 🏗️ **Solana developer** | [programs/](programs/) | Anchor implementation of core + token programs |
| 🛡️ **Security researcher** | [Security Model](#-security-model) | 14 findings addressed, invariant enforcement model |

---

## 🌐 What Is Rift Network?

Rift Network is the **on-chain implementation** of the UltraCore RFT execution platform. It is a deterministic economic protocol deployed on Solana that enforces the SIRM mathematical invariants natively on the SVM, with an SPL token interface for participant issuance.

**Key principle:** The token layer never writes to `CoreState`. It reads `global_field` and `paused`, but all invariant logic lives in the core program. A fully compromised token program cannot corrupt the mathematical model — by construction.

```mermaid
flowchart TB
    subgraph L1["Layer 1: Core State Machine"]
        CS["ultra_core_rift\nInvariant Enforcement\nGate Authority\nPause Mechanism"]
    end
    subgraph L2["Layer 2: Token Interface"]
        TS["rift_token\nSPL Mint\nField-Pressure Issuance\nFee Collection"]
    end
    subgraph L3["Layer 3: Shared Primitives"]
        CM["rift-common\nConstants · Errors · Types"]
    end
    L3 --> L1
    L3 --> L2
    L1 -->|"reads only"| L2
```

---

## 📐 The SIRM Invariants

All state-mutating instructions call `check_invariant()` before returning. There are no execution paths that skip it.

```
I1: total_supply = total_base_sum + global_field × p
I2: total_supply = total_minted − total_burned
I3: dust_accumulator < p   (when p > 0)
I4: effective_balance[i] ≥ −(total_supply / 10p)
```

Where `effective_balance[i] = base_balance[i] + global_field`.

### O(1) Distribution — How and Why

Standard Solana token distribution is O(N): to give every participant a reward, you must write to every participant account individually. At scale this becomes economically infeasible.

Rift uses a different mathematical model. Instead of storing absolute balances, each participant stores only a `base_balance` offset. A single shared scalar `global_field` is added to every participant's offset at read time:

```
effective_balance[i] = base_balance[i] + global_field
```

To distribute a reward across all `p` participants:

```
# Standard approach: O(N) account writes
for each participant i:
    balance[i] += reward / N          ← N separate account writes

# Rift approach: O(1) account write
global_field += reward / p            ← 1 account write, all participants shifted
dust_accumulator += reward % p        ← remainder preserved exactly
```

This is not an optimization of the standard model. It is a different mathematical model that makes large-scale uniform distribution structurally O(1) on Solana — regardless of participant count.

| Participants | Standard writes | Rift writes |
|---|---|---|
| 1,000 | 1,000 | 1 |
| 100,000 | 100,000 | 1 |
| 1,000,000 | 1,000,000 | 1 |
| N | N | 1 |

The invariant I1 (`total_supply = total_base_sum + global_field × p`) ensures that the global shift is always consistent with the aggregate supply — this is enforced on-chain after every operation.

---

## 💡 What Is RIFT?

RIFT is an SPL token issued by the `rift_token` program. It represents a **proportional share of the SIRM economic state** at the moment of issuance.

- **How it is issued:** A user sends SOL to `issue_rift`. The program reads the current `global_field` from `CoreState`, computes field pressure, and mints RIFT shares proportional to the economic state at that moment.
- **What backs it:** RIFT shares are backed by the SIRM economic model — the ratio of shares to field pressure determines the mint rate.
- **What it is NOT:** RIFT is not a 1:1 redemption claim on `CoreState.total_supply`. The token layer is an economic interface, not a direct liability of the core accounting system.
- **When field pressure increases:** fewer RIFT shares are minted per SOL — the protocol naturally becomes more conservative as the economic state expands.

```
field_pressure  = max(|global_field|, 10^6)
mint_multiplier = 10^15 / field_pressure
shares_to_mint  = (base_amount - fee) × mint_multiplier / 10^12
```

Higher `|global_field|` → lower multiplier → fewer shares per SOL.

---

## ⚙️ Architecture

### Core Program (`ultra_core_rift`)

**Program ID (Devnet):** `CBrsXBaa1DTHFdCwCkeQHm3bQKRFaWfPx6bKNmM5r5uy`

| Account | Size | Description |
|---|---|---|
| `CoreState` | 145 bytes | Global protocol state; PDA `["core_state"]` |
| `UserAccount` | 56 bytes | Per-participant balance; PDA `["user", authority]` |
| `EdgeAccount` | 24 bytes | Directed edge weight; PDA `["edge", from, to]` |

| Instruction | Authority | Description |
|---|---|---|
| `initialize` | payer | Creates `CoreState` with zero state |
| `set_paused` | gate | Halts all transfers and issuance |
| `register` | gate | Adds participant; preserves I1 |
| `unregister` | gate | Removes participant; burns positive balance |
| `transfer` | from_owner | Peer-to-peer transfer |
| `transfer_with_edge` | from_owner | Transfer with directed burn/mint edge cost |
| `set_edge` | gate | Creates or updates an edge weight |
| `redistribute` | gate | Increases `global_field`; mints supply O(1) |
| `apply_neg_entropy` | gate | Deflationary tick; adjusts `total_base_sum` |

### Token Program (`rift_token`)

**Program ID (Devnet):** `GdTffSB1aNxfCeZW3PG2S7c788DnZgduJ68jWak3aJrp`

| Account | Size | Description |
|---|---|---|
| `RiftTokenState` | 156 bytes | Token config; PDA `["rift_token_state"]` |
| SPL Mint | — | Standard SPL mint; authority = PDA `["rift_mint_authority"]` |

| Instruction | Authority | Description |
|---|---|---|
| `initialize` | gate | Creates state; mints 3.14% founder share to admin vault |
| `issue_rift` | user | Mints RIFT shares based on field pressure; collects SOL fee |
| `rebase` | gate | Updates cached `rift_multiplier` from current `global_field` |
| `set_soft_launch_params` | gate | Adjusts soft-launch window limit and duration |

---

## 🛡️ Security Model

### Findings — Public Summary

Independent security review completed. 14 findings identified and resolved. Full report available to institutional partners under NDA. Public summary with commit references:

| ID | Category | Severity | Status | Fix |
|---|---|---|---|---|
| F-01 | Access control | High | ✅ Fixed | Recipient ownership verified before state mutation in `transfer` |
| F-02 | State accounting | Medium | ✅ Fixed | `unregister` checks effective balance (`base + global_field`), not raw `base_balance` |
| F-03 | PDA validation | Medium | ✅ Fixed | CoreState binding verified on every token instruction |
| F-04 | Arithmetic | Medium | ✅ Fixed | `issue_rift` rejects micro-amounts where fee rounds to zero |
| F-05 | Event integrity | Low | ✅ Fixed | Events emit live `mint_multiplier`, not stale cached value |
| FUZZ-01 | Invariant | Medium | ✅ Fixed | `dust_accumulator` renormalised after `p` decrements |
| +8 more | Various | Low–Medium | ✅ Fixed | Access control, arithmetic, error handling |

All fixes are documented inline in source with `[F-xx]` and `[FUZZ-xx]` tags referencing the finding.

### Structural Security Properties

- **Invariant enforcement:** `check_invariant()` called after every state-mutating instruction
- **Checked arithmetic:** All operations use `checked_*`; all narrowing casts use `try_into()`
- **Gate authority:** All privileged instructions require gate signer via Anchor `has_one`
- **Pause coverage:** `paused = true` blocks transfers and issuance across both programs
- **CoreState binding:** `RiftTokenState` stores the bound `CoreState` address at init; every token instruction verifies it on-chain
- **Mint constraint:** `admin_vault_token_account.mint == rift_mint` enforced at `initialize`
- **Owner constraint:** `user_token_account.owner == user` enforced at `issue_rift`
- **Soft launch:** 48-hour window with 5 SOL per-call cap limits early exposure

---

## ✅ Verification

| Layer | Method | Status |
|---|---|---|
| L1 — Formatting | `cargo fmt --all` | Every push · CI enforced |
| L2 — Lint | `cargo clippy` (rift-common, rift-integration-tests, rift_token) | Every push · CI enforced |
| L3 — Unit tests | `cargo test -p rift_token` — 8 tests on mint formula | Every push · CI enforced |
| L4 — Program tests | `cargo test -p ultra_core_rift -p rift-integration-tests -p rift-common` | Every push · CI enforced |
| L5 — Fuzzing | 2.5B+ runs, all four protocol modes | Daily · 0 invariant violations |
| L6 — Audit | Independent security review | 14 findings addressed |
| L7 — On-Chain | Reproducible build via `solana-verify` | Hashes verified on-chain |

### On-Chain Program Hashes (Devnet)

| Program | Program ID | SHA-256 |
|---|---|---|
| `ultra_core_rift` | `CBrsXBaa1DTHFdCwCkeQHm3bQKRFaWfPx6bKNmM5r5uy` | `f5b82e461c0bd81363c863e7f9ca558f1eae71d8bedeec7a74fbd790a82ab7cf` |
| `rift_token` | `GdTffSB1aNxfCeZW3PG2S7c788DnZgduJ68jWak3aJrp` | `47b5f15c22a693362d7784acdfedfb304d3ed22871be399c24e57d347c57f9e4` |

Verify yourself:

```bash
solana-verify get-program-hash CBrsXBaa1DTHFdCwCkeQHm3bQKRFaWfPx6bKNmM5r5uy \
  --url https://api.devnet.solana.com

solana-verify get-program-hash GdTffSB1aNxfCeZW3PG2S7c788DnZgduJ68jWak3aJrp \
  --url https://api.devnet.solana.com
```

---

## 🚀 Quick Start

### Prerequisites

- Rust 1.85.1+
- Solana CLI
- Anchor CLI 0.30

### Build

```bash
cargo build --workspace
anchor build
```

### Test

```bash
# Unit tests — rift_token mint formula (8 tests)
cargo test -p rift_token

# Core program tests
cargo test -p ultra_core_rift

# Integration tests
cargo test -p rift-integration-tests

# Shared primitives
cargo test -p rift-common
```

### Format & Lint

```bash
cargo fmt --all
cargo clippy -p rift-common -p rift-integration-tests -p rift_token \
  --all-targets -- -D warnings -A unexpected-cfgs
```

---

## 🔗 Ecosystem

| Repository | Role |
|---|---|
| [UltraCore-RFT](https://github.com/RFT-SIRM/UltraCore-RFT) | Central laboratory and documentation |
| [Rift-L1-Blockchain](https://github.com/RFT-SIRM/Rift-L1-Blockchain) | Standalone Rust validator; same SIRM invariants, different runtime |


---

**Built in Rust · Verified by Mathematics · Zero Compromises**

_Part of the UltraCore RFT Execution Platform · © 2026 Eugeny (RFT-SIRM)_
