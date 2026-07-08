#![no_main]
use arbitrary::Unstructured;
use libfuzzer_sys::fuzz_target;
use ultra_core_rift::CoreState;

fuzz_target!(|data: &[u8]| {
    let mut u = Unstructured::new(data);

    // Start from a small, valid-ish state to keep maths bounded.
    let mut state = CoreState::new();

    if let Ok(p) = u.int_in_range::<u64>(0..=5) {
        state.p = p;
    }
    if let Ok(g) = u.arbitrary::<i128>() {
        state.global_field = g % 100;
    }
    if let Ok(s) = u.arbitrary::<u128>() {
        state.total_supply = s % 1000;
    }

    // Fix total_minted to match total_supply so invariant (2) holds:
    // total_supply = total_minted - total_burned
    state.total_minted = state.total_supply;
    state.total_burned = 0;

    // Fix total_base_sum to (supply - global_field * p) so invariant (1) holds:
    // total_supply = total_base_sum + global_field * p
    let field_contrib = state
        .global_field
        .checked_mul(state.p as i128)
        .unwrap_or(0);
    state.total_base_sum = (state.total_supply as i128).saturating_sub(field_contrib);

    // Verify starting state is valid before executing operations.
    if state.check_invariant().is_err() {
        return;
    }

    // Execute a small, bounded number of operations driven by the input.
    let steps = data.len().clamp(1, 8);
    for _ in 0..steps {
        let op = u.arbitrary::<u8>().unwrap_or(0) % 5;
        match op {
            0 => {
                let _ = state.register_participant();
            }
            1 => {
                let base_balance = u.arbitrary::<i128>().unwrap_or(0).abs() % 50;
                let _ = state.unregister_participant(base_balance);
            }
            2 => {
                let amount = (u.arbitrary::<u128>().unwrap_or(0) % 50) + 1;
                let edge_cost = (u.arbitrary::<i128>().unwrap_or(0) % 20) - 10;
                let _ = state.apply_transfer(0, 0, amount, edge_cost);
            }
            3 => {
                let amount = (u.arbitrary::<u128>().unwrap_or(0) % 50) + 1;
                let _ = state.redistribute_amount(amount);
            }
            4 => {
                let _ = state.apply_neg_entropy_tick();
            }
            _ => {}
        }

        // If invariant fails after a successful operation, crash to let fuzz
        // find the input that causes corruption.
        if state.check_invariant().is_err() {
            panic!("invariant violated during fuzz: {:?}", state);
        }
    }
});
