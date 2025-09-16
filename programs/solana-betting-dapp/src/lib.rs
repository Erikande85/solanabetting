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
        claim_account.resolution = None;
        claim_account.category = category; // Assign category
        claim_account.subcategory = subcategory; // Assign subcategory
        claim_account.side_a_bettors = vec![ctx.accounts.creator.key()];
        claim_account.side_a_stakes = vec![stake];
        claim_account.side_b_bettors = vec![];
        claim_account.side_b_stakes = vec![];
        claim_account.side_a_odds = vec![1000]; // Creator gets 1:1 odds initially
        claim_account.side_b_odds = vec![];
        claim_account.side_a_total = stake;
        claim_account.side_b_total = 0;

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

    pub fn join_pool(ctx: Context<JoinPool>, side: Side, amount: u64) -> Result<()> {
        let claim_account = &mut ctx.accounts.claim_account;
        require!(claim_account.status == ClaimStatus::Open, ErrorCode::ClaimNotOpen);

        // Update bettors and stakes based on chosen side
        let current_total = claim_account.side_a_total + claim_account.side_b_total;
        let odds = if side == Side::A {
            if claim_account.side_a_total == 0 { 1000 } else { (current_total * 1000) / claim_account.side_a_total }
        } else {
            if claim_account.side_b_total == 0 { 1000 } else { (current_total * 1000) / claim_account.side_b_total }
        };

        if side == Side::A {
            claim_account.side_a_bettors.push(ctx.accounts.bettor.key());
            claim_account.side_a_stakes.push(amount);
            claim_account.side_a_odds.push(odds);
            claim_account.side_a_total += amount;
        } else {
            claim_account.side_b_bettors.push(ctx.accounts.bettor.key());
            claim_account.side_b_stakes.push(amount);
            claim_account.side_b_odds.push(odds);
            claim_account.side_b_total += amount;
        }

        let vault = if side == Side::A { ctx.accounts.side_a_vault.to_account_info() } else { ctx.accounts.side_b_vault.to_account_info() };
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.bettor.key(),
            &vault.key(),
            amount,
        );
        invoke(
            &transfer_ix,
            &[
                ctx.accounts.bettor.to_account_info(),
                vault,
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
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

    pub fn claim_payout(ctx: Context<ClaimPayout>, bettor_index: u32) -> Result<()> {
        let claim_account = &ctx.accounts.claim_account;
        require!(claim_account.status == ClaimStatus::Resolved, ErrorCode::NotResolved);
        let winner_side = claim_account.winner.unwrap();
        
        let (bettors, stakes, odds) = if winner_side == Side::A {
            (&claim_account.side_a_bettors, &claim_account.side_a_stakes, &claim_account.side_a_odds)
        } else {
            (&claim_account.side_b_bettors, &claim_account.side_b_stakes, &claim_account.side_b_odds)
        };
        
        require!(bettor_index < bettors.len() as u32, ErrorCode::InvalidIndex);
        require!(bettors[bettor_index as usize] == ctx.accounts.bettor.key(), ErrorCode::NotAuthorized);
        
        let bettor_stake = stakes[bettor_index as usize];
        let locked_odds = odds[bettor_index as usize];
        let payout = (bettor_stake as u128 * locked_odds as u128) / 1000; // Odds are *1000, so divide back
        let fee = (payout * 15) / 1000; // 1.5% fee
        let net_payout = payout - fee;
        
        // Transfer from vaults to bettor
        let vault = if winner_side == Side::A { &ctx.accounts.side_a_vault } else { &ctx.accounts.side_b_vault };
        **ctx.accounts.bettor.to_account_info().try_borrow_mut_lamports()? += net_payout;
        **vault.to_account_info().try_borrow_mut_lamports()? -= payout; // payout includes fee? Wait, fee to treasury
        
        // For simplicity, fee stays in vault or transfer to treasury
        // Assume treasury is passed
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
        space = 10000, // Increased for pool data
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
pub struct JoinPool<'info> {
    #[account(mut, seeds = [b"claim", claim_account.creator.as_ref(), claim_account.claim_text_hash.as_ref()], bump)]
    pub claim_account: Account<'info, ClaimAccount>,
    #[account(mut, address = claim_account.side_a_vault)]
    pub side_a_vault: SystemAccount<'info>,
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
pub struct ClaimPayout<'info> {
    #[account(mut, seeds = [b"claim", claim_account.creator.as_ref(), claim_account.claim_text_hash.as_ref()], bump)]
    pub claim_account: Account<'info, ClaimAccount>,
    #[account(mut, address = claim_account.side_a_vault)]
    pub side_a_vault: SystemAccount<'info>,
    #[account(mut, address = claim_account.side_b_vault)]
    pub side_b_vault: SystemAccount<'info>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    #[account(mut)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
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
    pub resolution: Option<ResolutionData>,
    pub category: String, // New field for category
    pub subcategory: String, // New field for subcategory
    pub side_a_bettors: Vec<Pubkey>,
    pub side_a_stakes: Vec<u64>,
    pub side_b_bettors: Vec<Pubkey>,
    pub side_b_stakes: Vec<u64>,
    pub side_a_odds: Vec<u64>, // Odds as (total / side_a_total) * 1000 for precision
    pub side_b_odds: Vec<u64>,
    pub side_a_total: u64,
    pub side_b_total: u64,
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
    #[msg("Invalid index")]
    InvalidIndex,
    #[msg("Not authorized")]
    NotAuthorized,
    #[msg("Payout already claimed")]
    PayoutAlreadyClaimed,
    #[msg("Invalid payout amount")]
    InvalidPayoutAmount,
}