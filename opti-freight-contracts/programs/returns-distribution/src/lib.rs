use anchor_lang::prelude::*;

declare_id!("DVfDdWLdsin4LGgor4B1nNQTSe4oi5F4cfmRVafpeMog");

#[program]
pub mod returns_distribution {
    use super::*;

    pub fn init_pool(ctx: Context<InitPool>, apy: u16) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.apy = apy;
        pool.total = 0;
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amt: u64) -> Result<()> {
        ctx.accounts.pool.total += amt;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>, tokens: u16) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let returns = (tokens as u64) * (pool.apy as u64) / 100;
        require!(returns <= pool.total, Err::InsufficientFunds);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + 32 + 2 + 8 + 1, seeds = [b"pool"], bump)]
    pub pool: Account<'info, Pool>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    pub pool: Account<'info, Pool>,
}

#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub apy: u16,
    pub total: u64,
    pub bump: u8,
}

#[error_code]
pub enum Err {
    #[msg("Fondos insuficientes")]
    InsufficientFunds,
}
