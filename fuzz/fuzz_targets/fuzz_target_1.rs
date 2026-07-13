#![no_main]

use arbitrary::Unstructured;
use libfuzzer_sys::fuzz_target;
use rift_common::NEG_E;
use ultra_core_rift::CoreState;

/// Optimized fuzz target for ultra_core_rift invariant testing.
///
/// This harness employs stratified generation to test specific protocol paths:
/// - Mode 0: Small p, global_field near NEG_E (tests NEG_E overflow guard)
/// - Mode 1: Large p, moderate field (tests debris accumulation)
/// - Mode 2: Negative field (tests debt_limit and DebtOnExit path)
/// - Mode 3: Zero participants (tests p=0 edge case)
/// - Mode 4: Large supply (tests u128 overflow boundaries)
///
/// Each mode has a targeted operation sequence designed to exercise protocol
/// logic specific to that scenario.

fuzz_target!(|data: &[u8]| {
    if data.is_empty() {
        return;
    }

    let mut u = Unstructured::new(data);
    let mut state = CoreState::new();

    // Select test mode based on first byte of fuzzer input
    let mode = u.arbitrary::<u8>().unwrap_or(0) % 5;

    // Stratified generation: each mode exercises different protocol paths
    match mode {
        // Mode 0: Small p, field close to NEG_E (tests apply_neg_entropy overflow guard)
        0 => {
            state.p = u.int_in_range::<u64>(0..=3).unwrap_or(1);
            let neg_e_scaled = NEG_E / 2;
            state.global_field = if u.arbitrary::<bool>().unwrap_or(false) {
                neg_e_scaled
            } else {
                neg_e_scaled.saturating_sub(1000)
            };
            state.total_supply = u.int_in_range::<u128>(50..=500).unwrap_or(100);
        }

        // Mode 1: Large p, moderate field (tests dust accumulation and redistribution)
        1 => {
            state.p = u.int_in_range::<u64>(10..=40).unwrap_or(20);
            state.global_field = (u.arbitrary::<i128>().unwrap_or(0) % 2000).clamp(-1000, 1000);
            state.total_supply = u.int_in_range::<u128>(1000..=8000).unwrap_or(4000);
        }

        // Mode 2: Negative global_field (tests debt_limit and DebtOnExit rejection path)
        2 => {
            state.p = u.int_in_range::<u64>(2..=15).unwrap_or(5);
            state.global_field =
                -((u.arbitrary::<i128>().unwrap_or(0).abs() % 5000) + 100);
            state.total_supply = u.int_in_range::<u128>(500..=4000).unwrap_or(2000);
        }

        // Mode 3: Zero participants (p=0 edge case)
        3 => {
            state.p = 0;
            state.global_field = (u.arbitrary::<i128>().unwrap_or(0) % 500).clamp(-250, 250);
            state.total_supply = u.int_in_range::<u128>(0..=500).unwrap_or(100);
        }

        // Mode 4: Large supply near u128::MAX (tests arithmetic overflow protection)
        4 => {
            state.p = u.int_in_range::<u64>(1..=5).unwrap_or(2);
            let safe_max = u128::MAX / 4;
            state.total_supply = safe_max - u.int_in_range::<u128>(0..=1000).unwrap_or(100);
            state.global_field = (u.arbitrary::<i128>().unwrap_or(0) % 100).clamp(-50, 50);
        }

        _ => unreachable!(),
    }

    // Build consistent initial state satisfying all invariants
    state.total_minted = state.total_supply;
    state.total_burned = 0;

    // Invariant (1): total_supply = total_base_sum + global_field * p
    // Solve for total_base_sum: total_base_sum = total_supply - global_field * p
    let field_contrib = state.global_field.checked_mul(state.p as i128).unwrap_or(0);
    state.total_base_sum = (state.total_supply as i128).saturating_sub(field_contrib);

    // Verify starting state is valid before executing operations
    if state.check_invariant().is_err() {
        return;
    }

    // Mode-specific operation sequences
    let steps = data.len().clamp(2, 16);

    for step in 0..steps {
        let op = match mode {
            // Mode 0 (NEG_E testing): heavily bias towards apply_neg_entropy
            0 => {
                if step % 3 == 0 {
                    4 // apply_neg_entropy
                } else {
                    u.arbitrary::<u8>().unwrap_or(0) % 5
                }
            }

            // Mode 2 (debt testing): bias towards unregister to trigger DebtOnExit
            2 => {
                if step % 4 == 0 {
                    1 // unregister
                } else {
                    u.arbitrary::<u8>().unwrap_or(0) % 5
                }
            }

            // Mode 3 (p=0): permit all ops but be careful about early exits
            3 => {
                if state.p == 0 && step == 0 {
                    0 // register to initialize p
                } else {
                    u.arbitrary::<u8>().unwrap_or(0) % 5
                }
            }

            // Modes 1 and 4: standard random distribution
            _ => u.arbitrary::<u8>().unwrap_or(0) % 5,
        };

        match op {
            0 => {
                // register_participant: increments p, adjusts total_base_sum
                let _ = state.register_participant();
            }

            1 => {
                // unregister_participant: tests DebtOnExit path in Mode 2
                let base_balance = if mode == 2 {
                    // Bias heavily towards negative balances to trigger debt rejection
                    -((u.arbitrary::<i128>().unwrap_or(0).abs() % 300) + 1)
                } else {
                    (u.arbitrary::<i128>().unwrap_or(0) % 250) - 125
                };
                let _ = state.unregister_participant(base_balance);
            }

            2 => {
                // apply_transfer: tests edge costs (burn/mint) and lock conflicts
                let amount = (u.arbitrary::<u128>().unwrap_or(0) % 300) + 1;
                let edge_cost = (u.arbitrary::<i128>().unwrap_or(0) % 60) - 30;
                // Use fixed from/to indices (0, 0) to keep focus on invariant, not lock logic
                let _ = state.apply_transfer(0, 0, amount, edge_cost);
            }

            3 => {
                // redistribute_amount: tests field scaling and dust accumulation
                let amount = (u.arbitrary::<u128>().unwrap_or(0) % 500) + 1;
                let _ = state.redistribute_amount(amount);
            }

            4 => {
                // apply_neg_entropy_tick: tests fixed negative field shift and overflow guards
                let _ = state.apply_neg_entropy_tick();
            }

            _ => {}
        }

        // Invariant check after every operation
        // If check fails, fuzz engine will record this input as a crash
        if state.check_invariant().is_err() {
            panic!(
                "INVARIANT VIOLATED at step {} (op={}) in mode {}.\nState: {:#?}",
                step, op, mode, state
            );
        }
    }
});
