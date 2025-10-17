use anchor_lang::prelude::*;

declare_id!("SECNdNgfnX8e4Qb1XAJ7H5YphWE87XKmWrk3nkzD8Vz");

#[program]
pub mod secondary_market {
    use super::*;

    pub fn list(ctx: Context<List>, price: u64, amount: u16) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.price = price;
        listing.amount = amount;
        listing.active = true;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    pub fn buy(ctx: Context<Buy>, amount: u16) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.active, ErrorCode::NotActive);
        require!(amount <= listing.amount, ErrorCode::NotEnough);
        listing.amount -= amount;
        if listing.amount == 0 {
            listing.active = false;
        }
        Ok(())
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        ctx.accounts.listing.active = false;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct List<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(init, payer = seller, space = 8 + 32 + 8 + 2 + 1 + 1, seeds = [b"list"], bump)]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub listing: Account<'info, Listing>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    pub seller: Signer<'info>,
    #[account(mut, has_one = seller)]
    pub listing: Account<'info, Listing>,
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
    #[msg("No activo")]
    NotActive,
    #[msg("No suficiente")]
    NotEnough,
}
