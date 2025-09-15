import { PublicKey } from '@solana/web3.js';

export interface ClaimAccount {
  creator: PublicKey;
  claimTextHash: number[];
  deadline: number;
  stakeToken: PublicKey;
  sideAVault: PublicKey;
  sideBVault: PublicKey;
  status: ClaimStatus;
  winner: Side | null;
  bettor: PublicKey | null;
  resolution: ResolutionData | null;
  claimText: string;
}

export enum ClaimStatus {
  Open = 'Open',
  Locked = 'Locked',
  Resolving = 'Resolving',
  Resolved = 'Resolved',
  Disputed = 'Disputed',
}

export enum Side {
  A = 'A',
  B = 'B',
}

export interface ResolutionData {
  verdict: boolean;
  confidence: number;
  method: ResolutionMethod;
  resolver: PublicKey;
  timestamp: number;
}

export enum ResolutionMethod {
  AI = 'AI',
  Human = 'Human',
}

export interface ClaimFormData {
  claimText: string;
  deadline: string;
  stake: number;
  mint: 'SOL' | 'USDC';
}

export interface BetData {
  side: Side;
  amount: number;
}

export interface N8NResponse {
  verdict: boolean;
  confidence: number;
  evidence_cid?: string;
  reason?: string;
}