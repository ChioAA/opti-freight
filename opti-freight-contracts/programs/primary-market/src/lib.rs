use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Az1M72qgA5REQjiV789DrSqgMG1UGrL7puRXEqBCAHFQ");

#[program]
pub mod primary_market {
    use super::*;

    pub fn init_sale(ctx: Context<InitSale>, price: u64, total: u16) -> Result<()> {
        let sale = &mut ctx.accounts.sale;
        sale.authority = ctx.accounts.authority.key();
        sale.price = price;
        sale.total = total;
        sale.sold = 0;
        sale.active = true;
        sale.bump = ctx.bumps.sale;
        Ok(())
    }

    pub fn buy(ctx: Context<Buy>, amount: u16) -> Result<()> {
        let sale = &mut ctx.accounts.sale;
        require!(sale.active, Err::NotActive);
        require!(sale.sold + amount <= sale.total, Err::NotEnough);

        // Calcular costo total en USDC
        let total_cost = (sale.price as u128)
            .checked_mul(amount as u128)
            .ok_or(Err::Overflow)?;

        require!(total_cost <= u64::MAX as u128, Err::Overflow);
        let total_cost = total_cost as u64;

        // Transferir USDC del comprador al vendedor
        let cpi_accounts = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, total_cost)?;

        sale.sold += amount;
        if sale.sold >= sale.total {
            sale.active = false;
        }

        msg!("Sold {} tokens for {} USDC", amount, total_cost);
        Ok(())
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        // Establecer activo como falso y cerrar cuenta para recuperar renta
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitSale<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + 32 + 8 + 2 + 2 + 1 + 1, seeds = [b"sale"], bump)]
    pub sale: Account<'info, Sale>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub sale: Account<'info, Sale>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority, close = authority)]
    pub sale: Account<'info, Sale>,
}

#[account]
pub struct Sale {
    pub authority: Pubkey,
    pub price: u64,
    pub total: u16,
    pub sold: u16,
    pub active: bool,
    pub bump: u8,
}

#[error_code]
pub enum Err {
    #[msg("Venta no activa")]
    NotActive,
    #[msg("No hay suficientes tokens")]
    NotEnough,
    #[msg("Desbordamiento en el calculo")]
    Overflow,
}
