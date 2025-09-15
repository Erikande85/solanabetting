import { ClaimAccount, Side, ClaimStatus } from '../utils/types';
import { useState } from 'react';
import BetModal from './BetModal';

interface ClaimCardProps {
  claim: ClaimAccount;
  onBet?: (claimId: string, side: Side, amount: number) => void;
}

export default function ClaimCard({ claim, onBet }: ClaimCardProps) {
  const [showBetModal, setShowBetModal] = useState(false);
  const [selectedSide, setSelectedSide] = useState<Side>(Side.A);

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.Open:
        return 'text-solana';
      case ClaimStatus.Locked:
        return 'text-yellow-400';
      case ClaimStatus.Resolving:
        return 'text-blue-400';
      case ClaimStatus.Resolved:
        return 'text-green-400';
      case ClaimStatus.Disputed:
        return 'text-vs-red';
      default:
        return 'text-vs-gray';
    }
  };

  const formatDeadline = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = () => {
    return Date.now() / 1000 > claim.deadline;
  };

  const canBet = () => {
    return claim.status === ClaimStatus.Open && !isExpired();
  };

  const handleBetClick = (side: Side) => {
    setSelectedSide(side);
    setShowBetModal(true);
  };

  const handleBetSubmit = (amount: number) => {
    if (onBet) {
      onBet('claim-id', selectedSide, amount);
    }
    setShowBetModal(false);
  };

  const calculateOdds = (sideTotal: number, oppositeTotal: number) => {
    const total = sideTotal + oppositeTotal;
    if (total === 0) return 'N/A';
    return (total / sideTotal).toFixed(2);
  };

  const sideATotal = claim.sideATotal / 1e9; // Convert lamports to SOL
  const sideBTotal = claim.sideBTotal / 1e9;
  const oddsA = calculateOdds(claim.sideATotal, claim.sideBTotal);
  const oddsB = calculateOdds(claim.sideBTotal, claim.sideATotal);

  return (
    <>
      <div className="card hover:solana-glow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-vs-white mb-2 line-clamp-2">
              {claim.claimText}
            </h3>
            <div className="flex items-center gap-4 text-sm text-vs-gray">
              <span>By {claim.creator.toString().slice(0, 8)}...</span>
              <span className={getStatusColor(claim.status)}>
                {claim.status}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-vs-gray">Deadline:</span>
            <span className={`font-medium ${isExpired() ? 'text-vs-red' : 'text-vs-white'}`}>
              {formatDeadline(claim.deadline)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs text-vs-gray mb-1">Side A (For)</div>
              <div className="text-lg font-bold text-solana">{sideATotal.toFixed(2)} SOL</div>
              <div className="text-xs text-vs-gray">Odds: {oddsA}</div>
              <div className="text-xs text-vs-gray">Bettors: {claim.sideABettors.length}</div>
              {canBet() && (
                <button
                  onClick={() => handleBetClick(Side.A)}
                  className="btn-primary w-full mt-2 py-2 text-sm"
                >
                  Bet For
                </button>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-vs-gray mb-1">Side B (Against)</div>
              <div className="text-lg font-bold text-vs-red">{sideBTotal.toFixed(2)} SOL</div>
              <div className="text-xs text-vs-gray">Odds: {oddsB}</div>
              <div className="text-xs text-vs-gray">Bettors: {claim.sideBBettors.length}</div>
              {canBet() && (
                <button
                  onClick={() => handleBetClick(Side.B)}
                  className="btn-danger w-full mt-2 py-2 text-sm"
                >
                  Bet Against
                </button>
              )}
            </div>
          </div>

          {claim.resolution && (
            <div className="mt-4 p-3 bg-deep-blue/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-vs-gray">Resolution:</span>
                <span className={`font-medium ${claim.resolution.verdict ? 'text-solana' : 'text-vs-red'}`}>
                  {claim.resolution.verdict ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-vs-gray">Confidence:</span>
                <span className="font-medium text-vs-white">
                  {claim.resolution.confidence}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showBetModal && (
        <BetModal
          isOpen={showBetModal}
          onClose={() => setShowBetModal(false)}
          onSubmit={handleBetSubmit}
          side={selectedSide}
          claimText={claim.claimText}
        />
      )}
    </>
  );
}