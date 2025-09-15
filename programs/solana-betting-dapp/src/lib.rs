use anchor_lang::prelude::*;
use solana_program::hash;

declare_id!("Bdb3u2HsT8FSVanNXrpLWvBxxYXrvLebWki2NqeBcgYT");

#[program]
mod solana_betting_dapp {
    use super::*;

    pub fn create_claim(
        ctx: Context<CreateClaim>,
        claim_text: String,
        deadline: i64,
        stake: u64,
        category: String, // New parameter
        subcategory: String, // New parameter
    ) -> Result<()> {
        let _claim_hash = hash::hash(claim_text.as_bytes()).to_bytes();
        let claim_account = &mut ctx.accounts.claim_account;
        claim_account.creator = ctx.accounts.creator.key();
        claim_account.claim_text_hash = _claim_hash;
        claim_account.deadline = deadline;
        claim_account.stake_token = ctx.accounts.system_program.key();
        claim_account.side_a_vault = ctx.accounts.side_a_vault.key();
        claim_account.side_b_vault = ctx.accounts.side_b_vault.key();
        claim_account.status = ClaimStatus::Open;
        claim_account.winner = None;
        claim_account.bettor = None;
        claim_account.resolution = None;
        claim_account.category = category; // Assign category
        claim_account.subcategory = subcategory; // Assign subcategory

        // Transfer stake to side_a_vault
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.creator.key(),
            &ctx.accounts.side_a_vault.key(),
            stake,
        );
        invoke(
            &transfer_ix,
            &[
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.side_a_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }

    pub fn take_bet(ctx: Context<TakeBet>, amount: u64) -> Result<()> {
        let claim_account = &mut ctx.accounts.claim_account;
        require!(claim_account.status == ClaimStatus::Open, ErrorCode::ClaimNotOpen);
        claim_account.bettor = Some(ctx.accounts.bettor.key());

        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.bettor.key(),
            &claim_account.side_b_vault,
            amount,
        );
        invoke(
            &transfer_ix,
            &[
                ctx.accounts.bettor.to_account_info(),
                ctx.accounts.side_b_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        claim_account.status = ClaimStatus::Locked;
        Ok(())
    }

    pub fn resolve_ai(ctx: Context<ResolveAI>, verdict: bool, confidence: u8) -> Result<()> {
        let claim_account = &mut ctx.accounts.claim_account;
        require!(matches!(claim_account.status, ClaimStatus::Locked | ClaimStatus::Resolving), ErrorCode::InvalidStatus);

        if confidence >= 85 {
            claim_account.status = ClaimStatus::Resolved;
            claim_account.winner = Some(if verdict { Side::A } else { Side::B });
            claim_account.resolution = Some(ResolutionData {
                verdict,
                confidence,
                method: ResolutionMethod::AI,
                resolver: ctx.accounts.resolver.key(),
                timestamp: Clock::get()?.unix_timestamp,
            });
        } else {
            claim_account.status = ClaimStatus::Disputed;
        }
        Ok(())
    }

    pub fn resolve_human(ctx: Context<ResolveHuman>, verdict: bool) -> Result<()> {
        let claim_account = &mut ctx.accounts.claim_account;
        require!(claim_account.status == ClaimStatus::Disputed, ErrorCode::InvalidStatus);
        // Assume arbiter is checked in accounts
        claim_account.status = ClaimStatus::Resolved;
        claim_account.winner = Some(if verdict { Side::A } else { Side::B });
        claim_account.resolution = Some(ResolutionData {
            verdict,
            confidence: 100, // Human is 100%
            method: ResolutionMethod::Human,
            resolver: ctx.accounts.arbiter.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn payout(ctx: Context<Payout>) -> Result<()> {
        let claim_account = &ctx.accounts.claim_account;
        require!(claim_account.status == ClaimStatus::Resolved, ErrorCode::NotResolved);
        let winner_side = claim_account.winner.unwrap();
        let winner_pubkey = if winner_side == Side::A {
            claim_account.creator
        } else {
            claim_account.bettor.unwrap()
        };

        let total_a = ctx.accounts.side_a_vault.lamports();
        let total_b = ctx.accounts.side_b_vault.lamports();
        let total = total_a + total_b;
        let fee = total * 15 / 1000; // 1.5%
        let payout_amount = total - fee;

        // Transfer payout to winner
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += payout_amount;
        **ctx.accounts.side_a_vault.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.side_b_vault.to_account_info().try_borrow_mut_lamports()? = 0;

        // Fee to treasury (placeholder, transfer to some account)
        // For now, assume treasury is passed
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(claim_text: String)]
pub struct CreateClaim<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 32 + 8 + 32 + 32 + 32 + 1 + (1 + 1) + (1 + 32) + (1 + 200), // approx
        seeds = [b"claim", creator.key().as_ref(), &hash::hash(claim_text.as_bytes()).to_bytes()],
        bump
    )]
    pub claim_account: Account<'info, ClaimAccount>,
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [b"vault", claim_account.key().as_ref(), b"A"],
        bump
    )]
    pub side_a_vault: SystemAccount<'info>,
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [b"vault", claim_account.key().as_ref(), b"B"],
        bump
    )]
    pub side_b_vault: SystemAccount<'info>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TakeBet<'info> {
    #[account(mut, seeds = [b"claim", claim_account.creator.as_ref(), claim_account.claim_text_hash.as_ref()], bump)]
    pub claim_account: Account<'info, ClaimAccount>,
    #[account(mut, address = claim_account.side_b_vault)]
    pub side_b_vault: SystemAccount<'info>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveAI<'info> {
    #[account(mut, seeds = [b"claim", claim_account.creator.as_ref(), claim_account.claim_text_hash.as_ref()], bump)]
    pub claim_account: Account<'info, ClaimAccount>,
    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveHuman<'info> {
    #[account(mut, seeds = [b"claim", claim_account.creator.as_ref(), claim_account.claim_text_hash.as_ref()], bump)]
    pub claim_account: Account<'info, ClaimAccount>,
    pub arbiter: Signer<'info>,
    // Add arbiter registry check if needed
}

#[derive(Accounts)]
pub struct Payout<'info> {
    #[account(seeds = [b"claim", claim_account.creator.as_ref(), claim_account.claim_text_hash.as_ref()], bump)]
    pub claim_account: Account<'info, ClaimAccount>,
    #[account(mut, address = claim_account.side_a_vault)]
    pub side_a_vault: SystemAccount<'info>,
    #[account(mut, address = claim_account.side_b_vault)]
    pub side_b_vault: SystemAccount<'info>,
    #[account(mut, address = if claim_account.winner.unwrap() == Side::A { claim_account.creator } else { claim_account.bettor.unwrap() })]
    pub winner: SystemAccount<'info>,
    #[account(mut)]
    pub treasury: SystemAccount<'info>, // Placeholder
}

#[account]
pub struct ClaimAccount {
    pub creator: Pubkey,
    pub claim_text_hash: [u8; 32],
    pub deadline: i64,
    pub stake_token: Pubkey,
    pub side_a_vault: Pubkey,
    pub side_b_vault: Pubkey,
    pub status: ClaimStatus,
    pub winner: Option<Side>,
    pub bettor: Option<Pubkey>,
    pub resolution: Option<ResolutionData>,
    pub category: String, // New field for category
    pub subcategory: String, // New field for subcategory
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ClaimStatus {
    Open,
    Locked,
    Resolving,
    Resolved,
    Disputed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum Side {
    A,
    B,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ResolutionData {
    pub verdict: bool,
    pub confidence: u8,
    pub method: ResolutionMethod,
    pub resolver: Pubkey,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ResolutionMethod {
    AI,
    Human,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Claim is not open")]
    ClaimNotOpen,
    #[msg("Invalid status")]
    InvalidStatus,
    #[msg("Low confidence")]
    LowConfidence,
    #[msg("Invalid signature")]
    InvalidSignature,
    #[msg("Not resolved")]
    NotResolved,
    #[msg("Arbiter not registered")]
    ArbiterNotRegistered,
}