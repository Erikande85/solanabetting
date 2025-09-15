import { useState } from 'react';
import { Side } from '../utils/types';

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  side: Side;
  claimText: string;
}

export default function BetModal({ isOpen, onClose, onSubmit, side, claimText }: BetModalProps) {
  const [amount, setAmount] = useState(0.1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (amount <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(amount);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sideColor = side === Side.A ? 'text-solana' : 'text-vs-red';
  const sideLabel = side === Side.A ? 'FOR' : 'AGAINST';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-vs-white">Place Bet</h3>
          <button
            onClick={onClose}
            className="text-vs-gray hover:text-vs-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-deep-blue/30 rounded-lg">
            <div className="text-sm text-vs-gray mb-2">Betting on:</div>
            <div className="text-sm text-vs-white line-clamp-3">{claimText}</div>
          </div>

          <div className="text-center">
            <div className="text-sm text-vs-gray mb-1">You are betting</div>
            <div className={`text-2xl font-bold ${sideColor}`}>
              {sideLabel}
            </div>
            <div className="text-xs text-vs-gray mt-1">
              {side === Side.A ? 'This claim will be TRUE' : 'This claim will be FALSE'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-vs-white mb-2">
              Bet Amount (SOL)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input-field w-full"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
            <div className="text-xs text-yellow-400">
              ⚠️ Betting is final. Funds will be escrowed until resolution.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={amount <= 0 || isSubmitting}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
                amount > 0 && !isSubmitting
                  ? side === Side.A 
                    ? 'bg-solana hover:bg-solana/80 text-vs-dark'
                    : 'bg-vs-red hover:bg-vs-red/80 text-vs-white'
                  : 'bg-vs-gray cursor-not-allowed text-vs-dark'
              }`}
            >
              {isSubmitting ? 'Placing Bet...' : `Bet ${amount} SOL`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}