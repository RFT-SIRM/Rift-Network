#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use rift_common::*;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkYqk5Nnq4P6A4jR4Jm5Y8A");

// ============================================================================
// PROGRAM
// ============================================================================

#[program]
pub mod ultra_core_rift {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, gate: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.core_state;
        state.gate = gate;
        state.paused = false;
        state.global_field = 0;
        state.total_base_sum = 0;
        state.total_supply = 0;
        state.total_minted = 0;
        state.total_burned = 0;
        state.p = 0;
        state.dust_accumulator = 0;
        state.check_invariant()
    }

    /// Gate-only: pause or unpause all transfer operations.
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        ctx.accounts.core_state.paused = paused;
        emit!(PausedEvent { paused });
        Ok(())
    }

    /// Gate-only: set or update the weight of a directed edge between two participants.
    pub fn set_edge(ctx: Context<SetEdge>, _from: Pubkey, _to: Pubkey, weight: i128) -> Result<()> {
        require!(
            (-MAX_EDGE_COST..=MAX_EDGE_COST).contains(&weight),
            RiftError::EdgeLimitExceeded
        );
        ctx.accounts.edge_account.weight = weight;
        Ok(())
    }

    /// Gate-only: register a new participant.
    pub fn register(ctx: Context<Register>, user: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.core_state;
        require!(state.p < MAX_PARTICIPANTS, RiftError::MaxParticipantsReached);

        let user_account = &mut ctx.accounts.user_account;
        user_account.authority = user;
        user_account.base_balance = 0;

        state.total_base_sum = state
            .total_base_sum
            .checked_sub(state.global_field)
            .ok_or(RiftError::MathOverflow)?;

        state.p = state.p.checked_add(1).ok_or(RiftError::MathOverflow)?;

        emit!(RegisteredEvent { user });
        state.check_invariant()
    }

    /// Gate-only: unregister a participant and burn any remaining positive balance.
    ///
    /// [F-02] FIX: Checks effective_balance = base_balance + global_field.
    /// [FUZZ-01] FIX: Re-normalises dust_accumulator after p decrements to
    /// preserve invariant (5): dust_accumulator < p.
    pub fn unregister(ctx: Context<Unregister>) -> Result<()> {
        let state = &mut ctx.accounts.core_state;
        let base = ctx.accounts.user_account.base_balance;

        // [F-02] Guard on effective balance, not base_balance alone.
        let effective_balance = base
            .checked_add(state.global_field)
            .ok_or(RiftError::MathOverflow)?;
        require!(effective_balance >= 0, RiftError::DebtOnExitNotAllowed);

        if base > 0 {
            let burn = base as u128;
            require!(state.total_supply >= burn, RiftError::SupplyUnderflow);

            state.total_supply = state
                .total_supply
                .checked_sub(burn)
                .ok_or(RiftError::MathOverflow)?;
            state.total_burned = state
                .total_burned
                .checked_add(burn)
                .ok_or(RiftError::MathOverflow)?;

            emit!(BurnEvent {
                user: ctx.accounts.user_account.authority,
                amount: burn,
            });
        }

        state.total_base_sum = state
            .total_base_sum
            .checked_sub(base)
            .ok_or(RiftError::MathOverflow)?
            .checked_add(state.global_field)
            .ok_or(RiftError::MathOverflow)?;

        state.p = state.p.checked_sub(1).ok_or(RiftError::MathOverflow)?;

        // [FUZZ-01] Re-normalise dust_accumulator after p decrements.
        // Invariant (5): dust_accumulator < p.
        // If dust >= new p, take modulo. Excess is carried into next redistribute.
        if state.p > 0 && state.dust_accumulator >= state.p as u128 {
            state.dust_accumulator = state
                .dust_accumulator
                .checked_rem(state.p as u128)
                .ok_or(RiftError::MathOverflow)?;
        } else if state.p == 0 {
            state.dust_accumulator = 0;
        }

        emit!(UnregisteredEvent {
            user: ctx.accounts.user_account.authority,
        });
        state.check_invariant()
    }

    /// Transfer amount from signer's account to to_authority's account, no edge cost.
    ///
    /// [F-01] FIX: Verify recipient account ownership before mutating any state.
    pub fn transfer(ctx: Context<Transfer>, amount: u128) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.transfer_ctx.to_user.authority,
            ctx.accounts.transfer_ctx.to_authority.key(),
            RiftError::UnauthorizedAuthority
        );
        ctx.accounts.transfer_ctx.perform_transfer(amount, 0)
    }

    /// Transfer amount via a directed edge; edge weight is applied as a cost to sender.
    pub fn transfer_with_edge(ctx: Context<TransferWithEdge>, amount: u128) -> Result<()> {
        let edge_cost = ctx.accounts.edge_account.weight;

        require_keys_eq!(
            ctx.accounts.transfer_ctx.to_user.authority,
            ctx.accounts.transfer_ctx.to_authority.key(),
            RiftError::UnauthorizedAuthority
        );

        ctx.accounts
            .transfer_ctx
            .perform_transfer(amount, edge_cost)
    }

    /// Gate-only: distribute amount evenly among all participants.
    pub fn redistribute(ctx: Context<Redistribute>, amount: u128) -> Result<()> {
        let state = &mut ctx.accounts.core_state;
        require!(state.p > 0, RiftError::ZeroParticipants);

        let p_u128 = state.p as u128;

        let total = amount
            .checked_add(state.dust_accumulator)
            .ok_or(RiftError::MathOverflow)?;

        let q = total.checked_div(p_u128).ok_or(RiftError::MathOverflow)?;
        let r = total.checked_rem(p_u128).ok_or(RiftError::MathOverflow)?;

        let q_i128: i128 = q.try_into().map_err(|_| RiftError::MathOverflow)?;

        state.global_field = state
            .global_field
            .checked_add(q_i128)
            .ok_or(RiftError::MathOverflow)?;

        let distributed = q.checked_mul(p_u128).ok_or(RiftError::MathOverflow)?;

        state.total_supply = state
            .total_supply
            .checked_add(distributed)
            .ok_or(RiftError::MathOverflow)?;
        state.total_minted = state
            .total_minted
            .checked_add(distributed)
            .ok_or(RiftError::MathOverflow)?;

        state.dust_accumulator = r;

        emit!(RedistributeEvent {
            amount,
            per_user: q,
            dust_retained: r,
        });
        emit!(FieldUpdateEvent {
            new_global_field: state.global_field,
        });

        state.check_invariant()
    }

    /// Gate-only: apply one negative entropy tick.
    pub fn apply_neg_entropy(ctx: Context<ApplyNegEntropy>) -> Result<()> {
        let state = &mut ctx.accounts.core_state;

        let p_i128 = state.p as i128;

        require!(p_i128 <= NEG_E_MAX_P, RiftError::PhysicalOverflowLimit);

        let delta = p_i128.checked_mul(NEG_E).ok_or(RiftError::MathOverflow)?;

        state.global_field = state
            .global_field
            .checked_add(NEG_E)
            .ok_or(RiftError::MathOverflow)?;

        state.total_base_sum = state
            .total_base_sum
            .checked_sub(delta)
            .ok_or(RiftError::MathOverflow)?;

        emit!(FieldUpdateEvent {
            new_global_field: state.global_field,
        });
        state.check_invariant()
    }
}

// ============================================================================
// CORE STATE
// ============================================================================

#[account]
#[derive(Debug)]
pub struct CoreState {
    pub gate: Pubkey,           // 32
    pub paused: bool,           //  1
    pub global_field: i128,     // 16
    pub total_base_sum: i128,   // 16
    pub total_supply: u128,     // 16
    pub total_minted: u128,     // 16
    pub total_burned: u128,     // 16
    pub p: u64,                 //  8
    pub dust_accumulator: u128, // 16
}

impl Default for CoreState {
    fn default() -> Self {
        Self::new()
    }
}

impl CoreState {
    pub const SPACE: usize = 8 + 32 + 1 + 16 * 6 + 8;

    pub fn debt_limit(&self) -> Result<i128> {
        let factor = (self.p as i128)
            .checked_mul(10)
            .ok_or(RiftError::MathOverflow)?;

        if factor == 0 {
            return Ok(MIN_ABS_DEBT);
        }

        let limit = (self.total_supply as i128)
            .checked_div(factor)
            .ok_or(RiftError::MathOverflow)?;
        Ok(-limit)
    }

    pub fn new() -> Self {
        Self {
            gate: Pubkey::default(),
            paused: false,
            global_field: 0,
            total_base_sum: 0,
            total_supply: 0,
            total_minted: 0,
            total_burned: 0,
            p: 0,
            dust_accumulator: 0,
        }
    }

    pub fn snapshot(&self) -> Self {
        Self {
            gate: self.gate,
            paused: self.paused,
            global_field: self.global_field,
            total_base_sum: self.total_base_sum,
            total_supply: self.total_supply,
            total_minted: self.total_minted,
            total_burned: self.total_burned,
            p: self.p,
            dust_accumulator: self.dust_accumulator,
        }
    }

    pub fn register_participant(&mut self) -> Result<()> {
        require!(self.p < MAX_PARTICIPANTS, RiftError::MaxParticipantsReached);

        let new_total_base_sum = self
            .total_base_sum
            .checked_sub(self.global_field)
            .ok_or(RiftError::MathOverflow)?;
        let new_p = self.p.checked_add(1).ok_or(RiftError::MathOverflow)?;

        self.total_base_sum = new_total_base_sum;
        self.p = new_p;
        self.check_invariant()
    }

    /// [F-02] + [FUZZ-01] fixes mirrored from the on-chain instruction.
    pub fn unregister_participant(&mut self, base_balance: i128) -> Result<()> {
        let effective_balance = base_balance
            .checked_add(self.global_field)
            .ok_or(RiftError::MathOverflow)?;
        require!(effective_balance >= 0, RiftError::DebtOnExitNotAllowed);
        require!(self.p > 0, RiftError::ZeroParticipants);

        let mut new_total_supply = self.total_supply;
        let mut new_total_burned = self.total_burned;

        if base_balance > 0 {
            let burn = base_balance as u128;
            require!(new_total_supply >= burn, RiftError::SupplyUnderflow);

            new_total_supply = new_total_supply
                .checked_sub(burn)
                .ok_or(RiftError::MathOverflow)?;
            new_total_burned = new_total_burned
                .checked_add(burn)
                .ok_or(RiftError::MathOverflow)?;
        }

        let new_total_base_sum = self
            .total_base_sum
            .checked_sub(base_balance)
            .ok_or(RiftError::MathOverflow)?
            .checked_add(self.global_field)
            .ok_or(RiftError::MathOverflow)?;

        let new_p = self.p.checked_sub(1).ok_or(RiftError::MathOverflow)?;

        self.total_supply = new_total_supply;
        self.total_burned = new_total_burned;
        self.total_base_sum = new_total_base_sum;
        self.p = new_p;

        // [FUZZ-01] Re-normalise dust_accumulator after p decrements.
        if self.p > 0 && self.dust_accumulator >= self.p as u128 {
            self.dust_accumulator = self
                .dust_accumulator
                .checked_rem(self.p as u128)
                .ok_or(RiftError::MathOverflow)?;
        } else if self.p == 0 {
            self.dust_accumulator = 0;
        }

        self.check_invariant()
    }

    pub fn redistribute_amount(&mut self, amount: u128) -> Result<()> {
        require!(self.p > 0, RiftError::ZeroParticipants);

        let p_u128 = self.p as u128;
        let total = amount
            .checked_add(self.dust_accumulator)
            .ok_or(RiftError::MathOverflow)?;

        let q = total.checked_div(p_u128).ok_or(RiftError::MathOverflow)?;
        let r = total.checked_rem(p_u128).ok_or(RiftError::MathOverflow)?;

        let q_i128: i128 = q.try_into().map_err(|_| RiftError::MathOverflow)?;
        self.global_field = self
            .global_field
            .checked_add(q_i128)
            .ok_or(RiftError::MathOverflow)?;

        let distributed = q.checked_mul(p_u128).ok_or(RiftError::MathOverflow)?;
        self.total_supply = self
            .total_supply
            .checked_add(distributed)
            .ok_or(RiftError::MathOverflow)?;
        self.total_minted = self
            .total_minted
            .checked_add(distributed)
            .ok_or(RiftError::MathOverflow)?;
        self.dust_accumulator = r;

        self.check_invariant()
    }

    pub fn apply_neg_entropy_tick(&mut self) -> Result<()> {
        let p_i128 = self.p as i128;
        require!(p_i128 <= NEG_E_MAX_P, RiftError::PhysicalOverflowLimit);

        let delta = p_i128.checked_mul(NEG_E).ok_or(RiftError::MathOverflow)?;
        self.global_field = self
            .global_field
            .checked_add(NEG_E)
            .ok_or(RiftError::MathOverflow)?;
        self.total_base_sum = self
            .total_base_sum
            .checked_sub(delta)
            .ok_or(RiftError::MathOverflow)?;

        self.check_invariant()
    }

    pub fn apply_transfer(
        &mut self,
        from_balance: i128,
        to_balance: i128,
        amount: u128,
        edge_cost: i128,
    ) -> Result<(i128, i128)> {
        require!(!self.paused, RiftError::ProtocolPaused);
        if amount == 0 {
            return Ok((from_balance, to_balance));
        }

        let amt: i128 = amount.try_into().map_err(|_| RiftError::MathOverflow)?;
        let new_from = from_balance
            .checked_sub(amt)
            .ok_or(RiftError::MathOverflow)?
            .checked_sub(edge_cost)
            .ok_or(RiftError::MathOverflow)?;

        require!(new_from >= self.debt_limit()?, RiftError::DebtLimitExceeded);

        let new_to = to_balance.checked_add(amt).ok_or(RiftError::MathOverflow)?;
        let mut new_total_base_sum = self.total_base_sum;
        let mut new_total_supply = self.total_supply;
        let mut new_total_minted = self.total_minted;
        let mut new_total_burned = self.total_burned;

        if edge_cost != 0 {
            new_total_base_sum = new_total_base_sum
                .checked_sub(edge_cost)
                .ok_or(RiftError::MathOverflow)?;

            match edge_cost.cmp(&0) {
                std::cmp::Ordering::Greater => {
                    let burn = edge_cost as u128;
                    require!(new_total_supply >= burn, RiftError::SupplyUnderflow);
                    new_total_supply = new_total_supply
                        .checked_sub(burn)
                        .ok_or(RiftError::MathOverflow)?;
                    new_total_burned = new_total_burned
                        .checked_add(burn)
                        .ok_or(RiftError::MathOverflow)?;
                }
                std::cmp::Ordering::Less => {
                    let mint = (-edge_cost) as u128;
                    new_total_supply = new_total_supply
                        .checked_add(mint)
                        .ok_or(RiftError::MathOverflow)?;
                    new_total_minted = new_total_minted
                        .checked_add(mint)
                        .ok_or(RiftError::MathOverflow)?;
                }
                _ => {}
            }
        }

        self.total_base_sum = new_total_base_sum;
        self.total_supply = new_total_supply;
        self.total_minted = new_total_minted;
        self.total_burned = new_total_burned;

        self.check_invariant()?;
        Ok((new_from, new_to))
    }

    pub fn check_invariant(&self) -> Result<()> {
        require!(self.total_supply <= MAX_SUPPLY, RiftError::MathOverflow);

        let field_contrib = self
            .global_field
            .checked_mul(self.p as i128)
            .ok_or(RiftError::MathOverflow)?;

        let expected = self
            .total_base_sum
            .checked_add(field_contrib)
            .ok_or(RiftError::MathOverflow)?;

        let supply_signed = self.total_supply as i128;
        require!(supply_signed == expected, RiftError::InvariantViolation);

        require!(
            self.total_minted >= self.total_burned,
            RiftError::InvariantViolation
        );
        let net_supply = self
            .total_minted
            .checked_sub(self.total_burned)
            .ok_or(RiftError::MathOverflow)?;
        require!(
            self.total_supply == net_supply,
            RiftError::InvariantViolation
        );

        if self.p > 0 {
            require!(
                self.dust_accumulator < self.p as u128,
                RiftError::InvariantViolation
            );
        }
        Ok(())
    }
}

// ============================================================================
// ACCOUNT STRUCTS
// ============================================================================

#[account]
pub struct UserAccount {
    pub authority: Pubkey,  // 32
    pub base_balance: i128, // 16
}
impl UserAccount {
    pub const SPACE: usize = 8 + 32 + 16; // = 56
}

#[account]
pub struct EdgeAccount {
    pub weight: i128, // 16
}
impl EdgeAccount {
    pub const SPACE: usize = 8 + 16; // = 24
}

// ============================================================================
// TRANSFER LOGIC
// ============================================================================

#[derive(Accounts)]
pub struct TransferCtx<'info> {
    #[account(mut)]
    pub core_state: Account<'info, CoreState>,
    #[account(mut, seeds = [b"user", from_authority.key().as_ref()], bump)]
    pub from_user: Account<'info, UserAccount>,
    #[account(mut, seeds = [b"user", to_authority.key().as_ref()], bump)]
    pub to_user: Account<'info, UserAccount>,
    pub from_authority: Signer<'info>,
    /// CHECK: Used only as the PDA seed for to_user. Ownership is verified
    /// explicitly via require_keys_eq! at the call site of every instruction
    /// that invokes perform_transfer (both transfer and transfer_with_edge).
    pub to_authority: UncheckedAccount<'info>,
}

impl TransferCtx<'_> {
    pub fn perform_transfer(&mut self, amount: u128, edge_cost: i128) -> Result<()> {
        let state = &mut self.core_state;
        require!(!state.paused, RiftError::ProtocolPaused);

        if amount == 0 {
            return Ok(());
        }

        let amt: i128 = amount.try_into().map_err(|_| RiftError::MathOverflow)?;

        let new_from = self
            .from_user
            .base_balance
            .checked_sub(amt)
            .ok_or(RiftError::MathOverflow)?
            .checked_sub(edge_cost)
            .ok_or(RiftError::MathOverflow)?;

        require!(
            new_from >= state.debt_limit()?,
            RiftError::DebtLimitExceeded
        );

        self.from_user.base_balance = new_from;
        self.to_user.base_balance = self
            .to_user
            .base_balance
            .checked_add(amt)
            .ok_or(RiftError::MathOverflow)?;

        if edge_cost != 0 {
            state.total_base_sum = state
                .total_base_sum
                .checked_sub(edge_cost)
                .ok_or(RiftError::MathOverflow)?;

            match edge_cost.cmp(&0) {
                std::cmp::Ordering::Greater => {
                    let burn = edge_cost as u128;
                    require!(state.total_supply >= burn, RiftError::SupplyUnderflow);
                    state.total_supply = state
                        .total_supply
                        .checked_sub(burn)
                        .ok_or(RiftError::MathOverflow)?;
                    state.total_burned = state
                        .total_burned
                        .checked_add(burn)
                        .ok_or(RiftError::MathOverflow)?;
                    emit!(BurnEvent {
                        user: self.from_user.authority,
                        amount: burn,
                    });
                }
                std::cmp::Ordering::Less => {
                    let mint = (-edge_cost) as u128;
                    state.total_supply = state
                        .total_supply
                        .checked_add(mint)
                        .ok_or(RiftError::MathOverflow)?;
                    state.total_minted = state
                        .total_minted
                        .checked_add(mint)
                        .ok_or(RiftError::MathOverflow)?;
                    emit!(MintEvent {
                        user: self.from_user.authority,
                        amount: mint,
                    });
                }
                _ => {}
            }
        }

        emit!(TransferEvent {
            from: self.from_user.authority,
            to: self.to_user.authority,
            amount,
        });

        state.check_invariant()
    }
}

// ============================================================================
// INSTRUCTION CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = CoreState::SPACE)]
    pub core_state: Account<'info, CoreState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(mut, has_one = gate @ RiftError::UnauthorizedGate)]
    pub core_state: Account<'info, CoreState>,
    pub gate: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct Register<'info> {
    #[account(mut, has_one = gate @ RiftError::UnauthorizedGate)]
    pub core_state: Account<'info, CoreState>,
    #[account(
        init,
        payer = gate,
        space = UserAccount::SPACE,
        seeds = [b"user", user.as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub gate: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unregister<'info> {
    #[account(mut, has_one = gate @ RiftError::UnauthorizedGate)]
    pub core_state: Account<'info, CoreState>,
    #[account(
        mut,
        close = gate,
        seeds = [b"user", user_account.authority.as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub gate: Signer<'info>,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    pub transfer_ctx: TransferCtx<'info>,
}

#[derive(Accounts)]
pub struct TransferWithEdge<'info> {
    pub transfer_ctx: TransferCtx<'info>,
    #[account(
        seeds = [
            b"edge",
            transfer_ctx.from_authority.key().as_ref(),
            transfer_ctx.to_authority.key().as_ref(),
        ],
        bump
    )]
    pub edge_account: Account<'info, EdgeAccount>,
}

#[derive(Accounts)]
#[instruction(from: Pubkey, to: Pubkey)]
pub struct SetEdge<'info> {
    #[account(has_one = gate @ RiftError::UnauthorizedGate)]
    pub core_state: Account<'info, CoreState>,
    #[account(
        init_if_needed,
        payer = gate,
        space = EdgeAccount::SPACE,
        seeds = [b"edge", from.as_ref(), to.as_ref()],
        bump
    )]
    pub edge_account: Account<'info, EdgeAccount>,
    #[account(mut)]
    pub gate: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Redistribute<'info> {
    #[account(mut, has_one = gate @ RiftError::UnauthorizedGate)]
    pub core_state: Account<'info, CoreState>,
    pub gate: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApplyNegEntropy<'info> {
    #[account(mut, has_one = gate @ RiftError::UnauthorizedGate)]
    pub core_state: Account<'info, CoreState>,
    pub gate: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct TransferEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u128,
}

#[event]
pub struct RedistributeEvent {
    pub amount: u128,
    pub per_user: u128,
    pub dust_retained: u128,
}

#[event]
pub struct FieldUpdateEvent {
    pub new_global_field: i128,
}

#[event]
pub struct RegisteredEvent {
    pub user: Pubkey,
}

#[event]
pub struct UnregisteredEvent {
    pub user: Pubkey,
}

#[event]
pub struct BurnEvent {
    pub user: Pubkey,
    pub amount: u128,
}

#[event]
pub struct MintEvent {
    pub user: Pubkey,
    pub amount: u128,
}

#[event]
pub struct PausedEvent {
    pub paused: bool,
}
