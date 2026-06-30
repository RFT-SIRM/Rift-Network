use anchor_lang::prelude::*;
use rift_common::NEG_E;
use ultra_core_rift::CoreState;

fn core_state_with(
    p: u64,
    global_field: i128,
    total_base_sum: i128,
    total_supply: u128,
    total_minted: u128,
    total_burned: u128,
    dust_accumulator: u128,
) -> CoreState {
    let state = CoreState {
        gate: Pubkey::default(),
        paused: false,
        global_field,
        total_base_sum,
        total_supply,
        total_minted,
        total_burned,
        p,
        dust_accumulator,
    };
    state
}

#[test]
fn register_participant_preserves_invariant() {
    let mut state = core_state_with(0, 10, 0, 0, 0, 0, 0);
    state.register_participant().unwrap();

    assert_eq!(state.p, 1);
    assert_eq!(state.total_base_sum, -10);
    assert_eq!(state.total_supply, 0);
    assert_eq!(state.global_field, 10);
    assert!(state.check_invariant().is_ok());
}

#[test]
fn redistribute_amount_updates_field_and_dust() {
    let mut state = core_state_with(2, 0, 0, 0, 0, 0, 0);

    state.redistribute_amount(5).unwrap();

    assert_eq!(state.global_field, 2);
    assert_eq!(state.dust_accumulator, 1);
    assert_eq!(state.total_supply, 4);
    assert_eq!(state.total_minted, 4);
    assert!(state.check_invariant().is_ok());
}

#[test]
fn apply_neg_entropy_tick_preserves_invariant() {
    let mut state = core_state_with(1, 0, 0, 0, 0, 0, 0);

    state.apply_neg_entropy_tick().unwrap();

    assert_eq!(state.global_field, NEG_E);
    assert_eq!(state.total_base_sum, -NEG_E);
    assert_eq!(state.total_supply, 0);
    assert!(state.check_invariant().is_ok());
}

#[test]
fn positive_edge_cost_burns_supply_and_preserves_invariant() {
    let mut state = core_state_with(0, 0, 10, 10, 10, 0, 0);

    let (new_from, new_to) = state.apply_transfer(10, 0, 5, 2).unwrap();

    assert_eq!(new_from, 3);
    assert_eq!(new_to, 5);
    assert_eq!(state.total_supply, 8);
    assert_eq!(state.total_burned, 2);
    assert_eq!(state.total_base_sum, 8);
    assert!(state.check_invariant().is_ok());
}

#[test]
fn unregister_participant_burns_balance_and_preserves_invariant() {
    let mut state = core_state_with(1, 0, 5, 5, 5, 0, 0);

    state.unregister_participant(5).unwrap();

    assert_eq!(state.p, 0);
    assert_eq!(state.total_base_sum, 0);
    assert_eq!(state.total_supply, 0);
    assert_eq!(state.total_burned, 5);
    assert!(state.check_invariant().is_ok());
}
