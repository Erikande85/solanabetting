import { Connection, PublicKey, Keypair, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { ClaimAccount, ClaimFormData, BetData, Side } from '../src/utils/types';

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || 'Bdb3u2HsT8FSVanNXrpLWvBxxYXrvLebWki2NqeBcgYT');
export const RPC_URL = process.env.NEXT_PUBLIC_RPC || 'https://api.devnet.solana.com';

export class SolanaClient {
  private connection: Connection;
  private provider: AnchorProvider | null = null;
  private program: Program | null = null;

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
  }

  setProvider(provider: AnchorProvider) {
    this.provider = provider;
    // For now, we'll use direct instruction calls since we have a native program
  }

  async createClaim(formData: ClaimFormData): Promise<string> {
    if (!this.provider) throw new Error('Wallet not connected');

    const wallet = this.provider.wallet;
    const claimText = formData.claimText;
    const deadline = new Date(formData.deadline).getTime() / 1000;
    const stake = formData.stake * 1e9; // Convert to lamports

    // Create instruction data
    const instructionData = Buffer.alloc(1 + 4 + claimText.length + 8 + 8);
    let offset = 0;
    
    // Instruction discriminator (0 = create_claim)
    instructionData.writeUInt8(0, offset);
    offset += 1;
    
    // Claim text length and content
    instructionData.writeUInt32LE(claimText.length, offset);
    offset += 4;
    instructionData.write(claimText, offset);
    offset += claimText.length;
    
    // Deadline
    instructionData.writeBigUInt64LE(BigInt(deadline), offset);
    offset += 8;
    
    // Stake
    instructionData.writeBigUInt64LE(BigInt(stake), offset);

    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: instructionData,
      })
    );

    const signature = await this.provider.sendAndConfirm(transaction);
    return signature;
  }

  async takeBet(claimId: string, betData: BetData): Promise<string> {
    if (!this.provider) throw new Error('Wallet not connected');

    const wallet = this.provider.wallet;
    const amount = betData.amount * 1e9; // Convert to lamports

    // Create instruction data
    const instructionData = Buffer.alloc(1 + 8);
    instructionData.writeUInt8(1, 0); // take_bet instruction
    instructionData.writeBigUInt64LE(BigInt(amount), 1);

    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: instructionData,
      })
    );

    const signature = await this.provider.sendAndConfirm(transaction);
    return signature;
  }

  async getClaims(): Promise<ClaimAccount[]> {
    // For now, return mock data since we need to implement proper account fetching
    return [
      {
        creator: new PublicKey('11111111111111111111111111111111'),
        claimTextHash: Array(32).fill(0),
        deadline: Date.now() / 1000 + 86400, // Tomorrow
        stakeToken: SystemProgram.programId,
        sideAVault: new PublicKey('11111111111111111111111111111111'),
        sideBVault: new PublicKey('11111111111111111111111111111111'),
        status: 'Open' as any,
        winner: null,
        bettor: null,
        resolution: null,
        claimText: 'BTC will be above $70,000 by Sept 16, 2025',
      }
    ];
  }

  async getClaimById(id: string): Promise<ClaimAccount | null> {
    const claims = await this.getClaims();
    return claims[0] || null; // Return first claim for demo
  }
}

export const solanaClient = new SolanaClient();