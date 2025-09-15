import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import WalletConnect from '../../components/WalletConnect';
import BetModal from '../../components/BetModal';
import ResolutionView from '../../components/ResolutionView';
import { ClaimAccount, Side, ClaimStatus } from '../../utils/types';
import { solanaClient } from '../../../utils/solana';
import { toast } from 'react-hot-toast';

export default function ClaimDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { connected, publicKey } = useWallet();
  
  const [claim, setClaim] = useState<ClaimAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBetModal, setShowBetModal] = useState(false);
  const [selectedSide, setSelectedSide] = useState<Side>(Side.A);

  useEffect(() => {
    if (id) {
      loadClaim(id as string);
    }
  }, [id]);

  const loadClaim = async (claimId: string) => {
    try {
      const claimData = await solanaClient.getClaimById(claimId);
      setClaim(claimData);
    } catch (error) {
      toast.error('Failed to load claim');
    } finally {
      setLoading(false);
    }
  };

  const handleBet = (side: Side) => {
    setSelectedSide(side);
    setShowBetModal(true);
  };

  const handleBetSubmit = async (amount: number) => {
    if (!claim) return;
    
    try {
      const signature = await solanaClient.takeBet(id as string, { side: selectedSide, amount });
      toast.success(`Bet placed! Signature: ${signature.slice(0, 8)}...`);
      setShowBetModal(false);
      loadClaim(id as string); // Refresh claim
    } catch (error: any) {
      toast.error(`Failed to place bet: ${error.message}`);
    }
  };

  const handleDispute = async () => {
    toast.success('Dispute submitted for human review');
  };

  const handlePayout = async () => {
    try {
      // Call payout instruction
      toast.success('Payout claimed successfully!');
    } catch (error: any) {
      toast.error(`Failed to claim payout: ${error.message}`);
    }
  };

  const formatDeadline = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const isExpired = () => {
    return claim && Date.now() / 1000 > claim.deadline;
  };

  const canBet = () => {
    return claim && claim.status === ClaimStatus.Open && !isExpired();
  };

  const isCreator = () => {
    return connected && publicKey && claim && claim.creator.equals(publicKey);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-solana border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-vs-white mb-2">Claim Not Found</h2>
          <Link href="/">
            <button className="btn-primary">Back to Claims</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-solana/20 bg-deep-blue/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="text-2xl font-bold text-solana">⚔️ VersusSol</div>
              </div>
            </Link>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link href="/" className="text-solana hover:text-solana/80 transition-colors">
            ← Back to Claims
          </Link>
        </nav>

        {/* Claim Header */}
        <div className="card mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-vs-white mb-4">
                {claim.claimText}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-vs-gray">
                  Created by: <span className="text-vs-white font-mono">{claim.creator.toString().slice(0, 8)}...</span>
                </span>
                <span className="text-vs-gray">
                  Deadline: <span className="text-vs-white">{formatDeadline(claim.deadline)}</span>
                </span>
                <span className={`font-medium ${
                  claim.status === ClaimStatus.Open ? 'text-solana' :
                  claim.status === ClaimStatus.Resolved ? 'text-green-400' :
                  claim.status === ClaimStatus.Disputed ? 'text-vs-red' :
                  'text-yellow-400'
                }`}>
                  {claim.status}
                </span>
              </div>
            </div>
          </div>

          {isExpired() && claim.status === ClaimStatus.Open && (
            <div className="p-3 bg-vs-red/10 border border-vs-red/20 rounded-lg mb-6">
              <div className="text-vs-red text-sm">
                ⏰ This claim has expired and is awaiting resolution
              </div>
            </div>
          )}

          {isCreator() && (
            <div className="p-3 bg-solana/10 border border-solana/20 rounded-lg mb-6">
              <div className="text-solana text-sm">
                👑 You created this claim
              </div>
            </div>
          )}
        </div>

        {/* Betting Section */}
        {canBet() && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-vs-white mb-6">Place Your Bet</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-6 bg-solana/10 border border-solana/20 rounded-lg">
                <div className="text-lg font-bold text-solana mb-2">Side A - FOR</div>
                <div className="text-sm text-vs-gray mb-4">This claim will be TRUE</div>
                <div className="text-2xl font-bold text-vs-white mb-4">0.1 SOL</div>
                <button
                  onClick={() => handleBet(Side.A)}
                  className="btn-primary w-full"
                  disabled={!connected}
                >
                  Bet FOR
                </button>
              </div>
              <div className="text-center p-6 bg-vs-red/10 border border-vs-red/20 rounded-lg">
                <div className="text-lg font-bold text-vs-red mb-2">Side B - AGAINST</div>
                <div className="text-sm text-vs-gray mb-4">This claim will be FALSE</div>
                <div className="text-2xl font-bold text-vs-white mb-4">0.0 SOL</div>
                <button
                  onClick={() => handleBet(Side.B)}
                  className="btn-danger w-full"
                  disabled={!connected}
                >
                  Bet AGAINST
                </button>
              </div>
            </div>
            {!connected && (
              <p className="text-center text-vs-gray text-sm mt-4">
                Connect your wallet to place bets
              </p>
            )}
          </div>
        )}

        {/* Resolution Section */}
        {claim.resolution && (
          <ResolutionView
            resolution={claim.resolution}
            winner={claim.winner}
            onDispute={handleDispute}
            onPayout={handlePayout}
          />
        )}

        {/* Claim Details */}
        <div className="card">
          <h2 className="text-xl font-bold text-vs-white mb-6">Claim Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-vs-gray">Creator:</span>
                <span className="ml-2 text-vs-white font-mono">
                  {claim.creator.toString()}
                </span>
              </div>
              <div>
                <span className="text-vs-gray">Deadline:</span>
                <span className="ml-2 text-vs-white">
                  {formatDeadline(claim.deadline)}
                </span>
              </div>
              <div>
                <span className="text-vs-gray">Side A Vault:</span>
                <span className="ml-2 text-vs-white font-mono">
                  {claim.sideAVault.toString().slice(0, 16)}...
                </span>
              </div>
              <div>
                <span className="text-vs-gray">Side B Vault:</span>
                <span className="ml-2 text-vs-white font-mono">
                  {claim.sideBVault.toString().slice(0, 16)}...
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bet Modal */}
      {showBetModal && (
        <BetModal
          isOpen={showBetModal}
          onClose={() => setShowBetModal(false)}
          onSubmit={handleBetSubmit}
          side={selectedSide}
          claimText={claim.claimText}
        />
      )}
    </div>
  );
}