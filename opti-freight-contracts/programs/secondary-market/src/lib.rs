use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("DakwaYqG3tV9Jjgy5GokyQJd3JWb74Qx66JHqbZicsZX");

// Precio mínimo calculado: (Costo 0.12 + Penalización 0.025) / (1 - 0.03 fee) ≈ 0.1495 SOL
const MINIMUM_PRICE: u64 = 149_500_000; // ~0.1495 SOL en lamports
const MARKETPLACE_FEE_BPS: u64 = 300; // 3% = 300 basis points
const EARLY_SALE_PENALTY: u64 = 25_000_000; // 0.025 SOL en lamports
const TERM_YEARS: i64 = 5; // 5 años de vigencia
const SECONDS_PER_YEAR: i64 = 365 * 24 * 60 * 60;

#[program]
pub mod secondary_market {
    use super::*;

    /// Crea un listing de NFT para reventa
    /// El vendedor transfiere el NFT a un escrow (PDA) hasta que se venda
    pub fn list(ctx: Context<List>, price: u64, purchase_date: i64) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        let seller_token_account = &ctx.accounts.seller_token_account;

        // Validar precio mínimo
        require!(price >= MINIMUM_PRICE, ErrorCode::PriceTooLow);

        // Validar que el vendedor posea el NFT (balance = 1)
        require!(seller_token_account.amount == 1, ErrorCode::NFTNotOwned);

        // Validar que el token account pertenece al vendedor
        require!(seller_token_account.owner == ctx.accounts.seller.key(), ErrorCode::InvalidOwner);

        // PASO 1: Transferir NFT del vendedor al escrow PDA
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, 1)?;

        // PASO 2: Guardar datos del listing
        listing.seller = ctx.accounts.seller.key();
        listing.nft_mint = ctx.accounts.nft_mint.key();
        listing.price = price;
        listing.purchase_date = purchase_date;
        listing.listed_at = Clock::get()?.unix_timestamp;
        listing.active = true;
        listing.bump = ctx.bumps.listing;

        msg!("Listing creado - NFT transferido a escrow: {}, Precio: {} lamports", listing.nft_mint, price);

        Ok(())
    }

    /// Compra un NFT del mercado secundario
    /// Transferencia atómica: NFT al comprador, SOL al vendedor (menos fees)
    pub fn buy(ctx: Context<Buy>) -> Result<()> {
        let listing = &ctx.accounts.listing;

        // Validar que el listing esté activo
        require!(listing.active, ErrorCode::NotActive);

        // Validar que el NFT esté en el escrow
        require!(ctx.accounts.escrow_token_account.amount == 1, ErrorCode::NFTNotOwned);

        let price = listing.price;
        let current_time = Clock::get()?.unix_timestamp;
        let time_held = current_time - listing.purchase_date;
        let term_seconds = TERM_YEARS * SECONDS_PER_YEAR;

        // Calcular penalización si vende antes del término
        let penalty = if time_held < term_seconds {
            EARLY_SALE_PENALTY
        } else {
            0
        };

        // Calcular comisión del marketplace (3% sobre precio - penalización)
        let price_after_penalty = price.checked_sub(penalty).ok_or(ErrorCode::ArithmeticError)?;
        let marketplace_fee = price_after_penalty
            .checked_mul(MARKETPLACE_FEE_BPS).ok_or(ErrorCode::ArithmeticError)?
            .checked_div(10000).ok_or(ErrorCode::ArithmeticError)?;

        // Calcular lo que recibe el vendedor
        let seller_proceeds = price_after_penalty
            .checked_sub(marketplace_fee).ok_or(ErrorCode::ArithmeticError)?;

        msg!("Precio: {} lamports", price);
        msg!("Penalización: {} lamports", penalty);
        msg!("Comisión marketplace: {} lamports", marketplace_fee);
        msg!("Vendedor recibe: {} lamports", seller_proceeds);

        // PASO 1: Transferir SOL del comprador al vendedor
        let transfer_to_seller_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.seller.key(),
            seller_proceeds,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_to_seller_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.seller.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // PASO 2: Transferir comisión a la plataforma
        let transfer_fee_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.platform_wallet.key(),
            marketplace_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_fee_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.platform_wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // PASO 3: Transferir NFT del escrow al comprador usando el PDA como autoridad
        let listing_key = listing.key();
        let nft_mint_key = listing.nft_mint.key();
        let seeds = &[
            b"listing",
            listing.seller.as_ref(),
            nft_mint_key.as_ref(),
            &[listing.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, 1)?;

        msg!("NFT transferido exitosamente del escrow a {}",
            ctx.accounts.buyer.key()
        );

        // PASO 4: Marcar listing como inactivo
        let listing_mut = &mut ctx.accounts.listing;
        listing_mut.active = false;

        Ok(())
    }

    /// Cancela un listing activo y devuelve el NFT al vendedor
    /// Solo el vendedor puede cancelar su propio listing
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        // Validar que esté activo
        require!(ctx.accounts.listing.active, ErrorCode::NotActive);

        // PASO 1: Devolver NFT del escrow al vendedor
        let listing = &ctx.accounts.listing;
        let nft_mint_key = listing.nft_mint.key();
        let seeds = &[
            b"listing",
            listing.seller.as_ref(),
            nft_mint_key.as_ref(),
            &[listing.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, 1)?;

        msg!("NFT devuelto al vendedor desde escrow");

        // PASO 2: Marcar listing como inactivo
        let listing_mut = &mut ctx.accounts.listing;
        listing_mut.active = false;

        msg!("Listing cancelado - NFT: {}", listing_mut.nft_mint);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(price: u64, purchase_date: i64)]
pub struct List<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    /// NFT mint address
    pub nft_mint: Account<'info, token::Mint>,

    /// Token account del vendedor que contiene el NFT
    #[account(
        mut,
        constraint = seller_token_account.mint == nft_mint.key(),
        constraint = seller_token_account.owner == seller.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// PDA del listing - único por NFT y vendedor
    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", seller.key().as_ref(), nft_mint.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,

    /// Token account del escrow (PDA) que guardará el NFT
    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = nft_mint,
        associated_token::authority = listing
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: El vendedor es validado por el listing
    #[account(mut)]
    pub seller: AccountInfo<'info>,

    /// Listing PDA
    #[account(
        mut,
        seeds = [b"listing", listing.seller.as_ref(), listing.nft_mint.as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,

    /// NFT mint
    pub nft_mint: Account<'info, token::Mint>,

    /// Token account del escrow (donde está el NFT actualmente)
    #[account(
        mut,
        constraint = escrow_token_account.mint == nft_mint.key(),
        constraint = escrow_token_account.owner == listing.key()
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Token account del comprador (donde irá el NFT)
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// CHECK: Wallet de la plataforma que recibe fees
    #[account(mut)]
    pub platform_wallet: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        has_one = seller,
        seeds = [b"listing", seller.key().as_ref(), listing.nft_mint.as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,

    /// NFT mint
    pub nft_mint: Account<'info, token::Mint>,

    /// Token account del escrow
    #[account(
        mut,
        constraint = escrow_token_account.mint == nft_mint.key(),
        constraint = escrow_token_account.owner == listing.key()
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Token account del vendedor (a donde va el NFT)
    #[account(
        mut,
        constraint = seller_token_account.mint == nft_mint.key(),
        constraint = seller_token_account.owner == seller.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Listing {
    /// Wallet del vendedor
    pub seller: Pubkey,           // 32 bytes
    /// Mint address del NFT
    pub nft_mint: Pubkey,          // 32 bytes
    /// Precio de venta en lamports
    pub price: u64,                // 8 bytes
    /// Fecha de compra original (unix timestamp)
    pub purchase_date: i64,        // 8 bytes
    /// Fecha en que se creó el listing (unix timestamp)
    pub listed_at: i64,            // 8 bytes
    /// Si el listing está activo
    pub active: bool,              // 1 byte
    /// Bump seed del PDA
    pub bump: u8,                  // 1 byte
}

impl Listing {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 8 + 1 + 1; // 90 bytes
}

#[error_code]
pub enum ErrorCode {
    #[msg("Listing no está activo")]
    NotActive,
    #[msg("Cantidad insuficiente")]
    NotEnough,
    #[msg("Precio demasiado bajo - mínimo 0.15 SOL")]
    PriceTooLow,
    #[msg("El vendedor no posee este NFT")]
    NFTNotOwned,
    #[msg("Owner inválido del token account")]
    InvalidOwner,
    #[msg("Error aritmético")]
    ArithmeticError,
}
