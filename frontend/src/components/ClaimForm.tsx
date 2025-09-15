import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { ClaimFormData } from '../utils/types';
import { solanaClient } from '../../utils/solana';

interface ClaimFormProps {
  onSubmit?: (data: ClaimFormData) => void;
}

export default function ClaimForm({ onSubmit }: ClaimFormProps) {
  const { connected } = useWallet();
  const [formData, setFormData] = useState<ClaimFormData>({
    claimText: '',
    deadline: '',
    stake: 0.1,
    mint: 'SOL',
    category: '',
    subcategory: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clarityScore, setClarityScore] = useState<number | null>(null);

  const handleInputChange = (field: keyof ClaimFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setClarityScore(null); // Reset clarity score when text changes
  };

  const checkClarity = async () => {
    if (!formData.claimText.trim()) {
      toast.error('Please enter a claim first');
      return;
    }

    try {
      const response = await axios.post(process.env.NEXT_PUBLIC_N8N_VALIDATE || '', {
        claim_text: formData.claimText,
        deadline: formData.deadline,
      });
      
      const score = response.data.clarity_score || 85;
      setClarityScore(score);
      
      if (score >= 80) {
        toast.success(`Great clarity! Score: ${score}/100`);
      } else {
        toast.error(`Low clarity score: ${score}/100. Consider rephrasing.`);
      }
    } catch (error) {
      toast.error('Failed to check clarity');
      setClarityScore(75); // Default fallback
    }
  };

  const handleSubmit = async () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!formData.claimText.trim()) {
      toast.error('Please enter a claim');
      return;
    }

    if (!formData.deadline) {
      toast.error('Please set a deadline');
      return;
    }

    if (formData.stake <= 0) {
      toast.error('Stake must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const signature = await solanaClient.createClaim(formData);
      toast.success(`Claim created! Signature: ${signature.slice(0, 8)}...`);
      
      // Reset form
      setFormData({
        claimText: '',
        deadline: '',
        stake: 0.1,
        mint: 'SOL',
        category: '',
        subcategory: '',
      });
      setClarityScore(null);
      
      if (onSubmit) {
        onSubmit(formData);
      }
    } catch (error: any) {
      toast.error(`Failed to create claim: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-solana mb-6">Create New Claim</h2>
      
      <div className="space-y-6">
        {/* Claim Text */}
        <div>
          <label className="block text-sm font-medium text-vs-white mb-2">
            Claim Statement
          </label>
          <textarea
            className="input-field w-full h-32 resize-none"
            placeholder="e.g., BTC will be above $70,000 by December 31, 2025"
            value={formData.claimText}
            onChange={(e) => handleInputChange('claimText', e.target.value)}
          />
          <div className="flex justify-between items-center mt-2">
            <button
              onClick={checkClarity}
              className="text-sm text-solana hover:text-solana/80 transition-colors"
              disabled={!formData.claimText.trim()}
            >
              Check Clarity
            </button>
            {clarityScore !== null && (
              <div className={`text-sm font-medium ${clarityScore >= 80 ? 'text-solana' : 'text-vs-red'}`}>
                Clarity: {clarityScore}/100
              </div>
            )}
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-vs-white mb-2">
            Deadline
          </label>
          <input
            type="datetime-local"
            className="input-field w-full"
            value={formData.deadline}
            onChange={(e) => handleInputChange('deadline', e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        {/* Stake Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-vs-white mb-2">
              Stake Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input-field w-full"
              placeholder="0.1"
              value={formData.stake}
              onChange={(e) => handleInputChange('stake', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-vs-white mb-2">
              Token
            </label>
            <select
              className="input-field w-full"
              value={formData.mint}
              onChange={(e) => handleInputChange('mint', e.target.value as 'SOL' | 'USDC')}
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        {/* Category and Subcategory */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-vs-white mb-2">
              Category
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g., Crypto"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-vs-white mb-2">
              Subcategory
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g., Bitcoin"
              value={formData.subcategory}
              onChange={(e) => handleInputChange('subcategory', e.target.value)}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!connected || isSubmitting || !formData.claimText.trim()}
          className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
            connected && !isSubmitting && formData.claimText.trim()
              ? 'btn-primary hover:scale-105'
              : 'bg-vs-gray cursor-not-allowed text-vs-dark'
          }`}
        >
          {isSubmitting ? 'Creating Claim...' : 'Create Claim'}
        </button>

        {!connected && (
          <p className="text-center text-vs-gray text-sm">
            Connect your wallet to create claims
          </p>
        )}
      </div>
    </div>
  );
}