use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AoR4goYR4q6mR1X6gB51CX67EbgzGmSYd6eWPN4A4ddq");

const TOKENS_PER_TRAILER: u16 = 1000;
const TOKEN_PRICE: u64 = 200_000_000;
const PRIMARY_FEE_BPS: u16 = 300;
const PENALTY: u64 = 50_000_000;
const SECONDARY_FEE_BPS: u16 = 300;
const MIN_RESALE: u64 = 250_000_000;
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

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_usdc.to_account_info(),
                    to: ctx.accounts.seller_usdc.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            base_cost,
        )?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_usdc.to_account_info(),
                    to: ctx.accounts.platform_usdc.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
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

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_usdc.to_account_info(),
                    to: ctx.accounts.seller_usdc.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            seller_amount,
        )?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_usdc.to_account_info(),
                    to: ctx.accounts.platform_usdc.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
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

        let user_share = (ctx.accounts.pool.amount * user_tokens as u64) / TOKENS_PER_TRAILER as u64;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: ctx.accounts.pool_auth.to_account_info(),
                },
            ),
            user_share,
        )?;
        
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
    #[account(mut)]
    pub buyer_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub platform_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
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
    #[account(mut)]
    pub buyer_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub platform_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
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
    #[account(mut)]
    pub pool: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    /// CHECK: PDA
    pub pool_auth: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
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
    #[msg("Price too low, min $250")]
    PriceTooLow,
    #[msg("Wrong day, must be 20th")]
    WrongDay,
}
