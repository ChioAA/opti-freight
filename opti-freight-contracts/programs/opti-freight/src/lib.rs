use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga");

const TOKENS_PER_TRAILER: u16 = 1000;
const TOKEN_PRICE: u64 = 120_000_000; // 0.12 SOL en lamports - PARA PRUEBAS
const PRIMARY_FEE_BPS: u16 = 300; // 3%
const PENALTY: u64 = 25_000_000; // 0.025 SOL en lamports - PARA PRUEBAS
const SECONDARY_FEE_BPS: u16 = 300; // 3%
const MIN_RESALE: u64 = 145_000_000; // 0.145 SOL mínimo para reventa - PARA PRUEBAS
const DISTRIBUTION_DAY: u8 = 20;

#[program]
pub mod opti_freight {
    use super::*;

    pub fn init_sale(ctx: Context<InitSale>) -> Result<()> {
        let sale = &mut ctx.accounts.sale;
        sale.authority = ctx.accounts.authority.key();
        sale.total = TOKENS_PER_TRAILER;
        sale.sold = 0;
        sale.active = true;
        sale.bump = ctx.bumps.sale;
        Ok(())
    }

    pub fn buy_primary(ctx: Context<BuyPrimary>, amount: u16) -> Result<()> {
        let sale = &mut ctx.accounts.sale;
        require!(sale.active, ErrorCode::NotActive);
        require!(sale.sold + amount <= sale.total, ErrorCode::SoldOut);

        let base_cost = TOKEN_PRICE * amount as u64;
        let fee = (base_cost * PRIMARY_FEE_BPS as u64) / 10000;

        // Transferir SOL al vendedor
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            base_cost,
        )?;

        // Transferir comisión a la plataforma
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.platform.to_account_info(),
                },
            ),
            fee,
        )?;

        sale.sold += amount;
        if sale.sold >= sale.total {
            sale.active = false;
        }

        Ok(())
    }

    pub fn close_sale(_ctx: Context<CloseSale>) -> Result<()> {
        Ok(())
    }

    pub fn create_listing(ctx: Context<CreateListing>, price: u64, amount: u16) -> Result<()> {
        require!(price >= MIN_RESALE, ErrorCode::PriceTooLow);
        
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.price = price;
        listing.amount = amount;
        listing.active = true;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    pub fn buy_secondary(ctx: Context<BuySecondary>, amount: u16) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.active, ErrorCode::NotActive);
        require!(amount <= listing.amount, ErrorCode::SoldOut);

        let price_per_token = listing.price;
        let subtotal = price_per_token * amount as u64;
        let market_fee = (subtotal * SECONDARY_FEE_BPS as u64) / 10000;
        let penalty_total = PENALTY * amount as u64;
        let seller_amount = subtotal - penalty_total;
        let platform_total = penalty_total + market_fee;

        // Transferir SOL al vendedor
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            seller_amount,
        )?;

        // Transferir comisión y penalización a la plataforma
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.platform.to_account_info(),
                },
            ),
            platform_total,
        )?;

        listing.amount -= amount;
        if listing.amount == 0 {
            listing.active = false;
        }

        Ok(())
    }

    pub fn cancel_listing(_ctx: Context<CancelListing>) -> Result<()> {
        Ok(())
    }

    pub fn distribute_monthly(ctx: Context<DistributeMonthly>, user_tokens: u16) -> Result<()> {
        let clock = Clock::get()?;
        let day = ((clock.unix_timestamp / 86400) % 30) as u8;

        require!(day == DISTRIBUTION_DAY, ErrorCode::WrongDay);

        let pool_balance = ctx.accounts.pool.lamports();
        let user_share = (pool_balance * user_tokens as u64) / TOKENS_PER_TRAILER as u64;

        // Transferir SOL del pool al usuario
        **ctx.accounts.pool.try_borrow_mut_lamports()? -= user_share;
        **ctx.accounts.user.try_borrow_mut_lamports()? += user_share;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitSale<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + 32 + 2 + 2 + 1 + 1, seeds = [b"sale", authority.key().as_ref()], bump)]
    pub sale: Account<'info, Sale>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyPrimary<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub sale: Account<'info, Sale>,
    /// CHECK: Recibe SOL
    #[account(mut)]
    pub seller: AccountInfo<'info>,
    /// CHECK: Recibe comisión en SOL
    #[account(mut)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseSale<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority, close = authority)]
    pub sale: Account<'info, Sale>,
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(init, payer = seller, space = 8 + 32 + 8 + 2 + 1 + 1, seeds = [b"listing", seller.key().as_ref()], bump)]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuySecondary<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub listing: Account<'info, Listing>,
    /// CHECK: Recibe SOL
    #[account(mut)]
    pub seller: AccountInfo<'info>,
    /// CHECK: Recibe comisión y penalización en SOL
    #[account(mut)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(mut, has_one = seller, close = seller)]
    pub listing: Account<'info, Listing>,
}

#[derive(Accounts)]
pub struct DistributeMonthly<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Pool de SOL
    #[account(mut)]
    pub pool: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Sale {
    pub authority: Pubkey,
    pub total: u16,
    pub sold: u16,
    pub active: bool,
    pub bump: u8,
}

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub price: u64,
    pub amount: u16,
    pub active: bool,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Not active")]
    NotActive,
    #[msg("Sold out")]
    SoldOut,
    #[msg("Price too low, min 1.45 SOL")]
    PriceTooLow,
    #[msg("Wrong day, must be 20th")]
    WrongDay,
}
