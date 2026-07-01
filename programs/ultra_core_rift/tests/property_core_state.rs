use anchor_lang::prelude::*;
use proptest::prelude::*;
use ultra_core_rift::CoreState;

#[derive(Debug, Clone)]
enum Operation {
    Register,
    Unregister { base_balance: i128 },
    Transfer { amount: u128, edge_cost: i128 },
    Redistribute { amount: u128 },
    ApplyNegEntropy,
}

prop_compose! {
    fn valid_core_state()
        (p in 0u64..=5,
         global_field in -500i128..=500i128,
         total_supply in 0u128..=2000u128,
         total_burned in 0u128..=2000u128,
         dust_accumulator in 0u128..=5u128)
        -> CoreState
    {
        let total_burned = total_burned.min(total_supply);
        let total_minted = total_supply.checked_add(total_burned).unwrap();
        let total_base_sum = (total_supply as i128)
            .checked_sub(global_field.checked_mul(p as i128).unwrap_or(0))
            .unwrap_or(0);
        let dust_accumulator = if p == 0 {
            0
        } else {
            dust_accumulator.min(p as u128 - 1)
        };

        CoreState {
            gate: Pubkey::default(),
            paused: false,
            global_field,
            total_base_sum,
            total_supply,
            total_minted,
            total_burned,
            p,
            dust_accumulator,
        }
    }
}

fn operation_strategy() -> impl Strategy<Value = Operation> {
    prop_oneof![
        Just(Operation::Register),
        (0i128..=100i128).prop_map(|base_balance| Operation::Unregister { base_balance }),
        (1u128..=100u128, -50i128..=50i128)
            .prop_map(|(amount, edge_cost)| Operation::Transfer { amount, edge_cost }),
        (1u128..=100u128).prop_map(|amount| Operation::Redistribute { amount }),
        Just(Operation::ApplyNegEntropy),
    ]
}

#[cfg(miri)]
const PROPTEST_CASES: u32 = 16;
#[cfg(not(miri))]
const PROPTEST_CASES: u32 = 64;

proptest! {
    #![proptest_config(ProptestConfig {
        cases: PROPTEST_CASES,
        failure_persistence: None,
        ..ProptestConfig::default()
    })]

    #[test]
    fn core_state_invariant_after_random_sequence(
        mut state in valid_core_state(),
        ops in prop::collection::vec(operation_strategy(), 1..20)
    ) {
        prop_assert!(state.check_invariant().is_ok());

        for op in ops {
            let res = match op {
                Operation::Register => state.register_participant(),
                Operation::Unregister { base_balance } => state.unregister_participant(base_balance),
                Operation::Transfer { amount, edge_cost } => {
                    state.apply_transfer(0, 0, amount, edge_cost).map(|_| ())
                }
                Operation::Redistribute { amount } => state.redistribute_amount(amount),
                Operation::ApplyNegEntropy => state.apply_neg_entropy_tick(),
            };

            // If operation errors, skip to next; property should ensure invariant
            // holds after successful operations. This mirrors runtime behavior
            // where gate-authorized operations may fail and should not corrupt state.
            if res.is_err() {
                continue;
            }

            prop_assert!(state.check_invariant().is_ok(), "state invalid after op={:?} state={:?}", op, state);
        }
    }
}
