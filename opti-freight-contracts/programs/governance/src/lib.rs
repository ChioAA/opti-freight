use anchor_lang::prelude::*;

declare_id!("GOVERNcaWJxH5YM3p8k6mwUhY7LzASwYxNzmgXzD4z");

#[program]
pub mod governance {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("Governance initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
