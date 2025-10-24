use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

declare_id!("2ESjYkkwqZYBkAA6gBprX9xaRhqgPVyMyZLkGVAq7YtU");

#[program]
pub mod asset_nft {
    use super::*;

    pub fn create_trailer_nft(
        ctx: Context<CreateTrailerNFT>,
        name: String,
        symbol: String,
        uri: String,
        series: String,
        total_value: u64,
        token_price: u64,
        total_tokens: u16,
        apy: u16,
        term_years: u8,
    ) -> Result<()> {
        let trailer_asset = &mut ctx.accounts.trailer_asset;
        let clock = Clock::get()?;

        trailer_asset.authority = ctx.accounts.authority.key();
        trailer_asset.mint = ctx.accounts.mint.key();
        trailer_asset.name = name.clone();
        trailer_asset.symbol = symbol;
        trailer_asset.uri = uri;
        trailer_asset.series = series;
        trailer_asset.total_value = total_value;
        trailer_asset.token_price = token_price;
        trailer_asset.total_tokens = total_tokens;
        trailer_asset.tokens_sold = 0;
        trailer_asset.apy = apy;
        trailer_asset.term_years = term_years;
        trailer_asset.is_locked = false;
        trailer_asset.created_at = clock.unix_timestamp;
        trailer_asset.expiry_at = clock.unix_timestamp + (term_years as i64 * 365 * 24 * 60 * 60);
        trailer_asset.bump = ctx.bumps.trailer_asset;

        msg!("Trailer NFT created: {}", name);
        Ok(())
    }

    pub fn update_metadata(
        ctx: Context<UpdateMetadata>,
        new_uri: String,
    ) -> Result<()> {
        let trailer_asset = &mut ctx.accounts.trailer_asset;
        trailer_asset.uri = new_uri;
        msg!("Metadata updated for trailer: {}", trailer_asset.name);
        Ok(())
    }

    pub fn set_lock_status(
        ctx: Context<SetLockStatus>,
        is_locked: bool,
    ) -> Result<()> {
        let trailer_asset = &mut ctx.accounts.trailer_asset;
        trailer_asset.is_locked = is_locked;
        msg!("Lock status updated for trailer: {} - Locked: {}", trailer_asset.name, is_locked);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateTrailerNFT<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + TrailerAsset::INIT_SPACE,
        seeds = [b"trailer", mint.key().as_ref()],
        bump
    )]
    pub trailer_asset: Account<'info, TrailerAsset>,

    /// CHECK: Esta es la cuenta mint que sera creada externamente
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"trailer", trailer_asset.mint.as_ref()],
        bump = trailer_asset.bump,
        has_one = authority
    )]
    pub trailer_asset: Account<'info, TrailerAsset>,
}

#[derive(Accounts)]
pub struct SetLockStatus<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"trailer", trailer_asset.mint.as_ref()],
        bump = trailer_asset.bump,
        has_one = authority
    )]
    pub trailer_asset: Account<'info, TrailerAsset>,
}

#[account]
#[derive(InitSpace)]
pub struct TrailerAsset {
    pub authority: Pubkey,
    pub mint: Pubkey,
    #[max_len(50)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    #[max_len(200)]
    pub uri: String,
    #[max_len(50)]
    pub series: String,
    pub total_value: u64,
    pub token_price: u64,
    pub total_tokens: u16,
    pub tokens_sold: u16,
    pub apy: u16,
    pub term_years: u8,
    pub is_locked: bool,
    pub created_at: i64,
    pub expiry_at: i64,
    pub bump: u8,
}
