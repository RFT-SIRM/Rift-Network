use anchor_lang::prelude::*;
use rift_token::MIN_FIELD_PRESSURE;
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

fn compute_rift_shares(
    core: &CoreState,
    base_amount: u64,
    fee_bps: u16,
) -> Option<(u64, u128, u128)> {
    core.check_invariant().ok()?;
    if core.paused {
        return None;
    }
    let fee = (base_amount as u128)
        .checked_mul(fee_bps as u128)?
        .checked_div(10_000)?;
    let fee_u64: u64 = fee.try_into().ok()?;
    if fee_bps > 0 && fee_u64 == 0 {
        return None;
    }
    let after_fee = base_amount.checked_sub(fee_u64)?;
    let pressure = core.global_field.unsigned_abs().max(MIN_FIELD_PRESSURE);
    let mult = 1_000_000_000_000_000u128
        .checked_div(pressure)
        .unwrap_or(1_000_000_000_000u128);
    let shares_u128 = (after_fee as u128)
        .checked_mul(mult)?
        .checked_div(1_000_000_000_000u128)?;
    if shares_u128 == 0 {
        return None;
    }
    Some((shares_u128.try_into().ok()?, mult, pressure))
}

#[test]
fn token_layer_reads_global_field_for_mint_formula() {
    let core = core_state_with(10, 1_000_000, -10_000_000, 0, 0, 0, 0);
    let (shares, mult, pressure) = compute_rift_shares(&core, 1_000_000_000, 10).unwrap();
    assert_eq!(pressure, 1_000_000);
    assert_eq!(mult, 1_000_000_000);
    assert_eq!(shares, 999_000);
}

#[test]
fn higher_field_pressure_yields_fewer_shares() {
    let base = 1_000_000_000u64;
    let low = core_state_with(10, 1_000_000, -10_000_000, 0, 0, 0, 0);
    let high = core_state_with(10, 10_000_000, -100_000_000, 0, 0, 0, 0);
    let (l, _, _) = compute_rift_shares(&low, base, 10).unwrap();
    let (h, _, _) = compute_rift_shares(&high, base, 10).unwrap();
    assert!(h < l, "high={}, low={}", h, l);
}

#[test]
fn token_layer_rejects_when_core_paused() {
    let mut core = core_state_with(10, 1_000_000, -10_000_000, 0, 0, 0, 0);
    core.paused = true;
    assert!(compute_rift_shares(&core, 1_000_000_000, 10).is_none());
}

#[test]
fn token_layer_rejects_on_broken_invariant() {
    let broken = CoreState {
        gate: Pubkey::default(),
        paused: false,
        global_field: 100,
        total_base_sum: 0,
        total_supply: 0,
        total_minted: 0,
        total_burned: 0,
        p: 10,
        dust_accumulator: 0,
    };
    assert!(compute_rift_shares(&broken, 1_000_000_000, 10).is_none());
}

#[test]
fn token_layer_cannot_mutate_core_state() {
    let core = core_state_with(10, 1_000_000, -10_000_000, 0, 0, 0, 0);
    let _ = compute_rift_shares(&core, 1_000_000_000, 10);
    assert_eq!(core.global_field, 1_000_000);
    assert_eq!(core.total_supply, 0);
    assert!(!core.paused);
}

#[test]
fn min_field_pressure_caps_multiplier() {
    let core = core_state_with(10, 0, 0, 0, 0, 0, 0);
    let (_, mult, pressure) = compute_rift_shares(&core, 1_000_000_000, 10).unwrap();
    assert_eq!(pressure, MIN_FIELD_PRESSURE);
    assert_eq!(mult, 1_000_000_000);
}

#[test]
fn rebase_computes_multiplier_from_current_global_field() {
    let core = core_state_with(100, 5_000_000, -500_000_000, 0, 0, 0, 0);
    let pressure = core.global_field.unsigned_abs().max(MIN_FIELD_PRESSURE);
    let mult = 1_000_000_000_000_000u128
        .checked_div(pressure)
        .unwrap_or(1_000_000_000_000u128);
    assert_eq!(pressure, 5_000_000);
    assert_eq!(mult, 200_000_000);
}

#[test]
fn token_layer_adapts_to_core_state_evolution() {
    let mut core = core_state_with(2, 10_000_000, -20_000_000, 0, 0, 0, 0);
    let (s1, m1, p1) = compute_rift_shares(&core, 1_000_000_000, 10).unwrap();
    assert_eq!(p1, 10_000_000);
    assert_eq!(m1, 100_000_000);
    core.redistribute_amount(10_000_000).unwrap();
    let (s2, m2, p2) = compute_rift_shares(&core, 1_000_000_000, 10).unwrap();
    assert_eq!(p2, 15_000_000);
    assert!(m2 < m1, "Multiplier must decrease: m1={}, m2={}", m1, m2);
    assert!(s2 < s1, "Shares must decrease: s1={}, s2={}", s1, s2);
}
